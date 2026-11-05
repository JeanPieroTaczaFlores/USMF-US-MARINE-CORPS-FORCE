const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const platform = fs.readFileSync(path.join(root, "js", "platform.js"), "utf8");
const html = fs.readFileSync(path.join(root, "plataforma.html"), "utf8");

test("cada usuario tiene un formulario para cambiar su contraseña", () => {
  assert.match(html, /id="selfPasswordForm"/);
  assert.match(html, /id="currentPassword"/);
  assert.match(html, /id="newPassword"/);
  assert.match(html, /id="confirmPassword"/);
  assert.match(html, /CAMBIAR MI CONTRASEÑA/);
});

test("el cambio valida la contraseña actual y la confirmación", () => {
  assert.match(platform, /currentPassword === newPassword/);
  assert.match(platform, /newPassword !== confirmPassword/);
  assert.match(platform, /updateUser\(\{ current_password: currentPassword, password: newPassword \}\)/);
  assert.match(platform, /selfPasswordForm.*addEventListener\("submit", changeOwnPassword\)/s);
});
