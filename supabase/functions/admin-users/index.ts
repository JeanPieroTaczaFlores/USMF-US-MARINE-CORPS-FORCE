import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const roles = ["usuario", "staff", "admin", "super_admin"];
const states = ["pendiente", "activo", "suspendido"];
const isOfficialEmail = (value: unknown) => /^[^@\s]+@usmcf\.com$/i.test(String(value || "").trim());

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = request.headers.get("Authorization") || "";
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(url, serviceKey);
    const { data: actor } = await admin.from("profiles").select("rol,estado").eq("id", authData.user.id).single();
    if (!actor || !["admin", "super_admin"].includes(actor.rol) || actor.estado !== "activo") return json({ error: "Administrator access required" }, 403);

    const body = await request.json();
    if (body.action === "create") {
      if (!body.email || !body.password || String(body.password).length < 8) return json({ error: "Email and an 8-character password are required" }, 400);
      if (!isOfficialEmail(body.email)) return json({ error: "Solo se aceptan correos institucionales @usmcf.com." }, 400);
      const requestedRole = roles.includes(body.rol) ? body.rol : "usuario";
      if (requestedRole === "super_admin" && actor.rol !== "super_admin") return json({ error: "Only Alto Mando can create another Alto Mando" }, 403);
      const officialEmail = String(body.email).toLowerCase().trim();
      const { data: created, error: createError } = await admin.auth.admin.createUser({ email: officialEmail, password: body.password, email_confirm: true, user_metadata: { nombre: body.nombre, usuario_roblox: body.usuario_roblox } });
      if (createError || !created.user) return json({ error: createError?.message || "User could not be created" }, 400);
      await admin.from("profiles").update({ nombre: body.nombre, usuario_roblox: body.usuario_roblox, rol: requestedRole, rango: "Recluta", estado: "pendiente" }).eq("id", created.user.id);
      const { data: event } = await admin.from("discord_events").select("id").eq("user_id", created.user.id).eq("tipo", "training_assigned").order("created_at", { ascending: false }).limit(1).single();
      return json({ user_id: created.user.id, event_id: event?.id || null });
    }

    if (body.action === "update") {
      const { data: target, error: targetError } = await admin.from("profiles").select("*").eq("id", body.user_id).single();
      if (targetError || !target) return json({ error: "User not found" }, 404);
      if ((target.rol === "super_admin" || body.rol === "super_admin") && actor.rol !== "super_admin") return json({ error: "Only Alto Mando can modify Alto Mando" }, 403);
      if (body.rol && !roles.includes(body.rol)) return json({ error: "Invalid role" }, 400);
      if (body.estado && !states.includes(body.estado)) return json({ error: "Invalid account state" }, 400);
      if (body.email && !isOfficialEmail(body.email)) return json({ error: "Solo se aceptan correos institucionales @usmcf.com." }, 400);
      if (body.email && body.email !== target.email) {
        const officialEmail = String(body.email).toLowerCase().trim();
        const { error: emailError } = await admin.auth.admin.updateUserById(target.id, { email: officialEmail, email_confirm: true });
        if (emailError) return json({ error: emailError.message }, 400);
        body.email = officialEmail;
      }
      const update = Object.fromEntries(["nombre", "usuario_roblox", "email", "rol", "estado", "rango"].filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
      const { error: updateError } = await admin.from("profiles").update(update).eq("id", target.id);
      if (updateError) return json({ error: updateError.message }, 400);
      return json({ updated: true });
    }
    if (body.action === "reset_password") {
      if (!body.user_id || String(body.password || "").length < 8) return json({ error: "User and an 8-character password are required" }, 400);
      const { data: target } = await admin.from("profiles").select("rol").eq("id", body.user_id).single();
      if (!target) return json({ error: "User not found" }, 404);
      if (target.rol === "super_admin" && actor.rol !== "super_admin") return json({ error: "Only Alto Mando can modify Alto Mando" }, 403);
      const { error: passwordError } = await admin.auth.admin.updateUserById(body.user_id, { password: String(body.password) });
      if (passwordError) return json({ error: passwordError.message }, 400);
      return json({ password_updated: true });
    }
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
