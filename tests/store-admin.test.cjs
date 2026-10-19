const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const storeAdmin = require("../js/store-admin.js");

test("el panel no muestra artículos archivados", () => {
  const items = [
    { id: "visible", archived_at: null },
    { id: "archived", archived_at: "2026-10-19T22:00:00.000Z" }
  ];
  assert.deepEqual(storeAdmin.visibleCatalogItems(items).map((item) => item.id), ["visible"]);
});

test("una referencia de inventario activa el archivado seguro", () => {
  assert.equal(storeAdmin.deletionOutcome({ code: "23503" }), "archive");
  assert.equal(storeAdmin.deletionOutcome(null), "deleted");
  assert.equal(storeAdmin.deletionOutcome({ code: "42501" }), "error");
});

test("archivar también retira el artículo de la tienda", () => {
  const timestamp = "2026-10-19T22:00:00.000Z";
  assert.deepEqual(storeAdmin.archivePayload(timestamp), {
    disponible: false,
    archived_at: timestamp
  });
});

test("la página carga el controlador antes de la plataforma", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "plataforma.html"), "utf8");
  const helper = html.indexOf('src="js/store-admin.js');
  const platform = html.indexOf('src="js/platform.js');
  assert.ok(helper >= 0, "falta js/store-admin.js");
  assert.ok(platform > helper, "store-admin.js debe cargarse antes que platform.js");
});
