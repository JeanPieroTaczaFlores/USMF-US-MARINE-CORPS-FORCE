import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const managedRoleKeys = [
  "DISCORD_ROLE_RECRUIT_ID",
  "DISCORD_ROLE_SOLDIER_ID",
  "DISCORD_ROLE_STAFF_ID",
  "DISCORD_ROLE_ADMIN_ID",
] as const;

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const guildId = Deno.env.get("DISCORD_GUILD_ID");
    if (!botToken || !guildId) return response({ error: "Discord bot is not configured" }, 503);

    const authorization = request.headers.get("Authorization") || "";
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) return response({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: actor } = await admin
      .from("profiles")
      .select("id,rol,estado")
      .eq("id", authData.user.id)
      .single();
    if (!actor) return response({ error: "Profile not found" }, 404);

    const body = await request.json();
    const targetId = String(body.user_id || authData.user.id);
    const isSelf = targetId === authData.user.id;
    const canManage = actor.estado === "activo" && ["staff", "admin", "super_admin"].includes(actor.rol);
    if (!isSelf && !canManage) return response({ error: "Forbidden" }, 403);

    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("id,discord_id,rol,estado,rango")
      .eq("id", targetId)
      .single();
    if (targetError || !target) return response({ error: "User not found" }, 404);
    if (!target.discord_id) return response({ synced: false, reason: "discord_not_linked" });

    const roleIds = Object.fromEntries(
      managedRoleKeys.map((key) => [key, Deno.env.get(key)]).filter((entry) => Boolean(entry[1])),
    ) as Record<string, string>;

    const desired = new Set<string>();
    if (target.estado !== "activo") {
      if (roleIds.DISCORD_ROLE_RECRUIT_ID) desired.add(roleIds.DISCORD_ROLE_RECRUIT_ID);
    } else {
      if (roleIds.DISCORD_ROLE_SOLDIER_ID) desired.add(roleIds.DISCORD_ROLE_SOLDIER_ID);
      if (target.rol === "staff" && roleIds.DISCORD_ROLE_STAFF_ID) desired.add(roleIds.DISCORD_ROLE_STAFF_ID);
      if (["admin", "super_admin"].includes(target.rol) && roleIds.DISCORD_ROLE_ADMIN_ID) desired.add(roleIds.DISCORD_ROLE_ADMIN_ID);
    }

    const headers = { Authorization: `Bot ${botToken}` };
    const memberUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${target.discord_id}`;
    const memberResponse = await fetch(memberUrl, { headers });
    if (!memberResponse.ok) {
      return response({ error: `Discord member lookup failed (${memberResponse.status})` }, 502);
    }
    const member = await memberResponse.json();
    const currentRoles = new Set<string>(member.roles || []);
    const managedRoles = Object.values(roleIds);

    for (const roleId of managedRoles) {
      const shouldHave = desired.has(roleId);
      const hasRole = currentRoles.has(roleId);
      if (shouldHave === hasRole) continue;
      const roleResponse = await fetch(`${memberUrl}/roles/${roleId}`, {
        method: shouldHave ? "PUT" : "DELETE",
        headers,
      });
      if (!roleResponse.ok) {
        return response({ error: `Discord role update failed (${roleResponse.status})`, role_id: roleId }, 502);
      }
    }

    return response({ synced: true, roles: Array.from(desired) });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
