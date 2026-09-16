(function () {
  "use strict";

  if (typeof isSupabaseConfigured === "undefined" || !isSupabaseConfigured) return;

  fetch(SUPABASE_URL + "/rest/v1/discord_invites?select=invite_url,expires_at&expires_at=gt." + encodeURIComponent(new Date().toISOString()) + "&order=created_at.desc&limit=1", {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY }
  }).then(function (response) {
    if (!response.ok) throw new Error("Invite lookup failed");
    return response.json();
  }).then(function (rows) {
    var invite = rows && rows[0];
    if (!invite || !/^https:\/\/discord\.gg\/[A-Za-z0-9-]+$/i.test(invite.invite_url)) return;
    document.querySelectorAll('a[href*="discord.gg/"]').forEach(function (link) {
      link.href = invite.invite_url;
      link.dataset.inviteExpires = invite.expires_at;
    });
  }).catch(function () {
    // Mantiene el enlace de respaldo si el bot o Supabase no están disponibles.
  });
})();
