const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const edge = fs.readFileSync(path.join(root, "supabase", "functions", "admin-users", "index.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261025034851_preserve_orders_when_deleting_users.sql"), "utf8");

test("admin-users implementa la eliminación y protege cuentas críticas", () => {
  assert.match(edge, /body\.action === "delete"/);
  assert.match(edge, /targetId === authData\.user\.id/);
  assert.match(edge, /último Super Admin activo/);
  assert.match(edge, /admin\.auth\.admin\.deleteUser\(targetId\)/);
});

test("la eliminación conserva las facturas y la identidad histórica", () => {
  assert.match(migration, /alter column user_id drop not null/i);
  assert.match(migration, /on delete set null/i);
  assert.match(migration, /buyer_name/i);
  assert.match(migration, /snapshot_order_buyer/i);
});
