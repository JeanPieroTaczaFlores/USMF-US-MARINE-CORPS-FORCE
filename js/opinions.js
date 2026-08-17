// ============================================
// USMCF — MÓDULO DE OPINIONES
// ============================================
(function () {
  "use strict";

  window.USMCF = window.USMCF || {};

  window.USMCF.Opinions = {
    // Enviar opinión (cualquier usuario logueado, anónima)
    submit: async function (texto, userId) {
      if (!texto || texto.trim().length < 5) {
        return { error: "La opinión debe tener al menos 5 caracteres." };
      }
      var result = await supabase.from("opinions").insert({
        user_id: userId || null,
        texto: texto.trim()
      });
      return result;
    },

    // Listar todas (admin/staff)
    list: async function () {
      var result = await supabase.from("opinions")
        .select("*").order("created_at", { ascending: false });
      return result.data || [];
    },

    // Eliminar opinión (admin)
    remove: async function (id) {
      var result = await supabase.from("opinions").delete().eq("id", id);
      return result;
    }
  };

})();
