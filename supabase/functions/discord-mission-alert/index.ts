import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { ...cors, "Content-Type": "application/json" };
const staffRoles = new Set(["staff", "admin", "super_admin"]);
const directTypes = new Set(["mission_published", "mission_updated", "announcement_published"]);

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function wakeDiscordBot() {
  const wakeUrl = Deno.env.get("BOT_WAKE_URL");
  if (!wakeUrl) return;
  try {
    const response = await fetch(wakeUrl, {
      method: "GET",
      headers: { "User-Agent": "USMCF-Supabase-Queue/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    await response.body?.cancel();
  } catch (error) {
    console.warn("Kriss Kyle wake request did not complete:", error instanceof Error ? error.message : error);
  }
}

function webhookNames(event: Record<string, unknown>) {
  const type = String(event.tipo || "");
  if (type === "mission_published" || type === "mission_updated") {
    return ["DISCORD_MISSIONS_WEBHOOK_URL", "DISCORD_ANNOUNCEMENTS_WEBHOOK_URL"];
  }
  if (type !== "announcement_published") return [];
  const routes: Record<string, string> = {
    announcements: "DISCORD_ANNOUNCEMENTS_WEBHOOK_URL",
    missions: "DISCORD_MISSIONS_WEBHOOK_URL",
    training: "DISCORD_TRAINING_WEBHOOK_URL",
    points: "DISCORD_POINTS_WEBHOOK_URL",
    support: "DISCORD_SUPPORT_WEBHOOK_URL",
    access: "DISCORD_ACCESS_WEBHOOK_URL",
  };
  return [routes[String(event.target_channel_key || "announcements")] || routes.announcements];
}

function webhookPayload(event: Record<string, unknown>, profile: Record<string, unknown> | null) {
  const rawColor = Number(event.embed_color);
  return {
    username: "Kriss Kyle",
    content: null,
    allowed_mentions: { parse: [] },
    embeds: [{
      title: String(event.titulo || "USMCF").slice(0, 256),
      description: String(event.mensaje || "Actividad registrada en la plataforma.").slice(0, 4096),
      color: Number.isInteger(rawColor) ? rawColor : 0x27352b,
      fields: profile ? [
        { name: "Miembro", value: String(profile.nombre || "Marine").slice(0, 1024), inline: true },
        { name: "Rango", value: String(profile.rango || "Sin rango").slice(0, 1024), inline: true },
      ] : [],
      timestamp: String(event.created_at || new Date().toISOString()),
      footer: { text: "Plataforma USMCF · Sincronización automática" },
    }],
  };
}

async function sendWebhook(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "DiscordBot (https://github.com/JeanPieroTaczaFlores/USMF-US-MARINE-CORPS-FORCE, 1.0.0)",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Discord webhook ${response.status}: ${detail || response.statusText}`);
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  try {
    const { event_id } = await request.json();
    if (!event_id || typeof event_id !== "string") return respond({ error: "event_id is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const authorization = request.headers.get("Authorization") || "";

    const { data: event, error: eventError } = await admin.from("discord_events").select("*").eq("id", event_id).single();
    if (eventError || !event) return respond({ error: "Event not found" }, 404);

    const { data: authorProfile } = event.user_id
      ? await admin.from("profiles").select("id,nombre,rango,rol").eq("id", event.user_id).single()
      : { data: null };

    if (authorization) {
      const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
      const { data: authData, error: authError } = await caller.auth.getUser();
      if (authError || !authData.user) return respond({ error: "Unauthorized" }, 401);
      const { data: callerProfile } = await admin.from("profiles").select("rol").eq("id", authData.user.id).single();
      const isStaff = staffRoles.has(String(callerProfile?.rol || ""));
      if (event.user_id !== authData.user.id && !isStaff) return respond({ error: "Forbidden" }, 403);
    } else {
      // Temporary operator recovery is intentionally restricted to a recent,
      // high-entropy event created by an administrator. Production normally
      // keeps JWT verification enabled, making this branch unreachable.
      const eventAge = Date.now() - Date.parse(String(event.created_at || ""));
      const recent = Number.isFinite(eventAge) && eventAge >= 0 && eventAge <= 48 * 60 * 60 * 1000;
      const adminAuthored = ["admin", "super_admin"].includes(String(authorProfile?.rol || ""));
      if (!recent || !adminAuthored || !directTypes.has(String(event.tipo || ""))) {
        return respond({ error: "Unauthorized" }, 401);
      }
    }

    if (event.estado === "enviado") return respond({ delivered: true, duplicate: true });

    const secretNames = webhookNames(event);
    const webhookUrls = [...new Set(secretNames.map((name) => Deno.env.get(name)).filter((url): url is string => Boolean(url)))];
    if (directTypes.has(String(event.tipo || "")) && webhookUrls.length === secretNames.length && webhookUrls.length > 0) {
      const payload = webhookPayload(event, authorProfile);
      for (const url of webhookUrls) await sendWebhook(url, payload);
      const { error: sentError } = await admin.from("discord_events").update({
        estado: "enviado",
        sent_at: new Date().toISOString(),
        error_text: null,
        retry_count: 0,
        next_attempt_at: null,
      }).eq("id", event.id);
      if (sentError) throw sentError;
      return respond({ delivered: true, transport: "discord_webhook", destinations: webhookUrls.length });
    }

    const { error: queueError } = await admin.from("discord_events").update({
      estado: "pendiente",
      sent_at: null,
      error_text: null,
      retry_count: 0,
      next_attempt_at: null,
    }).eq("id", event.id);
    if (queueError) throw queueError;
    EdgeRuntime.waitUntil(wakeDiscordBot());
    return respond({ queued: true, transport: "bot", reason: "webhook_not_configured" });
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
