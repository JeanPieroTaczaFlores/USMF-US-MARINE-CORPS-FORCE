(function (root, factory) {
  "use strict";

  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.USMCFStoreAdmin = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function visibleCatalogItems(items) {
    return (items || []).filter(function (item) { return !item.archived_at; });
  }

  function deletionOutcome(error) {
    if (!error) return "deleted";
    if (String(error.code || "") === "23503") return "archive";
    return "error";
  }

  function archivePayload(archivedAt) {
    return {
      disponible: false,
      archived_at: archivedAt || new Date().toISOString()
    };
  }

  return {
    visibleCatalogItems: visibleCatalogItems,
    deletionOutcome: deletionOutcome,
    archivePayload: archivePayload
  };
});
