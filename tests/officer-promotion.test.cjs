const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261105154255_officer_promotion_requests.sql"), "utf8");
const platform = fs.readFileSync(path.join(root, "js", "platform.js"), "utf8");
const html = fs.readFileSync(path.join(root, "plataforma.html"), "utf8");
const bot = fs.readFileSync(path.join(root, "bot", "index.js"), "utf8");

test("los rangos de oficial quedan fuera del ascenso automático", () => {
  assert.match(migration, /where category = 'oficial'/);
  assert.match(migration, /set auto_promote = false/);
  assert.match(migration, /points_required = null/);
});

test("la postulación sólo avanza al siguiente rango y requiere revisión", () => {
  assert.match(migration, /create table if not exists public\.officer_promotion_requests/);
  assert.match(migration, /create unique index if not exists officer_promotion_one_pending_per_user/);
  assert.match(migration, /create or replace function public\.request_officer_promotion/);
  assert.match(migration, /create or replace function public\.review_officer_promotion/);
  assert.match(migration, /p_action not in \('aprobar', 'rechazar'\)/);
  assert.match(migration, /if member\.rango <> application\.from_rank/);
});

test("miembros postulan y Staff confirma desde la plataforma", () => {
  assert.match(html, /id="rankPromotionSubmit"/);
  assert.match(html, /id="officerPromotionQueue"/);
  assert.match(platform, /supabase\.rpc\("request_officer_promotion"/);
  assert.match(platform, /supabase\.rpc\("review_officer_promotion"/);
});

test("todos los avisos de rango se envían únicamente a logd", () => {
  assert.match(bot, /type\.startsWith\("rank_"\).*config\.logdChannel/);
});
