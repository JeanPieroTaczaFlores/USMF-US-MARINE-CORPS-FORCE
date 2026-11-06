const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "plataforma.html"), "utf8");
const platform = fs.readFileSync(path.join(root, "js", "platform.js"), "utf8");
const edge = fs.readFileSync(path.join(root, "supabase", "functions", "admin-users", "index.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261106044227_staff_temporary_credentials_and_discord_linking.sql"), "utf8");

test("separates credentials into a staff-only navigation section", () => {
  assert.match(html, /id="credentialsNav"[^>]+data-view="credenciales"/);
  assert.match(html, /data-panel="credenciales"/);
  assert.match(platform, /credentialsNav.*!isStaff/);
});

test("never exposes old hashes or mass-resets existing passwords", () => {
  assert.match(html, /LAS CONTRASEÑAS ACTUALES NO SE MODIFICAN/);
  assert.doesNotMatch(html, /bulk_reset_passwords|rotateAllPasswordsBtn/);
  assert.match(platform, /action: "reset_password", user_id: profileId/);
});

test("stores only new temporary credentials encrypted behind service role", () => {
  assert.match(edge, /AES-GCM/);
  assert.match(edge, /private_account_credentials/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all.*anon, authenticated/);
});

test("supports controlled Discord account linking", () => {
  assert.match(edge, /body\.action === "link_discord"/);
  assert.match(edge, /body\.force/);
  assert.match(platform, /VINCULAR DISCORD/);
});
