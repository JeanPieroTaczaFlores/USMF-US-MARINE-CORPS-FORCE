import http from "node:http";

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  botToken: process.env.DISCORD_BOT_TOKEN,
  guildId: process.env.DISCORD_GUILD_ID,
  botName: process.env.DISCORD_BOT_NAME || "Kriss Kyle",
  missionsChannel: process.env.DISCORD_MISSIONS_CHANNEL_ID,
  trainingChannel: process.env.DISCORD_TRAINING_CHANNEL_ID,
  pointsChannel: process.env.DISCORD_POINTS_CHANNEL_ID,
  accessChannel: process.env.DISCORD_ACCESS_CHANNEL_ID,
  announcementsChannel: process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID,
  supportChannel: process.env.DISCORD_SUPPORT_CHANNEL_ID,
  inviteChannel: process.env.DISCORD_INVITE_CHANNEL_ID,
  adminUserId: process.env.DISCORD_ADMIN_USER_ID,
  recruitRole: process.env.DISCORD_ROLE_RECRUIT_ID,
  soldierRole: process.env.DISCORD_ROLE_SOLDIER_ID,
  staffRole: process.env.DISCORD_ROLE_STAFF_ID,
  adminRole: process.env.DISCORD_ROLE_ADMIN_ID,
  rankRoles: parseMap(process.env.DISCORD_RANK_ROLE_MAP),
  specialtyRoles: parseMap(process.env.DISCORD_SPECIALTY_ROLE_MAP),
  pollMs: Math.max(3000, Number(process.env.BOT_POLL_INTERVAL_MS || 5000)),
  rosterSyncMs: Math.max(60000, Number(process.env.ROSTER_SYNC_INTERVAL_MS || 600000)),
  reminderMs: Math.max(300000, Number(process.env.REMINDER_INTERVAL_MS || 3600000)),
  inviteRefreshMs: Math.max(3600000, Number(process.env.INVITE_REFRESH_INTERVAL_MS || 3600000)),
  port: Number(process.env.PORT || 3000),
};

function parseMap(value) {
  try { return JSON.parse(value || "{}"); }
  catch { return {}; }
}

function requiredConfig() {
  return ["supabaseUrl", "serviceKey", "botToken", "guildId"].filter((key) => !config[key]);
}

async function supabase(path, options = {}) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": "application/json",
      Prefer: options.method === "PATCH" ? "return=minimal" : "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  if (response.status === 204) return null;
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

async function discord(path, options = {}) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...options,
    headers: { Authorization: `Bot ${config.botToken}`, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`Discord ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

function officialEmail(username, discordId) {
  const clean = String(username || "marine")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "") || "marine";
  return `${clean}.${String(discordId).slice(-6)}@usmcf.com`;
}

function memberAvatar(member) {
  if (member.avatar) return `https://cdn.discordapp.com/guilds/${config.guildId}/users/${member.user.id}/avatars/${member.avatar}.png?size=256`;
  if (member.user.avatar) return `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png?size=256`;
  return null;
}

let rosterSyncing = false;
let rosterLastSyncAt = null;
let rosterCount = 0;
let catalogLastSyncAt = null;

async function syncGuildCatalog() {
  if (requiredConfig().length) return;
  const syncedAt = new Date().toISOString();
  const [roles, channels] = await Promise.all([
    discord(`/guilds/${config.guildId}/roles`),
    discord(`/guilds/${config.guildId}/channels`),
  ]);
  if (roles?.length) {
    await supabase("discord_roles?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(roles.map((role) => ({
        id: role.id,
        name: role.name,
        position: Number(role.position || 0),
        permissions: String(role.permissions || "0"),
        managed: Boolean(role.managed),
        synced_at: syncedAt,
      }))),
    });
  }
  if (channels?.length) {
    await supabase("discord_channels?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: Number(channel.type),
        parent_id: channel.parent_id || null,
        position: Number(channel.position || 0),
        synced_at: syncedAt,
      }))),
    });
  }
  catalogLastSyncAt = syncedAt;
  console.log(`[USMCF BOT] Discord catalog synchronized: ${roles?.length || 0} roles, ${channels?.length || 0} channels`);
}

