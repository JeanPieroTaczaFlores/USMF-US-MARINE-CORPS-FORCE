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

    // Kriss Kyle is the single Discord delivery worker. The old webhook path
    // could mark an event as failed before the Render bot had a chance to send
    // it, producing misleading 403 errors. Requeue here; the bot publishes it
    // with its guild permissions and records the final delivery state.
    const { error: queueError } = await admin.from("discord_events").update({ estado: "pendiente", sent_at: null, error_text: null }).eq("id", event.id);
    if (queueError) throw queueError;
    return new Response(JSON.stringify({ queued: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
