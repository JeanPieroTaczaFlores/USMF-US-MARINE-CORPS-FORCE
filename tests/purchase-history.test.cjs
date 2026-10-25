const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const history = require("../js/purchase-history.js");

const orders = [
  { id: "order-1", user_id: "user-1", invoice_number: "USMCF-001", total_dinero: 120, total_puntos: 0, estado: "pagada" },
  { id: "order-2", user_id: "user-2", invoice_number: "USMCF-002", total_dinero: 0, total_puntos: 250, estado: "pagada" }
];
const items = [
  { order_id: "order-1", nombre: "Parche USMCF", quantity: 1 },
  { order_id: "order-2", nombre: "Placa", quantity: 2 }
];
const profiles = [
  { id: "user-1", nombre: "Falcon", callsign: "falcon" },
  { id: "user-2", nombre: "Mart", usuario_roblox: "martgamer" }
];

test("une las compras con comprador y artículos", () => {
  const rows = history.buildRows(orders, items, profiles);
  assert.equal(rows[0].buyerName, "Falcon");
  assert.equal(rows[1].handle, "martgamer");
  assert.equal(rows[1].items[0].nombre, "Placa");
});

test("busca por usuario, factura o implemento", () => {
  const rows = history.buildRows(orders, items, profiles);
  assert.deepEqual(history.filterRows(rows, "falcon").map((row) => row.order.id), ["order-1"]);
  assert.deepEqual(history.filterRows(rows, "USMCF-002").map((row) => row.order.id), ["order-2"]);
  assert.deepEqual(history.filterRows(rows, "parche").map((row) => row.order.id), ["order-1"]);
});

test("calcula totales de auditoría", () => {
  const rows = history.buildRows(orders, items, profiles);
  assert.deepEqual(history.summarize(rows), { orders: 2, money: 120, points: 250, units: 3 });
});

test("conserva la identidad del comprador cuando el usuario fue eliminado", () => {
  const deletedOrder = {
    id: "order-3",
    user_id: null,
    invoice_number: "USMCF-003",
    buyer_name: "Marine retirado",
    buyer_callsign: "retirado",
    buyer_email: "retirado@usmcf.com"
  };
  const rows = history.buildRows([deletedOrder], [], []);
  assert.equal(rows[0].buyerName, "Marine retirado");
  assert.equal(rows[0].handle, "retirado");
  assert.deepEqual(history.filterRows(rows, "retirado@usmcf.com").map((row) => row.order.id), ["order-3"]);
});

test("la página carga el historial antes de la plataforma", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "plataforma.html"), "utf8");
  const helper = html.indexOf('src="js/purchase-history.js');
  const platform = html.indexOf('src="js/platform.js');
  assert.ok(helper >= 0, "falta js/purchase-history.js");
  assert.ok(platform > helper, "purchase-history.js debe cargarse antes que platform.js");
});