async function syncGuildRoster() {
  if (rosterSyncing || requiredConfig().length) return;
  rosterSyncing = true;
  const syncStartedAt = new Date().toISOString();
  let after = "0";
  let total = 0;
  try {
    const existingRoster = await supabase("faction_members?select=discord_id,institutional_email");
    const savedEmails = new Map((existingRoster || []).map((member) => [member.discord_id, member.institutional_email]));
    while (true) {
      const members = await discord(`/guilds/${config.guildId}/members?limit=1000&after=${after}`);
      const faction = (members || []).filter((member) => !member.user?.bot).map((member) => ({
        discord_id: member.user.id,
        username: member.user.username,
        display_name: member.nick || member.user.global_name || member.user.username,
        institutional_email: savedEmails.get(member.user.id) || officialEmail(member.user.username, member.user.id),
        avatar_url: memberAvatar(member),
        role_ids: member.roles || [],
        joined_at: member.joined_at || null,
        is_active: true,
        synced_at: syncStartedAt,
      }));
      if (faction.length) {
        await supabase("faction_members?on_conflict=discord_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(faction),
        });
        total += faction.length;
      }
      if (!members || members.length < 1000) break;
      after = members[members.length - 1].user.id;
    }

    await supabase(`faction_members?is_active=eq.true&synced_at=lt.${encodeURIComponent(syncStartedAt)}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: false }),
    });
    rosterCount = total;
    rosterLastSyncAt = new Date().toISOString();
    console.log(`[USMCF BOT] Discord roster synchronized: ${total} members`);
  } finally {
    rosterSyncing = false;
  }
}

function eventChannels(event) {
  const type = event.tipo || "";
  const routed = {
    announcements: config.announcementsChannel,
    missions: config.missionsChannel,
    training: config.trainingChannel,
    points: config.pointsChannel,
    support: config.supportChannel,
    access: config.accessChannel,
  };
  if (type === "announcement_published") return [routed[event.target_channel_key] || config.announcementsChannel];
  if (["mission_published", "mission_updated"].includes(type)) return [config.missionsChannel, config.announcementsChannel];
  if (type === "training_completed") return [config.trainingChannel, config.announcementsChannel];
  if (type === "rank_promoted") return [config.pointsChannel, config.announcementsChannel];
  if (type.startsWith("training_") || type === "specialty_approved") return [config.trainingChannel];
  if (type.startsWith("specialty_training_")) return [config.trainingChannel];
  if (type.startsWith("ticket_")) return [config.supportChannel || config.trainingChannel];
  if (type.startsWith("points_")) return [config.pointsChannel];
  // Access alerts must not fall back to the missions channel: that channel can
  // be restricted to operational announcements. Training is the known staff
  // fallback until a dedicated access channel is configured in Render.
  if (type === "platform_login") return [config.accessChannel || config.trainingChannel];
  return [config.missionsChannel];
}

async function syncMemberRoles(profile) {
  if (!profile?.discord_id) return { synced: false, reason: "not_linked" };
  const applications = await supabase(`specialty_applications?select=role_key&user_id=eq.${profile.id}&estado=eq.aprobada`);
  const desired = new Set();
  if (profile.estado !== "activo") {
    if (config.recruitRole) desired.add(config.recruitRole);
  } else {
    if (config.soldierRole) desired.add(config.soldierRole);
    if (profile.rol === "staff" && config.staffRole) desired.add(config.staffRole);
    if (["admin", "super_admin"].includes(profile.rol) && config.adminRole) desired.add(config.adminRole);
    if (config.rankRoles[profile.rango]) desired.add(config.rankRoles[profile.rango]);
    for (const application of applications || []) {
      if (config.specialtyRoles[application.role_key]) desired.add(config.specialtyRoles[application.role_key]);
    }
  }

  const member = await discord(`/guilds/${config.guildId}/members/${profile.discord_id}`);
  const current = new Set(member.roles || []);
  const managed = new Set([
    config.recruitRole, config.soldierRole, config.staffRole, config.adminRole,
    ...Object.values(config.rankRoles), ...Object.values(config.specialtyRoles),
  ].filter(Boolean));
  for (const roleId of managed) {
    const shouldHave = desired.has(roleId);
    if (current.has(roleId) === shouldHave) continue;
    await discord(`/guilds/${config.guildId}/members/${profile.discord_id}/roles/${roleId}`, { method: shouldHave ? "PUT" : "DELETE" });
  }
  return { synced: true };
}

async function processEvent(event) {
  const profiles = event.user_id ? await supabase(`profiles?select=id,nombre,discord_id,rol,estado,rango,puntos&id=eq.${event.user_id}`) : [];
  const profile = profiles?.[0];
  const channelIds = [...new Set(eventChannels(event).filter(Boolean))];
  for (const channelId of channelIds) {
    try {
      await discord(`/channels/${channelId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          allowed_mentions: { parse: [] },
          embeds: [{
            title: event.titulo || "USMCF",
            description: event.mensaje || "Actividad registrada en la plataforma.",
            color: Number.isInteger(event.embed_color) ? event.embed_color : event.tipo === "rank_promoted" ? 0xd6b84e : event.tipo === "specialty_approved" ? 0x55765b : 0x27352b,
            fields: profile ? [{ name: "Miembro", value: profile.nombre || "Marine", inline: true }, { name: "Rango", value: profile.rango || "Sin rango", inline: true }] : [],
            timestamp: event.created_at,
            footer: { text: "Plataforma USMCF · Sincronización automática" },
          }],
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Canal Discord ${channelId}: ${message}`);
    }
  }
  if (profile) await syncMemberRoles(profile);
  await supabase(`discord_events?id=eq.${event.id}`, { method: "PATCH", body: JSON.stringify({ estado: "enviado", sent_at: new Date().toISOString(), error_text: null }) });
}

let inviteRefreshing = false;

async function refreshDiscordInvite() {
  if (!config.inviteChannel || requiredConfig().length) return;
  if (inviteRefreshing) return;
  inviteRefreshing = true;
  try {
    const latest = await supabase("discord_invites?select=created_at,expires_at&order=created_at.desc&limit=1");
    const previous = latest?.[0];
    const now = Date.now();
    if (previous && now - Date.parse(previous.created_at) < 23 * 3600000 && Date.parse(previous.expires_at) - now > 86400000) return;
    const invite = await discord(`/channels/${config.inviteChannel}/invites`, {
      method: "POST",
      body: JSON.stringify({ max_age: 604800, max_uses: 0, temporary: false, unique: true }),
    });
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 604800000);
    await supabase("discord_invites", {
      method: "POST",
      body: JSON.stringify({ invite_url: `https://discord.gg/${invite.code}`, invite_code: invite.code, expires_at: expiresAt.toISOString(), created_at: createdAt.toISOString() }),
    });
    console.log(`[USMCF BOT] Discord invite refreshed; expires ${expiresAt.toISOString()}`);
  } finally {
    inviteRefreshing = false;
  }
}

