// ============================================
// USMCF — MÓDULO DE MISIONES
// ============================================
(function () {
  "use strict";

  window.USMCF = window.USMCF || {};

  window.USMCF.Missions = {
    // Listar misiones
    list: async function (filters) {
      var q = supabase.from("missions").select("*").order("fecha", { ascending: true });
      if (filters && filters.estado) q = q.eq("estado", filters.estado);
      var result = await q;
      return result.data || [];
    },

    // Obtener una misión
    get: async function (id) {
      var result = await supabase.from("missions").select("*").eq("id", id).single();
      return result.data;
    },

    // Inscribirse en una misión
    join: async function (missionId, userId) {
      var existing = await supabase.from("mission_participants")
        .select("id").eq("mission_id", missionId).eq("user_id", userId).single();
      if (existing.data) return { error: "Ya estás inscrito en esta misión." };

      var result = await supabase.from("mission_participants").insert({
        mission_id: missionId, user_id: userId, estado: "inscrito"
      });
      return result;
    },

    // Salir de una misión
    leave: async function (missionId, userId) {
      var result = await supabase.from("mission_participants")
        .delete().eq("mission_id", missionId).eq("user_id", userId);
      return result;
    },

    // Verificar si estoy inscrito
    isJoined: async function (missionId, userId) {
      var result = await supabase.from("mission_participants")
        .select("id").eq("mission_id", missionId).eq("user_id", userId).single();
      return !!result.data;
    },

    // Contar participantes
    countParticipants: async function (missionId) {
      var result = await supabase.from("mission_participants")
        .select("id").eq("mission_id", missionId);
      return (result.data || []).length;
    },

    // Listar participantes de una misión
    getParticipants: async function (missionId) {
      var parts = await supabase.from("mission_participants")
        .select("user_id, estado, joined_at").eq("mission_id", missionId);
      var participants = parts.data || [];
      var results = [];
      for (var i = 0; i < participants.length; i++) {
        var profile = await supabase.from("profiles")
          .select("nombre, usuario_roblox, rango")
          .eq("id", participants[i].user_id).single();
        if (profile.data) {
          results.push(Object.assign({}, participants[i], profile.data));
        }
      }
      return results;
    },

    // Crear misión (admin)
    create: async function (data) {
      var result = await supabase.from("missions").insert({
        titulo: data.titulo,
        descripcion: data.descripcion,
        fecha: data.fecha,
        recompensa_puntos: data.recompensa_puntos || 0,
        recompensa_dinero: data.recompensa_dinero || 0,
        estado: data.estado || "programada"
      });
      return result;
    },

    // Actualizar misión (admin)
    update: async function (id, data) {
      var result = await supabase.from("missions").update(data).eq("id", id);
      return result;
    },

    // Terminar misión y pagar recompensas (admin)
    finish: async function (missionId) {
      var mission = await this.get(missionId);
      if (!mission) return { error: "Misión no encontrada." };

      var parts = await supabase.from("mission_participants")
        .select("user_id").eq("mission_id", missionId).eq("estado", "inscrito");
      var participants = parts.data || [];

      for (var i = 0; i < participants.length; i++) {
        var uid = participants[i].user_id;
        var profile = await supabase.from("profiles")
          .select("puntos, dinero").eq("id", uid).single();
        if (profile.data) {
          await supabase.from("profiles").update({
            puntos: profile.data.puntos + mission.recompensa_puntos,
            dinero: profile.data.dinero + mission.recompensa_dinero
          }).eq("id", uid);

          await supabase.from("transactions").insert({
            user_id: uid, tipo: "mision",
            descripcion: "Misión completada: " + mission.titulo,
            monto_puntos: mission.recompensa_puntos,
            monto_dinero: mission.recompensa_dinero
          });

          await supabase.from("mission_participants")
            .update({ estado: "completado" })
            .eq("mission_id", missionId).eq("user_id", uid);
        }
      }

      await this.update(missionId, { estado: "terminada" });
      return { data: participants.length + " participantes pagados." };
    },

    // Eliminar misión (admin)
    remove: async function (id) {
      await supabase.from("mission_participants").delete().eq("mission_id", id);
      var result = await supabase.from("missions").delete().eq("id", id);
      return result;
    }
  };

})();
