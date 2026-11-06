const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const bot = fs.readFileSync(path.join(root, "bot", "index.js"), "utf8");
const edge = fs.readFileSync(path.join(root, "supabase", "functions", "discord-mission-alert", "index.ts"), "utf8");

test("missions go only to Emisiones and operational fallback goes to logd", () => {
  assert.match(bot, /mission_published", "mission_updated"\]\.includes\(type\)\) return \[config\.missionsChannel\]/);
  assert.doesNotMatch(bot, /return \[config\.missionsChannel, config\.announcementsChannel\]/);
  assert.match(bot, /return \[config\.logdChannel\];\s*\n}/);
});

test("direct webhook sends mission events only to missions webhook", () => {
  assert.match(edge, /return \["DISCORD_MISSIONS_WEBHOOK_URL"\];/);
  assert.doesNotMatch(edge, /return \["DISCORD_MISSIONS_WEBHOOK_URL", "DISCORD_ANNOUNCEMENTS_WEBHOOK_URL"\]/);
});