async function remindDelayedWork() {
  if (requiredConfig().length) return;
  const cutoff = new Date(Date.now() - 3 * 86400000).toISOString();
  const [tickets, courses] = await Promise.all([
    supabase(`support_tickets?select=*&estado=in.(abierto,en_revision)&created_at=lt.${encodeURIComponent(cutoff)}&or=(reminded_at.is.null,reminded_at.lt.${encodeURIComponent(cutoff)})`),
    supabase(`specialty_training_requests?select=*&estado=in.(pendiente,en_curso)&created_at=lt.${encodeURIComponent(cutoff)}&or=(reminded_at.is.null,reminded_at.lt.${encodeURIComponent(cutoff)})`),
  ]);
  for (const ticket of tickets || []) {
    if (config.supportChannel) await discord(`/channels/${config.supportChannel}/messages`, { method: "POST", body: JSON.stringify({ allowed_mentions: { parse: [] }, embeds: [{ title: "Ticket pendiente por más de 3 días", description: ticket.asunto, color: 0xb85f3c, timestamp: new Date().toISOString() }] }) });
    await supabase(`support_tickets?id=eq.${ticket.id}`, { method: "PATCH", body: JSON.stringify({ reminded_at: new Date().toISOString() }) });
  }
  for (const course of courses || []) {
    if (config.trainingChannel) await discord(`/channels/${config.trainingChannel}/messages`, { method: "POST", body: JSON.stringify({ allowed_mentions: { parse: [] }, embeds: [{ title: "Entrenamiento pendiente por más de 3 días", description: `Curso solicitado: ${course.specialty_key}`, color: 0xb85f3c, timestamp: new Date().toISOString() }] }) });
    await supabase(`specialty_training_requests?id=eq.${course.id}`, { method: "PATCH", body: JSON.stringify({ reminded_at: new Date().toISOString() }) });
  }
}

const activeVoiceSessions = new Map();
let gatewaySocket = null;
let gatewayHeartbeat = null;
let gatewayReconnect = null;
let gatewaySequence = null;
let gatewayConnected = false;

function durationText(seconds) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return `${hours ? `${hours} h ` : ""}${minutes} min ${remainder} s`;
}

async function resolveAdminDiscordId() {
  if (config.adminUserId) return config.adminUserId;
  const profiles = await supabase("profiles?select=discord_id&rol=in.(super_admin,admin)&discord_id=not.is.null&limit=1");
  return profiles?.[0]?.discord_id || null;
}

