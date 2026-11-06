import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const roles = ["usuario", "staff", "admin", "super_admin"];
const states = ["pendiente", "activo", "suspendido"];
const staffRoles = new Set(["staff", "admin", "super_admin"]);
const adminRoles = new Set(["admin", "super_admin"]);
const officialEmail = (value: unknown) => /^[^@\s]+@usmcf\.com$/i.test(String(value || "").trim());
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function credentialKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("usmcf-credentials:" + secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptPassword(password: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await credentialKey(secret), new TextEncoder().encode(password));
  return { password_ciphertext: b64(new Uint8Array(encrypted)), password_iv: b64(iv) };
}
async function decryptPassword(ciphertext: string, iv: string, secret: string) {
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await credentialKey(secret), unb64(ciphertext));
  return new TextDecoder().decode(decrypted);
}
function generatedPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";
  const random = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(random, (value) => alphabet[value % alphabet.length]).join("");
}

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
    const body = await request.json();

    if (body.action === "invalidate_own_credential") {
      await admin.from("private_account_credentials").delete().eq("user_id", authData.user.id);
      return json({ invalidated: true });
    }

    const { data: actor } = await admin.from("profiles").select("rol,estado").eq("id", authData.user.id).single();
    if (!actor || !staffRoles.has(actor.rol) || actor.estado !== "activo") return json({ error: "Acceso de Staff requerido" }, 403);
    const isAdmin = adminRoles.has(actor.rol);

    if (body.action === "list_credentials") {
      const [profileResult, credentialResult, memberResult] = await Promise.all([
        admin.from("profiles").select("id,nombre,callsign,usuario_roblox,email,rol,estado,discord_id").order("nombre"),
        admin.from("private_account_credentials").select("user_id,password_ciphertext,password_iv,source,updated_at"),
        admin.from("faction_members").select("discord_id,username,display_name,avatar_url,profile_id,is_active").eq("is_active", true).order("display_name"),
      ]);
      const problem = profileResult.error || credentialResult.error || memberResult.error;
      if (problem) return json({ error: problem.message }, 400);
      const passwordMap = new Map<string, Record<string, unknown>>();
      for (const row of credentialResult.data || []) {
        try {
          passwordMap.set(row.user_id, { password: await decryptPassword(row.password_ciphertext, row.password_iv, serviceKey), source: row.source, updated_at: row.updated_at });
        } catch {
          passwordMap.set(row.user_id, { password: "", source: row.source, updated_at: row.updated_at });
        }
      }
      return json({
        credentials: (profileResult.data || []).map((profile) => ({ ...profile, credential: passwordMap.get(profile.id) || null })),
        faction_members: memberResult.data || [],
      });
    }

    if (body.action === "link_discord") {
      const userId = String(body.user_id || "");
      const discordId = String(body.discord_id || "");
      if (!userId || !discordId) return json({ error: "Usuario y miembro de Discord son obligatorios" }, 400);
      const [targetResult, memberResult] = await Promise.all([
        admin.from("profiles").select("id,discord_id").eq("id", userId).single(),
        admin.from("faction_members").select("discord_id,profile_id,avatar_url").eq("discord_id", discordId).single(),
      ]);
      if (!targetResult.data || !memberResult.data) return json({ error: "No se encontró la cuenta o el miembro de Discord" }, 404);
      const target = targetResult.data;
      const member = memberResult.data;
      const { data: owner } = await admin.from("profiles").select("id,nombre,email").eq("discord_id", discordId).neq("id", userId).maybeSingle();
      if (owner && !body.force) return json({ error: "Ese Discord ya está vinculado a otra cuenta.", conflict: owner }, 409);
      if (owner) await admin.from("profiles").update({ discord_id: null }).eq("id", owner.id);
      if (target.discord_id && target.discord_id !== discordId) await admin.from("faction_members").update({ profile_id: null }).eq("discord_id", target.discord_id);
      await admin.from("faction_members").update({ profile_id: userId }).eq("discord_id", discordId);
      const { error: linkError } = await admin.from("profiles").update({ discord_id: discordId, avatar_url: member.avatar_url || null }).eq("id", userId);
      if (linkError) return json({ error: linkError.message }, 400);
      return json({ linked: true, moved_from: owner || null });
    }

    if (!isAdmin && body.action !== "reset_password") return json({ error: "Acceso de Administrador requerido" }, 403);

    if (body.action === "create") {
      if (!body.email || !body.password || String(body.password).length < 8) return json({ error: "Email y contraseña de 8 caracteres son obligatorios" }, 400);
      if (!officialEmail(body.email)) return json({ error: "Solo se aceptan correos institucionales @usmcf.com." }, 400);
      const requestedRole = roles.includes(body.rol) ? body.rol : "usuario";
      if (requestedRole === "super_admin" && actor.rol !== "super_admin") return json({ error: "Solo Alto Mando puede crear otro Alto Mando" }, 403);
      const email = String(body.email).toLowerCase().trim();
      const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password: body.password, email_confirm: true, user_metadata: { nombre: body.nombre, usuario_roblox: body.usuario_roblox, callsign: body.callsign }, app_metadata: { usmcf_role: requestedRole } });
      if (createError || !created.user) return json({ error: createError?.message || "No se pudo crear el usuario" }, 400);
      const requiresTraining = requestedRole === "usuario";
      const { error: profileError } = await admin.from("profiles").update({ nombre: body.nombre, usuario_roblox: body.usuario_roblox, callsign: body.callsign || body.usuario_roblox, rol: requestedRole, rango: requiresTraining ? "Recluta" : requestedRole === "staff" ? "Soldado" : "General", estado: requiresTraining ? "pendiente" : "activo" }).eq("id", created.user.id);
      if (profileError) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: profileError.message }, 400); }
      const encrypted = await encryptPassword(String(body.password), serviceKey);
      await admin.from("private_account_credentials").upsert({ user_id: created.user.id, ...encrypted, source: "admin_create", created_by: authData.user.id, updated_at: new Date().toISOString() });
      if (!requiresTraining) {
        await admin.from("training_assignments").delete().eq("user_id", created.user.id);
        await admin.from("discord_events").delete().eq("user_id", created.user.id).eq("tipo", "training_assigned");
      }
      const { data: event } = await admin.from("discord_events").select("id").eq("user_id", created.user.id).eq("tipo", "training_assigned").order("created_at", { ascending: false }).limit(1).maybeSingle();
      return json({ user_id: created.user.id, event_id: event?.id || null });
    }

    if (body.action === "update") {
      const { data: target } = await admin.from("profiles").select("*").eq("id", body.user_id).single();
      if (!target) return json({ error: "Usuario no encontrado" }, 404);
      if ((target.rol === "super_admin" || body.rol === "super_admin") && actor.rol !== "super_admin") return json({ error: "Solo Alto Mando puede modificar Alto Mando" }, 403);
      if (body.rol && !roles.includes(body.rol)) return json({ error: "Rol inválido" }, 400);
      if (body.estado && !states.includes(body.estado)) return json({ error: "Estado inválido" }, 400);
      if (body.email && !officialEmail(body.email)) return json({ error: "Solo se aceptan correos institucionales @usmcf.com." }, 400);
      if (body.email && body.email !== target.email) {
        const email = String(body.email).toLowerCase().trim();
        const { error } = await admin.auth.admin.updateUserById(target.id, { email, email_confirm: true });
        if (error) return json({ error: error.message }, 400);
        body.email = email;
      }
      if (body.command_role_id) {
        const { data: commandRole } = await admin.from("command_roles").select("id").eq("id", body.command_role_id).eq("active", true).maybeSingle();
        if (!commandRole) return json({ error: "El cargo del Pentágono seleccionado no existe o está inactivo." }, 400);
      }
      const update = Object.fromEntries(["nombre", "callsign", "usuario_roblox", "email", "rol", "estado", "rango", "command_role_id"].filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
      const { error } = await admin.from("profiles").update(update).eq("id", target.id);
      return error ? json({ error: error.message }, 400) : json({ updated: true });
    }

    if (body.action === "reset_password") {
      if (!body.user_id) return json({ error: "Usuario obligatorio" }, 400);
      const { data: target } = await admin.from("profiles").select("rol").eq("id", body.user_id).single();
      if (!target) return json({ error: "Usuario no encontrado" }, 404);
      if (actor.rol === "staff" && target.rol !== "usuario") return json({ error: "Staff solo puede renovar claves de miembros" }, 403);
      if (target.rol === "super_admin" && actor.rol !== "super_admin") return json({ error: "Solo Alto Mando puede modificar Alto Mando" }, 403);
      const password = String(body.password || generatedPassword());
      if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
      const { error } = await admin.auth.admin.updateUserById(body.user_id, { password });
      if (error) return json({ error: error.message }, 400);
      const encrypted = await encryptPassword(password, serviceKey);
      const { error: storeError } = await admin.from("private_account_credentials").upsert({ user_id: body.user_id, ...encrypted, source: "admin_reset", created_by: authData.user.id, updated_at: new Date().toISOString() });
      return storeError ? json({ error: storeError.message }, 400) : json({ password_updated: true, password });
    }

    if (body.action === "delete") {
      const targetId = String(body.user_id || "");
      if (!targetId || targetId === authData.user.id) return json({ error: "Usuario inválido o cuenta propia" }, 400);
      const { data: target } = await admin.from("profiles").select("id,rol").eq("id", targetId).single();
      if (!target) return json({ error: "Usuario no encontrado" }, 404);
      if (target.rol === "super_admin" && actor.rol !== "super_admin") return json({ error: "Solo Super Admin puede eliminar a otro Super Admin." }, 403);
      if (target.rol === "super_admin") {
        const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("rol", "super_admin").eq("estado", "activo");
        if ((count || 0) <= 1) return json({ error: "No puedes eliminar al último Super Admin activo." }, 409);
      }
      const { error } = await admin.auth.admin.deleteUser(targetId);
      return error ? json({ error: error.message }, 400) : json({ deleted: true, user_id: targetId });
    }
    return json({ error: "Acción no soportada" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
