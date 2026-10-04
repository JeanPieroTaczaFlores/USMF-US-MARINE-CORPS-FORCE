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

function jsonMap(name: string): Record<string, string> {
  try { return JSON.parse(Deno.env.get(name) || "{}"); }
  catch { return {}; }
}

const specialtyRoleNames: Record<string, string[]> = {
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

function normalizedRoleName(value: unknown) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
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

    const { data: specialtyApplications } = await admin
      .from("specialty_applications")
      .select("role_key")
      .eq("user_id", targetId)
      .eq("estado", "aprobada");

    const roleIds = Object.fromEntries(
      managedRoleKeys.map((key) => [key, Deno.env.get(key)]).filter((entry) => Boolean(entry[1])),
    ) as Record<string, string>;
    const rankRoleMap = jsonMap("DISCORD_RANK_ROLE_MAP");
    const configuredSpecialtyRoleMap = jsonMap("DISCORD_SPECIALTY_ROLE_MAP");
    const guildRolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    const guildRoles = guildRolesResponse.ok ? await guildRolesResponse.json() : [];
    const roleByName = new Map((Array.isArray(guildRoles) ? guildRoles : []).map((role: Record<string, unknown>) => [normalizedRoleName(role.name), String(role.id)]));
    const discoveredSpecialtyRoleMap = Object.fromEntries(Object.entries(specialtyRoleNames)
      .map(([key, names]) => [key, names.map((name) => roleByName.get(name)).find(Boolean)])
      .filter((entry) => Boolean(entry[1])));
    const specialtyRoleMap = { ...discoveredSpecialtyRoleMap, ...configuredSpecialtyRoleMap };

    const desired = new Set<string>();
    if (target.estado !== "activo") {
      if (roleIds.DISCORD_ROLE_RECRUIT_ID) desired.add(roleIds.DISCORD_ROLE_RECRUIT_ID);
    } else {
      if (roleIds.DISCORD_ROLE_SOLDIER_ID) desired.add(roleIds.DISCORD_ROLE_SOLDIER_ID);
      if (target.rol === "staff" && roleIds.DISCORD_ROLE_STAFF_ID) desired.add(roleIds.DISCORD_ROLE_STAFF_ID);
      if (["admin", "super_admin"].includes(target.rol) && roleIds.DISCORD_ROLE_ADMIN_ID) desired.add(roleIds.DISCORD_ROLE_ADMIN_ID);
      if (rankRoleMap[target.rango]) desired.add(rankRoleMap[target.rango]);
      for (const application of specialtyApplications || []) {
        if (specialtyRoleMap[application.role_key]) desired.add(specialtyRoleMap[application.role_key]);
      }
    }

    const headers = { Authorization: `Bot ${botToken}` };
    const memberUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${target.discord_id}`;
    const memberResponse = await fetch(memberUrl, { headers });
    if (!memberResponse.ok) {
      return response({ error: `Discord member lookup failed (${memberResponse.status})` }, 502);
    }
    const member = await memberResponse.json();
    const currentRoles = new Set<string>(member.roles || []);
    const managedRoles = Array.from(new Set([...Object.values(roleIds), ...Object.values(rankRoleMap), ...Object.values(specialtyRoleMap)]));

    const warnings: Array<{ role_id: string; status: number }> = [];
    for (const roleId of managedRoles) {
      const shouldHave = desired.has(roleId);
      const hasRole = currentRoles.has(roleId);
      if (shouldHave === hasRole) continue;
      const roleResponse = await fetch(`${memberUrl}/roles/${roleId}`, {
        method: shouldHave ? "PUT" : "DELETE",
        headers,
      });
      if (!roleResponse.ok) warnings.push({ role_id: roleId, status: roleResponse.status });
    }

    return response({ synced: warnings.length === 0, partial: warnings.length > 0, roles: Array.from(desired), warnings });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
