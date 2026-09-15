import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authorization = request.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { event_id } = await request.json();
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: event, error: eventError } = await admin.from("discord_events").select("*").eq("id", event_id).single();
    if (eventError || !event) return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    const { data: callerProfile } = await admin.from("profiles").select("rol").eq("id", authData.user.id).single();
    const staff = ["staff", "admin", "super_admin"].includes(callerProfile?.rol || "");
    if (event.user_id !== authData.user.id && !staff) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    if (event.estado === "enviado") return new Response(JSON.stringify({ delivered: true, duplicate: true }), { headers: { ...cors, "Content-Type": "application/json" } });

    const announcements = Deno.env.get("DISCORD_ANNOUNCEMENTS_WEBHOOK_URL");
    const webhookUrls = event.tipo === "announcement_published"
      ? [announcements]
      : event.tipo === "training_completed"
        ? [Deno.env.get("DISCORD_TRAINING_WEBHOOK_URL"), announcements]
        : event.tipo === "rank_promoted"
          ? [Deno.env.get("DISCORD_POINTS_WEBHOOK_URL"), announcements]
          : event.tipo.startsWith("training_") || event.tipo === "specialty_approved"
            ? [Deno.env.get("DISCORD_TRAINING_WEBHOOK_URL")]
            : event.tipo.startsWith("points_")
              ? [Deno.env.get("DISCORD_POINTS_WEBHOOK_URL")]
              : event.tipo === "platform_login"
                ? [Deno.env.get("DISCORD_ACCESS_WEBHOOK_URL") || Deno.env.get("DISCORD_MISSIONS_WEBHOOK_URL")]
                : [Deno.env.get("DISCORD_MISSIONS_WEBHOOK_URL")];
    const targets = [...new Set(webhookUrls.filter(Boolean))] as string[];
    if (!targets.length) throw new Error(`Discord webhook is not configured for ${event.tipo}`);

    for (const webhookUrl of targets) {
      const discordResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "USMCF Command Bot",
          allowed_mentions: { parse: [] },
          embeds: [{ title: event.titulo, description: event.mensaje, color: 0xd9a441, footer: { text: `Evento ${event.id}` }, timestamp: event.created_at }]
        })
      });
      if (!discordResponse.ok) throw new Error(`Discord returned ${discordResponse.status}`);
    }
    await admin.from("discord_events").update({ estado: "enviado", sent_at: new Date().toISOString(), error_text: null }).eq("id", event.id);
    return new Response(JSON.stringify({ delivered: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
