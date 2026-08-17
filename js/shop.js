// ============================================
// USMCF — MÓDULO DE TIENDA
// ============================================
(function () {
  "use strict";

  window.USMCF = window.USMCF || {};

  window.USMCF.Shop = {
    // Listar items disponibles
    listItems: async function () {
      var result = await supabase.from("shop_items")
        .select("*").eq("disponible", true).order("precio_dinero");
      return result.data || [];
    },

    // Listar todos los items (admin)
    listAll: async function () {
      var result = await supabase.from("shop_items")
        .select("*").order("created_at", { ascending: false });
      return result.data || [];
    },

    // Crear item (admin)
    createItem: async function (data) {
      var result = await supabase.from("shop_items").insert({
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo: data.tipo || "general",
        precio_dinero: data.precio_dinero || 0,
        precio_puntos: data.precio_puntos || 0,
        stock: data.stock || -1,
        imagen_url: data.imagen_url || "",
        disponible: true
      });
      return result;
    },

    // Actualizar item (admin)
    updateItem: async function (id, data) {
      var result = await supabase.from("shop_items").update(data).eq("id", id);
      return result;
    },

    // Eliminar item (admin)
    removeItem: async function (id) {
      await supabase.from("user_inventory").delete().eq("item_id", id);
      var result = await supabase.from("shop_items").delete().eq("id", id);
      return result;
    },

    // Comprar item
    buy: async function (itemId, userId) {
      var item = await supabase.from("shop_items").select("*").eq("id", itemId).single();
      if (!item.data) return { error: "Item no encontrado." };
      var it = item.data;

      var profile = await supabase.from("profiles")
        .select("dinero, puntos").eq("id", userId).single();
      if (!profile.data) return { error: "Usuario no encontrado." };
      var p = profile.data;

      // Verificar stock
      if (it.stock === 0) return { error: "Sin stock disponible." };

      // Verificar dinero
      var moneda = it.precio_dinero > 0 ? "dinero" : "puntos";
      var precio = it.precio_dinero > 0 ? it.precio_dinero : it.precio_puntos;
      var saldo = moneda === "dinero" ? p.dinero : p.puntos;

      if (saldo < precio) return { error: "No tienes suficiente " + moneda + ". Necesitas " + precio + "." };

      // Descontar
      var updates = {};
      updates[moneda] = saldo - precio;
      await supabase.from("profiles").update(updates).eq("id", userId);

      // Registrar compra
      await supabase.from("user_inventory").insert({
        user_id: userId, item_id: itemId
      });

      // Descontar stock
      if (it.stock > 0) {
        await supabase.from("shop_items").update({ stock: it.stock - 1 }).eq("id", itemId);
      }

      // Registrar transacción
      await supabase.from("transactions").insert({
        user_id: userId, tipo: "compra",
        descripcion: "Compra: " + it.nombre,
        monto_dinero: moneda === "dinero" ? -precio : 0,
        monto_puntos: moneda === "puntos" ? -precio : 0
      });

      return { data: "¡Compra exitosa!" };
    },

    // Inventario del usuario
    getInventory: async function (userId) {
      var inv = await supabase.from("user_inventory")
        .select("item_id, comprado_at").eq("user_id", userId);
      var items = inv.data || [];
      var results = [];
      for (var i = 0; i < items.length; i++) {
        var item = await supabase.from("shop_items")
          .select("*").eq("id", items[i].item_id).single();
        if (item.data) {
          results.push(Object.assign({}, item.data, { comprado_at: items[i].comprado_at }));
        }
      }
      return results;
    }
  };

})();
