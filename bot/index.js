import http from "node:http";

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  botToken: process.env.DISCORD_BOT_TOKEN,
  guildId: process.env.DISCORD_GUILD_ID,
  missionsChannel: process.env.DISCORD_MISSIONS_CHANNEL_ID,
  trainingChannel: process.env.DISCORD_TRAINING_CHANNEL_ID,
  pointsChannel: process.env.DISCORD_POINTS_CHANNEL_ID,
  accessChannel: process.env.DISCORD_ACCESS_CHANNEL_ID,
  recruitRole: process.env.DISCORD_ROLE_RECRUIT_ID,
  soldierRole: process.env.DISCORD_ROLE_SOLDIER_ID,
  staffRole: process.env.DISCORD_ROLE_STAFF_ID,
  adminRole: process.env.DISCORD_ROLE_ADMIN_ID,
  rankRoles: parseMap(process.env.DISCORD_RANK_ROLE_MAP),
  specialtyRoles: parseMap(process.env.DISCORD_SPECIALTY_ROLE_MAP),
  pollMs: Math.max(3000, Number(process.env.BOT_POLL_INTERVAL_MS || 5000)),
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
  return response.json();
}

async function discord(path, options = {}) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...options,
    headers: { Authorization: `Bot ${config.botToken}`, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`Discord ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

function eventChannel(type) {
  if (type.startsWith("training_") || type === "specialty_approved") return config.trainingChannel;
  if (type.startsWith("points_") || type === "rank_promoted") return config.pointsChannel;
  if (type === "platform_login") return config.accessChannel || config.missionsChannel;
  return config.missionsChannel;
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
  const channelId = eventChannel(event.tipo || "");
  if (channelId) {
    await discord(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        embeds: [{
          title: event.titulo || "USMCF",
          description: event.mensaje || "Actividad registrada en la plataforma.",
          color: event.tipo === "rank_promoted" ? 0xd6b84e : event.tipo === "specialty_approved" ? 0x55765b : 0x27352b,
          fields: profile ? [{ name: "Miembro", value: profile.nombre || "Marine", inline: true }, { name: "Rango", value: profile.rango || "Sin rango", inline: true }] : [],
          timestamp: event.created_at,
          footer: { text: "Plataforma USMCF · Sincronización automática" },
        }],
      }),
    });
  }
  if (profile) await syncMemberRoles(profile);
  await supabase(`discord_events?id=eq.${event.id}`, { method: "PATCH", body: JSON.stringify({ estado: "enviado", sent_at: new Date().toISOString(), error_text: null }) });
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
    response.statusCode = missing.length ? 503 : 200;
    response.end(JSON.stringify({ online: !missing.length, missing, lastPollAt, lastError }));
    return;
  }
  response.statusCode = 200;
  response.end(JSON.stringify({ service: "USMCF Discord Bot", online: true }));
}).listen(config.port, () => {
  console.log(`[USMCF BOT] Health server listening on ${config.port}`);
  const missing = requiredConfig();
  if (missing.length) console.error(`[USMCF BOT] Missing environment: ${missing.join(", ")}`);
});

setInterval(() => poll().catch((error) => { lastError = error instanceof Error ? error.message : String(error); }), config.pollMs);
poll().catch((error) => { lastError = error instanceof Error ? error.message : String(error); });