async function sendAdminDm(embed) {
  const adminId = await resolveAdminDiscordId();
  if (!adminId) return;
  const channel = await discord("/users/@me/channels", { method: "POST", body: JSON.stringify({ recipient_id: adminId }) });
  await discord(`/channels/${channel.id}/messages`, {
    method: "POST",
    body: JSON.stringify({ allowed_mentions: { parse: [] }, embeds: [embed] }),
  });
}

async function missionForVoiceChannel(channelId) {
  if (!channelId) return null;
  const rows = await supabase(`missions?select=id,titulo,voice_channel_id,voice_channel_name,estado&voice_channel_id=eq.${channelId}&estado=in.(programada,activa)&order=fecha.asc&limit=1`);
  return rows?.[0] || null;
}

async function profileForDiscord(discordId) {
  const rows = await supabase(`profiles?select=id,nombre,callsign,usuario_roblox,discord_id&discord_id=eq.${discordId}&limit=1`);
  return rows?.[0] || null;
}

async function closeVoiceSession(discordId, channelId) {
  let active = activeVoiceSessions.get(discordId);
  if (!active) {
    const rows = await supabase(`voice_sessions?select=*&discord_id=eq.${discordId}&left_at=is.null&order=joined_at.desc&limit=1`);
    active = rows?.[0];
  }
  if (!active || (channelId && String(active.channel_id) !== String(channelId))) return;
  const leftAt = new Date();
  const durationSeconds = Math.max(0, Math.round((leftAt - new Date(active.joined_at)) / 1000));
  await supabase(`voice_sessions?id=eq.${active.id}`, { method: "PATCH", body: JSON.stringify({ left_at: leftAt.toISOString(), duration_seconds: durationSeconds, notified_at: leftAt.toISOString() }) });
  activeVoiceSessions.delete(discordId);
  const profile = await profileForDiscord(discordId);
  await sendAdminDm({
    title: "Salida del canal de voz",
    description: `${profile?.callsign || profile?.nombre || active.display_name || discordId} salió de **${active.channel_name || "voz de misión"}**.`,
    color: 0xb85f3c,
    fields: [{ name: "Misión", value: active.mission_title || "Misión asignada", inline: true }, { name: "Tiempo conectado", value: durationText(durationSeconds), inline: true }],
    timestamp: leftAt.toISOString(), footer: { text: `${config.botName} · Registro de voz USMCF` },
  }).catch((error) => console.error(`[USMCF BOT] Admin DM failed: ${error.message}`));
}

async function openVoiceSession(state, mission) {
  const discordId = state.user_id;
  const profile = await profileForDiscord(discordId);
  const displayName = state.member?.nick || state.member?.user?.global_name || state.member?.user?.username || discordId;
  const joinedAt = new Date().toISOString();
  const rows = await supabase("voice_sessions", {
    method: "POST",
    body: JSON.stringify({ discord_id: discordId, profile_id: profile?.id || null, mission_id: mission.id, channel_id: state.channel_id, channel_name: mission.voice_channel_name || state.channel_id, joined_at: joinedAt, notified_at: joinedAt }),
  });
  const saved = { ...(rows?.[0] || {}), display_name: displayName, mission_title: mission.titulo };
  activeVoiceSessions.set(discordId, saved);
  await sendAdminDm({
    title: "Ingreso al canal de voz",
    description: `${profile?.callsign || profile?.nombre || displayName} entró a **${mission.voice_channel_name || "voz de misión"}**.`,
    color: 0x34777f,
    fields: [{ name: "Misión", value: mission.titulo, inline: true }, { name: "Estado web", value: profile ? "Cuenta vinculada" : "Discord sin vincular", inline: true }],
    timestamp: joinedAt, footer: { text: `${config.botName} · Registro de voz USMCF` },
  }).catch((error) => console.error(`[USMCF BOT] Admin DM failed: ${error.message}`));
}

async function handleVoiceState(state) {
  if (state.guild_id !== config.guildId || state.member?.user?.bot) return;
  const current = activeVoiceSessions.get(state.user_id);
  if (current && String(current.channel_id) !== String(state.channel_id || "")) await closeVoiceSession(state.user_id, current.channel_id);
  if (!state.channel_id || (current && String(current.channel_id) === String(state.channel_id))) return;
  const mission = await missionForVoiceChannel(state.channel_id);
  if (mission) await openVoiceSession(state, mission);
}

async function restoreOpenVoiceSessions() {
  const rows = await supabase("voice_sessions?select=*&left_at=is.null&order=joined_at.asc");
  for (const row of rows || []) activeVoiceSessions.set(row.discord_id, row);
}

