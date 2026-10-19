(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.USMCFPurchaseHistory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function buildRows(orders, orderItems, profiles) {
    return (orders || []).map(function (order) {
      var profile = (profiles || []).find(function (candidate) {
        return String(candidate.id) === String(order.user_id);
      }) || {};
      var items = (orderItems || []).filter(function (item) {
        return String(item.order_id) === String(order.id);
      });
      var buyerName = profile.nombre || profile.callsign || profile.usuario_roblox || "Usuario eliminado";
      var handle = profile.callsign || profile.usuario_roblox || "sin-usuario";
      var searchable = [order.invoice_number, order.estado, buyerName, handle]
        .concat(items.map(function (item) { return item.nombre; }))
        .join(" ")
        .toLowerCase();
      return {
        order: order,
        profile: profile,
        items: items,
        buyerName: buyerName,
        handle: handle,
        searchable: searchable
      };
    });
  }

  function filterRows(rows, query) {
    var normalized = String(query || "").trim().toLowerCase();
    if (!normalized) return rows || [];
    return (rows || []).filter(function (row) {
      return row.searchable.indexOf(normalized) !== -1;
    });
  }

  function summarize(rows) {
    return (rows || []).reduce(function (summary, row) {
      summary.orders += 1;
      summary.money += Number(row.order.total_dinero || 0);
      summary.points += Number(row.order.total_puntos || 0);
      summary.units += row.items.reduce(function (total, item) {
        return total + Number(item.quantity || 0);
      }, 0);
      return summary;
    }, { orders: 0, money: 0, points: 0, units: 0 });
  }

  return {
    buildRows: buildRows,
    filterRows: filterRows,
    summarize: summarize
  };
});
