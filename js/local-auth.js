// ============================================
// USMCF — ADAPTADOR LOCALSTORAGE
// Simula la API de Supabase usando localStorage
// Activo cuando SUPABASE_URL no está configurado
// ============================================
(function () {
  "use strict";

  var DB_KEY = "usmcf_db";
  var SESSION_KEY = "usmcf_session";
  var PW_KEY = "usmcf_passwords";

  // --- Helpers ---
  function uid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function getPasswords() {
    try { return JSON.parse(localStorage.getItem(PW_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function savePasswords(pw) {
    localStorage.setItem(PW_KEY, JSON.stringify(pw));
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
  }
  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function getDB() {
    var db;
    try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { db = null; }
    if (!db || !db.profiles) db = initDB();
    return db;
  }

  function initDB() {
    var db = {
      profiles: [],
      missions: [],
      transactions: [],
      opinions: [],
      notifications: []
    };

    var now = new Date().toISOString();
    var adminId = uid();
    var staffId = uid();
    var clienteId = uid();

    db.profiles.push(
      {
        id: adminId, email: "admin@usmcf.com", nombre: "Comandante USMCF",
        usuario_roblox: "AdminUSMCF", rango: "General", rol: "super_admin",
        estado: "activo", puntos: 10000, dinero: 50000,
        created_at: now
      },
      {
        id: staffId, email: "staff@usmcf.com", nombre: "Sargento Mayor",
        usuario_roblox: "StaffUSMCF", rango: "Sargento Mayor de 1ra Clase",
        rol: "staff", estado: "activo", puntos: 5000, dinero: 15000,
        created_at: now
      },
      {
        id: clienteId, email: "cliente@usmcf.com", nombre: "Recluta Test",
        usuario_roblox: "ClienteTest", rango: "Soldado",
        rol: "usuario", estado: "activo", puntos: 100, dinero: 500,
        created_at: now
      }
    );

    db.missions.push(
      {
        id: uid(), titulo: "Patrulla Fronteriza Norte",
        descripcion: "Operación de patrullaje en la zona norte.",
        fecha: new Date(Date.now() + 2 * 86400000).toISOString(),
        recompensa_puntos: 150, recompensa_dinero: 300,
        estado: "programada", created_by: adminId
      },
      {
        id: uid(), titulo: "Entrenamiento Básico TRS",
        descripcion: "Sesión de entrenamiento para nuevos reclutas.",
        fecha: new Date(Date.now() + 86400000).toISOString(),
        recompensa_puntos: 80, recompensa_dinero: 120,
        estado: "activa", created_by: staffId
      },
      {
        id: uid(), titulo: "Asalto a Base Enemiga",
        descripcion: "Operación ofensiva de alto riesgo.",
        fecha: new Date(Date.now() + 5 * 86400000).toISOString(),
        recompensa_puntos: 300, recompensa_dinero: 500,
        estado: "programada", created_by: adminId
      }
    );

    saveDB(db);
    return db;
  }

  // Forzar contraseñas de prueba SOLO si no existen aún
  var testPasswords = {
    "admin@usmcf.com": "Admin123!",
    "staff@usmcf.com": "Staff123!",
    "cliente@usmcf.com": "Cliente123!"
  };
  var pw = getPasswords();
  var changed = false;
  for (var email in testPasswords) {
    if (!pw[email]) {
      pw[email] = testPasswords[email];
      changed = true;
    }
  }
  if (changed) savePasswords(pw);

  // --- Query Builder ---
  function QueryBuilder(table) {
    this._table = table;
    this._filters = [];
    this._orderCol = null;
    this._orderAsc = true;
    this._limitN = null;
    this._single = false;
    this._op = null;
  }

  QueryBuilder.prototype.select = function (fields) {
    this._op = "select";
    return this;
  };
  QueryBuilder.prototype.insert = function (data) {
    this._op = "insert";
    this._insertData = data;
    return this;
  };
  QueryBuilder.prototype.update = function (data) {
    this._op = "update";
    this._updateData = data;
    return this;
  };
  QueryBuilder.prototype.delete = function () {
    this._op = "delete";
    return this;
  };
  QueryBuilder.prototype.eq = function (col, val) {
    this._filters.push({ col: col, val: val });
    return this;
  };
  QueryBuilder.prototype.order = function (col, opts) {
    this._orderCol = col;
    this._orderAsc = opts && opts.ascending !== undefined ? opts.ascending : true;
    return this;
  };
  QueryBuilder.prototype.limit = function (n) {
    this._limitN = n;
    return this;
  };
  QueryBuilder.prototype.single = function () {
    this._single = true;
    return this;
  };

  QueryBuilder.prototype._exec = function () {
    var db = getDB();
    var rows = db[this._table] || [];
    var self = this;

    if (this._op === "insert") {
      var item = this._insertData;
      if (!Array.isArray(item)) item = [item];
      item.forEach(function (it) {
        if (!it.id) it.id = uid();
        if (!it.created_at) it.created_at = new Date().toISOString();
        db[self._table].push(it);
      });
      saveDB(db);
      return { data: this._insertData, error: null };
    }

    if (this._op === "update") {
      var updated = [];
      db[this._table] = rows.map(function (r) {
        if (self._filters.every(function (f) { return r[f.col] === f.val; })) {
          var merged = Object.assign({}, r, self._updateData);
          updated.push(merged);
          return merged;
        }
        return r;
      });
      saveDB(db);
      return { data: updated, error: null };
    }

    if (this._op === "delete") {
      var deleted = [];
      var remaining = rows.filter(function (r) {
        var match = self._filters.every(function (f) { return r[f.col] === f.val; });
        if (match) deleted.push(r);
        return !match;
      });
      db[this._table] = remaining;
      saveDB(db);
      return { data: deleted, error: null };
    }

    // SELECT
    var filtered = rows.filter(function (r) {
      return self._filters.every(function (f) { return r[f.col] === f.val; });
    });
    if (this._orderCol) {
      var col = this._orderCol;
      var asc = this._orderAsc;
      filtered.sort(function (a, b) {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }
    if (this._limitN !== null) filtered = filtered.slice(0, this._limitN);
    if (this._single) {
      return { data: filtered[0] || null, error: filtered[0] ? null : { message: "Row not found" } };
    }
    return { data: filtered, error: null };
  };

  QueryBuilder.prototype.then = function (resolve, reject) {
    var self = this;
    return new Promise(function (res) {
      setTimeout(function () { res(self._exec()); }, 30);
    }).then(resolve, reject);
  };

  // --- Local Auth Client ---
  window.LocalSupabase = {
    auth: {
      getSession: async function () {
        var s = getSession();
        return { data: { session: s ? { user: s } : null }, error: null };
      },

      signUp: async function (opts) {
        var db = getDB();
        var email = opts.email.toLowerCase().trim();
        var exists = db.profiles.find(function (p) { return p.email === email; });
        if (exists) {
          return { data: { user: null, session: null }, error: { message: "User already registered" } };
        }
        var meta = (opts.options && opts.options.data) || {};
        var id = uid();
        var profile = {
          id: id, email: email, nombre: meta.nombre || "Sin nombre",
          usuario_roblox: meta.usuario_roblox || "SinUsuario",
          rango: "Soldado", rol: "usuario", estado: "pendiente",
          puntos: 0, dinero: 0, created_at: new Date().toISOString()
        };
        db.profiles.push(profile);
        saveDB(db);

        var passwords = getPasswords();
        passwords[email] = opts.password;
        savePasswords(passwords);

        setSession({ id: id, email: email });
        return { data: { user: { id: id, email: email }, session: { id: id } }, error: null };
      },

      signInWithPassword: async function (opts) {
        var email = opts.email.toLowerCase().trim();
        var passwords = getPasswords();

        if (passwords[email] !== opts.password) {
          return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
        }

        var db = getDB();
        var profile = db.profiles.find(function (p) { return p.email === email; });
        if (!profile) {
          return { data: { user: null, session: null }, error: { message: "Usuario no encontrado." } };
        }

        setSession({ id: profile.id, email: profile.email });
        return { data: { user: { id: profile.id, email: profile.email }, session: { id: profile.id } }, error: null };
      },

      signOut: async function () {
        clearSession();
        return { error: null };
      },

      resetPasswordForEmail: async function (email) {
        var e = email.toLowerCase().trim();
        var passwords = getPasswords();
        passwords[e] = "Reset123!";
        savePasswords(passwords);
        return { data: {}, error: null };
      }
    },

    from: function (table) {
      return new QueryBuilder(table);
    }
  };

})();
