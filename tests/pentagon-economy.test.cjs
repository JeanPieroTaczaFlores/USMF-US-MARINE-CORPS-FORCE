const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261020225951_pentagon_roles_and_weekly_bonuses.sql"), "utf8");
const platform = fs.readFileSync(path.join(root, "js", "platform.js"), "utf8");
const bot = fs.readFileSync(path.join(root, "bot", "index.js"), "utf8");

test("separa el cargo del Pentágono del permiso administrativo", () => {
  assert.match(migration, /add column command_role_id uuid/i);
  assert.match(platform, /PERMISO DE PLATAFORMA/);
  assert.match(platform, /CARGO DEL PENTÁGONO/);
});

test("incluye los cargos oficiales sincronizados desde Discord", () => {
  for (const role of ["Alto Mando", "Staff en Jefe", "Staff en Prueba", "Gestor de Misiones", "Consultor"]) {
    assert.ok(migration.includes(role), `falta ${role}`);
  }
});

test("el salario semanal suma rango y bono sin excluir administración", () => {
  assert.match(migration, /total_salary := base_salary \+ role_bonus/);
  assert.doesNotMatch(migration, /p\.rol not in \('admin', 'super_admin'\)/);
  assert.match(migration, /base_salary \+ due\.role_bonus/);
});

test("los cambios de cargo se registran únicamente mediante el flujo de logd", () => {
  assert.match(bot, /type\.startsWith\("command_role_"\).*config\.logdChannel/);
});