function scheduleGatewayReconnect() {
  gatewayConnected = false;
  if (gatewayHeartbeat) clearInterval(gatewayHeartbeat);
  if (gatewayReconnect || requiredConfig().length) return;
  gatewayReconnect = setTimeout(() => { gatewayReconnect = null; connectGateway(); }, 5000);
}

function connectGateway() {
  if (requiredConfig().length || gatewaySocket) return;
  const socket = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");
  gatewaySocket = socket;
  socket.addEventListener("message", async (message) => {
    try {
      const packet = JSON.parse(String(message.data));
      if (packet.s !== null && packet.s !== undefined) gatewaySequence = packet.s;
      if (packet.op === 10) {
        gatewayHeartbeat = setInterval(() => socket.send(JSON.stringify({ op: 1, d: gatewaySequence })), packet.d.heartbeat_interval);
        socket.send(JSON.stringify({ op: 2, d: { token: config.botToken, intents: 129, properties: { os: "linux", browser: config.botName, device: config.botName } } }));
      } else if (packet.op === 7 || packet.op === 9) {
        socket.close();
      } else if (packet.op === 0 && packet.t === "READY") {
        gatewayConnected = true;
        await restoreOpenVoiceSessions();
        await discord(`/guilds/${config.guildId}/members/@me`, { method: "PATCH", body: JSON.stringify({ nick: config.botName }) }).catch((error) => console.error(`[USMCF BOT] Nickname update failed: ${error.message}`));
        console.log(`[USMCF BOT] ${config.botName} connected to Discord Gateway`);
      } else if (packet.op === 0 && packet.t === "VOICE_STATE_UPDATE") {
        await handleVoiceState(packet.d);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`[USMCF BOT] Gateway event failed: ${lastError}`);
    }
  });
  socket.addEventListener("close", () => { gatewaySocket = null; scheduleGatewayReconnect(); });
  socket.addEventListener("error", () => socket.close());
}

let polling = false;
let lastPollAt = null;
let lastError = null;

async function poll() {
  if (polling || requiredConfig().length) return;
  polling = true;
  try {
    const events = await supabase("discord_events?select=*&estado=eq.pendiente&order=created_at.asc&limit=20");
    for (const event of events || []) {
      try { await processEvent(event); }
      catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        await supabase(`discord_events?id=eq.${event.id}`, { method: "PATCH", body: JSON.stringify({ estado: "error", error_text: lastError }) }).catch(() => null);
      }
    }
    lastPollAt = new Date().toISOString();
  } finally { polling = false; }
}

http.createServer((request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.url === "/health") {
    const missing = requiredConfig();
    const online = missing.length === 0 && gatewayConnected && lastPollAt !== null;
    response.statusCode = online ? 200 : 503;
    response.end(JSON.stringify({ online, missing, gatewayConnected, activeVoiceSessions: activeVoiceSessions.size, lastPollAt, lastError, rosterLastSyncAt, rosterCount, catalogLastSyncAt }));
    return;
  }
  response.statusCode = 200;
  response.end(JSON.stringify({ service: config.botName, online: requiredConfig().length === 0 && gatewayConnected && lastPollAt !== null }));
}).listen(config.port, () => {
  console.log(`[USMCF BOT] Health server listening on ${config.port}`);
  const missing = requiredConfig();
  if (missing.length) console.error(`[USMCF BOT] Missing environment: ${missing.join(", ")}`);
});

setInterval(() => poll().catch((error) => { lastError = error instanceof Error ? error.message : String(error); }), config.pollMs);
setInterval(() => syncGuildRoster().catch((error) => { lastError = error instanceof Error ? error.message : String(error); }), config.rosterSyncMs);
setInterval(() => syncGuildCatalog().catch((error) => { lastError = error instanceof Error ? error.message : String(error); }), config.rosterSyncMs);
setInterval(() => remindDelayedWork().catch((error) => { lastError = error instanceof Error ? error.message : String(error); }), config.reminderMs);
setInterval(() => refreshDiscordInvite().catch((error) => { lastError = error instanceof Error ? error.message : String(error); }), config.inviteRefreshMs);
poll().catch((error) => { lastError = error instanceof Error ? error.message : String(error); });
syncGuildRoster().catch((error) => { lastError = error instanceof Error ? error.message : String(error); });
syncGuildCatalog().catch((error) => { lastError = error instanceof Error ? error.message : String(error); });
remindDelayedWork().catch((error) => { lastError = error instanceof Error ? error.message : String(error); });
refreshDiscordInvite().catch((error) => { lastError = error instanceof Error ? error.message : String(error); });
connectGateway();
