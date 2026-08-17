// ============================================
// USMCF — MÓDULO DE TRANSACCIONES Y SALARIO
// ============================================
(function () {
  "use strict";

  window.USMCF = window.USMCF || {};

  window.USMCF.Transactions = {
    // Historial del usuario
    getHistory: async function (userId, limit) {
      var q = supabase.from("transactions")
        .select("*").eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      var result = await q;
      return result.data || [];
    },

    // Pagar salario semanal
    paySalary: async function (userId) {
      var profile = await supabase.from("profiles")
        .select("rango, dinero, ultimo_salario").eq("id", userId).single();
      if (!profile.data) return { error: "Usuario no encontrado." };
      var p = profile.data;

      // Buscar salario del rango
      var rango = RANGOS.find(function (r) { return r.rango === p.rango; });
      if (!rango) return { error: "Rango no encontrado." };

      // Verificar si ya cobró esta semana
      var now = new Date();
      var lastPay = p.ultimo_salario ? new Date(p.ultimo_salario) : null;
      if (lastPay) {
        var diffDays = (now - lastPay) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) {
          var daysLeft = Math.ceil(7 - diffDays);
          return { error: "Ya cobraste esta semana. Vuelve en " + daysLeft + " día(s)." };
        }
      }

      // Pagar
      await supabase.from("profiles").update({
        dinero: p.dinero + rango.salario,
        ultimo_salario: now.toISOString()
      }).eq("id", userId);

      await supabase.from("transactions").insert({
        user_id: userId, tipo: "salario",
        descripcion: "Salario semanal — " + p.rango,
        monto_dinero: rango.salario,
        monto_puntos: 0
      });

      return { data: "Salario pagado: " + rango.salario + " coins" };
    },

    // Transferir dinero a otro usuario (admin)
    transfer: async function (fromId, toId, amount, concepto) {
      var from = await supabase.from("profiles")
        .select("dinero, nombre").eq("id", fromId).single();
      if (!from.data || from.data.dinero < amount) {
        return { error: "Fondos insuficientes." };
      }

      var to = await supabase.from("profiles")
        .select("dinero, nombre").eq("id", toId).single();
      if (!to.data) return { error: "Destinatario no encontrado." };

      await supabase.from("profiles").update({ dinero: from.data.dinero - amount }).eq("id", fromId);
      await supabase.from("profiles").update({ dinero: to.data.dinero + amount }).eq("id", toId);

      await supabase.from("transactions").insert([
        { user_id: fromId, tipo: "transferencia_envio", descripcion: "Transferencia a " + to.data.nombre + ": " + (concepto || ""), monto_dinero: -amount, monto_puntos: 0 },
        { user_id: toId, tipo: "transferencia_recibo", descripcion: "Transferencia de " + from.data.nombre + ": " + (concepto || ""), monto_dinero: amount, monto_puntos: 0 }
      ]);

      return { data: "Transferencia exitosa." };
    },

    // Dar puntos/dinero (admin)
    grant: async function (userId, puntos, dinero, razon) {
      var profile = await supabase.from("profiles")
        .select("puntos, dinero").eq("id", userId).single();
      if (!profile.data) return { error: "Usuario no encontrado." };

      await supabase.from("profiles").update({
        puntos: profile.data.puntos + (puntos || 0),
        dinero: profile.data.dinero + (dinero || 0)
      }).eq("id", userId);

      await supabase.from("transactions").insert({
        user_id: userId, tipo: "admin_grant",
        descripcion: razon || "Asignado por administrador",
        monto_puntos: puntos || 0,
        monto_dinero: dinero || 0
      });

      return { data: "Recursos asignados." };
    }
  };

})();
