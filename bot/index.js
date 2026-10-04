import http from "node:http";

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  botToken: process.env.DISCORD_BOT_TOKEN,
  guildId: process.env.DISCORD_GUILD_ID,
  botName: process.env.DISCORD_BOT_NAME || "Kriss Kyle",
  missionsChannel: process.env.DISCORD_MISSIONS_CHANNEL_ID,
  missionReportsChannel: process.env.DISCORD_MISSION_REPORTS_CHANNEL_ID,
  trainingChannel: process.env.DISCORD_TRAINING_CHANNEL_ID,
  pointsChannel: process.env.DISCORD_POINTS_CHANNEL_ID,
  accessChannel: process.env.DISCORD_ACCESS_CHANNEL_ID,
  announcementsChannel: process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID,
  logdChannel: process.env.DISCORD_LOGD_CHANNEL_ID || "1212399037827911680",
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
  maxDeliveryRetries: Math.max(1, Number(process.env.BOT_MAX_DELIVERY_RETRIES || 5)),
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

function deliveryNonce(eventId, channelId) {
  let hash = 1469598103934665603n;
  for (const char of `${eventId}:${channelId}`) {
    hash ^= BigInt(char.codePointAt(0));
    hash = BigInt.asUintN(63, hash * 1099511628211n);
  }
  return hash.toString();
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
let logdLastSyncAt = null;
let logdMessageCount = 0;
let botUserId = null;
let discoveredSpecialtyRoles = {};

const specialtyRoleNames = {
  raider: ["MARSOC MARINE RAIDERS", "MARINE RAIDER", "RAIDER"],
  combat_grenadier: ["GRANADERO DE COMBATE", "COMBAT GRENADIER", "GRENADIER"],
  radio: ["OPERADOR DE RADIO"],
  medico: ["MEDICO DE COMBATE", "MEDICO"],
  tirador_ligero: ["DMR SNIPER LIGERO", "TIRADOR DESIGNADO LIGERO"],
  tirador_pesado: ["TIRADOR DESIGNADO", "TIRADOR DESIGNADO PESADO"],
  machine_gunner: ["MACHINNE GUNNER", "MACHINE GUNNER"],
  combat_engineer: ["COMBAT ENGINEER", "INGENIERO DE COMBATE"],
  artillero_vehiculo_aereo: ["ARTILLERO DE VEHICULO AEREO", "ARTILLERO"],
  artillero_vehiculo_terrestre: ["ARTILLERO DE VEHICULO TERRESTRE", "ARTILLERO"],
  licencia_vehiculo_pesado: ["LICENCIA VEHICULO PESADO", "CONDUCTOR"],
  licencia_vehiculo_ligero: ["LICENCIA VEHICULO LIGERO", "CONDUCTOR"],
};

function normalizedRoleName(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

async function syncGuildCatalog() {
  if (requiredConfig().length) return;
  const syncedAt = new Date().toISOString();
  const [roles, channels] = await Promise.all([
    discord(`/guilds/${config.guildId}/roles`),
    discord(`/guilds/${config.guildId}/channels`),
  ]);
  if (roles?.length) {
    const byName = new Map(roles.map((role) => [normalizedRoleName(role.name), String(role.id)]));
    discoveredSpecialtyRoles = Object.fromEntries(Object.entries(specialtyRoleNames)
      .map(([key, names]) => [key, names.map((name) => byName.get(name)).find(Boolean)])
      .filter((entry) => Boolean(entry[1])));
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

async function syncLogdMessages() {
  if (requiredConfig().length) return;
  const channels = await discord(`/guilds/${config.guildId}/channels`);
  const logd = (channels || []).find((channel) => String(channel.id) === String(config.logdChannel))
    || (channels || []).find((channel) => {
    if (![0, 5].includes(Number(channel.type))) return false;
    return normalizedChannelName(channel.name).includes("logd");
  });
  if (!logd) throw new Error("Discord channel #logd was not found");

  const messages = [];
  let before = null;
  for (let page = 0; page < 20; page += 1) {
    const batch = await discord(`/channels/${logd.id}/messages?limit=100${before ? `&before=${before}` : ""}`);
    if (!batch?.length) break;
    messages.push(...batch);
    if (batch.length < 100) break;
    before = batch[batch.length - 1].id;
  }

  const syncedAt = new Date().toISOString();
  for (let offset = 0; offset < messages.length; offset += 200) {
    const batch = messages.slice(offset, offset + 200).map((message) => ({
      id: message.id,
      channel_id: logd.id,
      author_id: message.author?.id || null,
      author_name: message.author?.global_name || message.author?.username || null,
      content: String(message.content || "").slice(0, 10000),
      embeds: message.embeds || [],
      attachments: (message.attachments || []).map((attachment) => ({ id: attachment.id, filename: attachment.filename, content_type: attachment.content_type, url: attachment.url })),
      message_created_at: message.timestamp,
      synced_at: syncedAt,
    }));
    if (batch.length) {
      await supabase("discord_logd_messages?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(batch),
      });
    }
  }
  logdLastSyncAt = syncedAt;
  logdMessageCount = messages.length;
  console.log(`[USMCF BOT] Discord #logd synchronized: ${messages.length} messages`);
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

let resolvedSupportChannel = config.supportChannel || null;
let supportChannelPromise = null;
let resolvedMissionReportsChannel = config.missionReportsChannel || null;
let missionReportsChannelPromise = null;

function normalizedChannelName(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function ensureSupportChannel() {
  if (resolvedSupportChannel) return resolvedSupportChannel;
  if (supportChannelPromise) return supportChannelPromise;
  supportChannelPromise = (async () => {
    const channels = await discord(`/guilds/${config.guildId}/channels`);
    const preferred = ["tickets-web", "tickets", "ticket", "soporte", "support", "ayuda"];
    const existing = (channels || []).find((channel) => [0, 5].includes(Number(channel.type)) && preferred.includes(normalizedChannelName(channel.name)));
    if (existing) return existing.id;
    const category = (channels || []).find((channel) => Number(channel.type) === 4 && preferred.some((name) => normalizedChannelName(channel.name).includes(name)));
    const created = await discord(`/guilds/${config.guildId}/channels`, {
      method: "POST",
      body: JSON.stringify({ name: "tickets-web", type: 0, parent_id: category?.id || null, topic: "Tickets y reportes enviados desde la Plataforma USMCF" }),
    });
    console.log(`[USMCF BOT] Support channel created: #${created.name} (${created.id})`);
    return created.id;
  })();
  try {
    resolvedSupportChannel = await supportChannelPromise;
    return resolvedSupportChannel;
  } finally {
    supportChannelPromise = null;
  }
}

async function ensureMissionReportsChannel() {
  if (resolvedMissionReportsChannel) return resolvedMissionReportsChannel;
  if (missionReportsChannelPromise) return missionReportsChannelPromise;
  missionReportsChannelPromise = (async () => {
    const channels = await discord(`/guilds/${config.guildId}/channels`);
    const textChannels = (channels || []).filter((channel) => [0, 5].includes(Number(channel.type)));
    const preferred = ["reporte-mision", "reporte-misiones", "reportes-mision", "reportes-de-mision", "reporte-de-mision"];
    const exact = textChannels.find((channel) => preferred.includes(normalizedChannelName(channel.name)));
    const fuzzy = textChannels.find((channel) => {
      const name = normalizedChannelName(channel.name);
      return name.includes("reporte") && name.includes("mision");
    });
    const selected = exact || fuzzy;
    if (selected) {
      console.log(`[USMCF BOT] Mission reports routed to #${selected.name} (${selected.id})`);
      return selected.id;
    }
    console.warn("[USMCF BOT] Mission report channel not found; falling back to the missions channel");
    return config.missionsChannel;
  })();
  try {
    resolvedMissionReportsChannel = await missionReportsChannelPromise;
    return resolvedMissionReportsChannel;
  } finally {
    missionReportsChannelPromise = null;
  }
}

async function eventChannels(event) {
  const type = event.tipo || "";
  const routed = {
    announcements: config.announcementsChannel,
    missions: config.missionsChannel,
    mission_reports: config.missionReportsChannel || config.missionsChannel,
    training: config.trainingChannel,
    points: config.pointsChannel,
    logd: config.logdChannel,
    support: config.supportChannel,
    access: config.accessChannel,
  };
  if (type === "announcement_published") {
    if (event.target_channel_key === "mission_reports") return [await ensureMissionReportsChannel()];
    return [routed[event.target_channel_key] || config.announcementsChannel];
  }
  if (["mission_published", "mission_updated"].includes(type)) return [config.missionsChannel, config.announcementsChannel];
  if (type === "training_completed") return [config.logdChannel];
  if (type === "rank_promoted") return [config.logdChannel];
  if (type.startsWith("training_") || type === "specialty_approved") return [config.logdChannel];
  if (type.startsWith("specialty_training_")) return [config.logdChannel];
  if (type.startsWith("ticket_")) return [await ensureSupportChannel()];
  if (type.startsWith("points_")) return [config.logdChannel];
  if (["mission_join", "mission_started", "mission_attendance_reviewed", "mission_finished"].includes(type)) return [config.logdChannel];
  // Platform access is an audit event and belongs only in #logd.
  if (type === "platform_login") return [config.logdChannel];
  return [config.missionsChannel];
}

function bogotaDay(value) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const read = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

async function shouldMentionEveryone(event) {
  if (event.tipo !== "mission_published" || !event.mission_id || !config.announcementsChannel) return false;
  const missions = await supabase(`missions?select=fecha&id=eq.${event.mission_id}&limit=1`);
  return Boolean(missions?.[0]?.fecha) && bogotaDay(missions[0].fecha) === bogotaDay(new Date());
}

async function syncMemberRoles(profile) {
  if (!profile?.discord_id) return { synced: false, reason: "not_linked" };
  const applications = await supabase(`specialty_applications?select=role_key&user_id=eq.${profile.id}&estado=eq.aprobada`);
  const specialtyRoles = { ...discoveredSpecialtyRoles, ...config.specialtyRoles };
  const desired = new Set();
  if (profile.estado !== "activo") {
    if (config.recruitRole) desired.add(config.recruitRole);
  } else {
    if (config.soldierRole) desired.add(config.soldierRole);
    if (profile.rol === "staff" && config.staffRole) desired.add(config.staffRole);
    if (["admin", "super_admin"].includes(profile.rol) && config.adminRole) desired.add(config.adminRole);
    if (config.rankRoles[profile.rango]) desired.add(config.rankRoles[profile.rango]);
    for (const application of applications || []) {
      if (specialtyRoles[application.role_key]) desired.add(specialtyRoles[application.role_key]);
    }
  }

  const member = await discord(`/guilds/${config.guildId}/members/${profile.discord_id}`);
  const current = new Set(member.roles || []);
  const managed = new Set([
    config.recruitRole, config.soldierRole, config.staffRole, config.adminRole,
    ...Object.values(config.rankRoles), ...Object.values(specialtyRoles),
  ].filter(Boolean));
  for (const roleId of managed) {
    const shouldHave = desired.has(roleId);
    if (current.has(roleId) === shouldHave) continue;
    await discord(`/guilds/${config.guildId}/members/${profile.discord_id}/roles/${roleId}`, { method: shouldHave ? "PUT" : "DELETE" });
  }
  return { synced: true };
}

async function deleteSpecialtyRequestMessages(event, profile) {
  if (!config.logdChannel || !profile) return;
  if (!botUserId) botUserId = String((await discord("/users/@me")).id);
  const course = String(event.mensaje || "").match(/curso\s+([a-z0-9_]+)/i)?.[1] || String(event.mensaje || "").trim();
  if (!course) return;
  const messages = await discord(`/channels/${config.logdChannel}/messages?limit=100`);
  const identityTokens = [profile.nombre, profile.callsign].filter(Boolean).map((value) => String(value).toLowerCase());
  for (const message of messages || []) {
    if (String(message.author?.id) !== botUserId) continue;
    const embed = message.embeds?.[0];
    const title = String(embed?.title || "").toLowerCase();
    const description = String(embed?.description || "").toLowerCase();
    if (title !== "nuevo entrenamiento solicitado" || !description.includes(course.toLowerCase())) continue;
    if (identityTokens.length && !identityTokens.some((token) => description.includes(token))) continue;
    await discord(`/channels/${config.logdChannel}/messages/${message.id}`, { method: "DELETE" });
  }
}

async function deleteMisroutedPlatformLoginMessages() {
  if (!config.trainingChannel || requiredConfig().length) return;
  if (!botUserId) botUserId = String((await discord("/users/@me")).id);
  let before = null;
  let deleted = 0;
  for (let page = 0; page < 5; page += 1) {
    const messages = await discord(`/channels/${config.trainingChannel}/messages?limit=100${before ? `&before=${before}` : ""}`);
    if (!messages?.length) break;
    for (const message of messages) {
      if (String(message.author?.id) !== botUserId) continue;
      const title = String(message.embeds?.[0]?.title || "").trim().toLowerCase();
      if (title !== "ingreso a la plataforma") continue;
      await discord(`/channels/${config.trainingChannel}/messages/${message.id}`, { method: "DELETE" });
      deleted += 1;
    }
    if (messages.length < 100) break;
    before = messages[messages.length - 1].id;
  }
  console.log(`[USMCF BOT] Removed ${deleted} misrouted platform-login messages from the training channel`);
}

async function processEvent(event) {
  const profiles = event.user_id ? await supabase(`profiles?select=id,nombre,callsign,discord_id,rol,estado,rango,puntos&id=eq.${event.user_id}`) : [];
  const profile = profiles?.[0];
  if (["specialty_training_cleanup", "specialty_approved"].includes(event.tipo)) {
    await deleteSpecialtyRequestMessages(event, profile);
    if (event.tipo === "specialty_training_cleanup") {
      await supabase(`discord_events?id=eq.${event.id}`, { method: "PATCH", body: JSON.stringify({ estado: "enviado", sent_at: new Date().toISOString(), error_text: null, retry_count: 0, next_attempt_at: null }) });
      return;
    }
  }
  const channelIds = [...new Set((await eventChannels(event)).filter(Boolean))];
  const mentionEveryone = await shouldMentionEveryone(event);
  for (const channelId of channelIds) {
    try {
      const pingThisChannel = mentionEveryone && String(channelId) === String(config.announcementsChannel);
      await discord(`/channels/${channelId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: pingThisChannel ? "@everyone" : undefined,
          allowed_mentions: { parse: pingThisChannel ? ["everyone"] : [] },
          nonce: deliveryNonce(event.id, channelId),
          enforce_nonce: true,
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
  await supabase(`discord_events?id=eq.${event.id}`, { method: "PATCH", body: JSON.stringify({ estado: "enviado", sent_at: new Date().toISOString(), error_text: null, retry_count: 0, next_attempt_at: null }) });
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

async function sendMissionReport(embed) {
  const channelId = await ensureMissionReportsChannel();
  if (!channelId) return;
  await discord(`/channels/${channelId}/messages`, {
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
  const report = {
    title: "Salida del canal de voz",
    description: `${profile?.callsign || profile?.nombre || active.display_name || discordId} salió de **${active.channel_name || "voz de misión"}**.`,
    color: 0xb85f3c,
    fields: [{ name: "Misión", value: active.mission_title || "Misión asignada", inline: true }, { name: "Tiempo conectado", value: durationText(durationSeconds), inline: true }],
    timestamp: leftAt.toISOString(), footer: { text: `${config.botName} · Registro de voz USMCF` },
  };
  await Promise.allSettled([sendAdminDm(report), sendMissionReport(report)]).then((results) => {
    results.filter((result) => result.status === "rejected").forEach((result) => console.error(`[USMCF BOT] Voice exit notice failed: ${result.reason?.message || result.reason}`));
  });
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
  const report = {
    title: "Ingreso al canal de voz",
    description: `${profile?.callsign || profile?.nombre || displayName} entró a **${mission.voice_channel_name || "voz de misión"}**.`,
    color: 0x34777f,
    fields: [{ name: "Misión", value: mission.titulo, inline: true }, { name: "Estado web", value: profile ? "Cuenta vinculada" : "Discord sin vincular", inline: true }],
    timestamp: joinedAt, footer: { text: `${config.botName} · Registro de voz USMCF` },
  };
  await Promise.allSettled([sendAdminDm(report), sendMissionReport(report)]).then((results) => {
    results.filter((result) => result.status === "rejected").forEach((result) => console.error(`[USMCF BOT] Voice join notice failed: ${result.reason?.message || result.reason}`));
  });
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

function retryDelayMs(attempt) {
  return [30000, 120000, 600000, 1800000, 7200000][Math.min(Math.max(1, attempt), 5) - 1];
}

async function queuedEvents() {
  const pending = await supabase("discord_events?select=*&estado=eq.pendiente&order=created_at.asc&limit=20");
  try {
    const now = encodeURIComponent(new Date().toISOString());
    const retryable = await supabase(`discord_events?select=*&estado=eq.error&retry_count=lt.${config.maxDeliveryRetries}&next_attempt_at=lte.${now}&order=next_attempt_at.asc&limit=10`);
    const byId = new Map([...(pending || []), ...(retryable || [])].map((event) => [event.id, event]));
    return [...byId.values()].sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at));
  } catch (error) {
    if (!String(error?.message || error).includes("retry_count") && !String(error?.message || error).includes("next_attempt_at")) throw error;
    return pending || [];
  }
}

async function poll() {
  if (polling || requiredConfig().length) return;
  polling = true;
  try {
    const events = await queuedEvents();
    for (const event of events || []) {
      try { await processEvent(event); }
      catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        const attempt = Number(event.retry_count || 0) + 1;
        const nextAttempt = new Date(Date.now() + retryDelayMs(attempt)).toISOString();
        await supabase(`discord_events?id=eq.${event.id}`, { method: "PATCH", body: JSON.stringify({ estado: "error", error_text: lastError, retry_count: attempt, next_attempt_at: nextAttempt }) }).catch(() => null);
        console.error(`[USMCF BOT] Discord event ${event.id} failed (attempt ${attempt}/${config.maxDeliveryRetries}); next retry ${nextAttempt}: ${lastError}`);
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
    response.end(JSON.stringify({ online, missing, gatewayConnected, activeVoiceSessions: activeVoiceSessions.size, lastPollAt, lastError, rosterLastSyncAt, rosterCount, catalogLastSyncAt, logdLastSyncAt, logdMessageCount }));
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
setInterval(() => syncLogdMessages().catch((error) => { lastError = error instanceof Error ? error.message : String(error); }), config.rosterSyncMs);
setInterval(() => remindDelayedWork().catch((error) => { lastError = error instanceof Error ? error.message : String(error); }), config.reminderMs);
setInterval(() => refreshDiscordInvite().catch((error) => { lastError = error instanceof Error ? error.message : String(error); }), config.inviteRefreshMs);
poll().catch((error) => { lastError = error instanceof Error ? error.message : String(error); });
syncGuildRoster().catch((error) => { lastError = error instanceof Error ? error.message : String(error); });
syncGuildCatalog().catch((error) => { lastError = error instanceof Error ? error.message : String(error); });
syncLogdMessages().catch((error) => { lastError = error instanceof Error ? error.message : String(error); });
remindDelayedWork().catch((error) => { lastError = error instanceof Error ? error.message : String(error); });
refreshDiscordInvite().catch((error) => { lastError = error instanceof Error ? error.message : String(error); });
ensureSupportChannel().catch((error) => { lastError = error instanceof Error ? error.message : String(error); console.error(`[USMCF BOT] Support channel setup failed: ${lastError}`); });
connectGateway();
deleteMisroutedPlatformLoginMessages().catch((error) => {
  lastError = error instanceof Error ? error.message : String(error);
  console.error(`[USMCF BOT] Misrouted login cleanup failed: ${lastError}`);
});
