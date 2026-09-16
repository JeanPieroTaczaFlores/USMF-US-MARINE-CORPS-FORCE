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
  var DEMO_CLEANUP_KEY = "usmcf_demo_profiles_removed_v1";

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

  function applyAutoPromotion(profile, db) {
    if (!profile || profile.rol !== "usuario" || profile.estado !== "activo") return null;
    var thresholds = window.RANK_THRESHOLDS || [];
    var eligible = thresholds.filter(function (entry) { return Number(profile.puntos || 0) >= entry.puntos; }).slice(-1)[0];
    if (!eligible) return null;
    var currentIndex = thresholds.map(function (entry) { return entry.rango; }).indexOf(profile.rango);
    var targetIndex = thresholds.map(function (entry) { return entry.rango; }).indexOf(eligible.rango);
    if (targetIndex <= currentIndex) return null;
    var previousRank = profile.rango;
    profile.rango = eligible.rango;
    var event = { id: uid(), tipo: "rank_promoted", titulo: "Ascenso automático", mensaje: profile.nombre + " ascendió de " + previousRank + " a " + eligible.rango + " al alcanzar " + profile.puntos + " puntos.", mission_id: null, user_id: profile.id, estado: "pendiente", created_at: new Date().toISOString() };
    db.discord_events.push(event);
    return event;
  }

  function getDB() {
    var db;
    try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { db = null; }
    if (!db || !db.profiles) db = initDB();
    // Auto-reparar tablas faltantes
    var defaults = { missions: [], mission_participants: [], training_assignments: [], specialty_applications: [], specialty_training_requests: [], support_tickets: [], support_ticket_comments: [], discord_invites: [], faction_members: [], transactions: [], opinions: [], notifications: [], discord_events: [], shop_items: [], user_inventory: [], orders: [], order_items: [] };
    for (var key in defaults) {
      if (!db[key]) db[key] = defaults[key];
    }
    cleanupDemoPersonnel(db);
    ensureTestAccounts(db);
    if (db.missions_participants && db.missions_participants.length) {
      db.mission_participants = db.mission_participants.concat(db.missions_participants.filter(function (legacy) {
        return !db.mission_participants.some(function (current) { return current.id === legacy.id; });
      }));
      delete db.missions_participants;
    }
    // Auto-reparar campo last_login
    db.profiles.forEach(function (p) {
      if (!p.last_login) p.last_login = p.created_at || new Date().toISOString();
      if (p.ultimo_salario === undefined) p.ultimo_salario = null;
      if (!p.callsign) p.callsign = p.usuario_roblox || String(p.nombre || "Marine").split(/\s+/)[0];
    });
    db.missions.forEach(function (mission) {
      if (!Array.isArray(mission.required_equipment)) mission.required_equipment = ["Uniforme MCCUU", "Chaleco medio", "M4A1 con silenciador"];
      if (mission.private_server_url === undefined) mission.private_server_url = "https://www.roblox.com/share?code=USMCF-DEMO&type=Server";
    });
    if (!db.shop_items.length) seedShop(db);
    db.profiles.forEach(function (profile) { applyAutoPromotion(profile, db); });
    saveDB(db);
    return db;
  }

  function initDB() {
    var db = {
      profiles: [],
      missions: [],
      mission_participants: [],
      training_assignments: [],
      specialty_applications: [],
      specialty_training_requests: [],
      support_tickets: [],
      support_ticket_comments: [],
      discord_invites: [],
      faction_members: [],
      transactions: [],
      opinions: [],
      notifications: [],
      discord_events: [],
      shop_items: [],
      user_inventory: [],
      orders: [],
      order_items: []
    };

    var now = new Date().toISOString();
    var adminId = uid();

    db.profiles.push({
      id: adminId, email: "admin@usmcf.com", nombre: "Comandante USMCF", callsign: "Comando",
      usuario_roblox: "AdminUSMCF", discord_id: null, rango: "General", rol: "super_admin",
      estado: "activo", puntos: 10000, dinero: 50000,
      last_login: now, created_at: now
    });

    db.missions.push(
      {
        id: uid(), titulo: "Patrulla Fronteriza Norte",
        descripcion: "Operación de patrullaje en la zona norte.",
        fecha: new Date(Date.now() + 2 * 86400000).toISOString(),
        recompensa_puntos: 150, recompensa_dinero: 300,
        required_equipment: ["Uniforme MCCUU", "Chaleco medio", "M4A1 con silenciador"], private_server_url: "https://www.roblox.com/share?code=USMCF-PATRULLA&type=Server",
        estado: "programada", created_by: adminId
      },
      {
        id: uid(), titulo: "Entrenamiento Básico TRS",
        descripcion: "Sesión de entrenamiento para nuevos reclutas.",
        fecha: new Date(Date.now() + 86400000).toISOString(),
        recompensa_puntos: 80, recompensa_dinero: 120,
        required_equipment: ["Uniforme MCCUU", "M4A1", "Radio"], private_server_url: "https://www.roblox.com/share?code=USMCF-TRS&type=Server",
        estado: "activa", created_by: adminId
      },
      {
        id: uid(), titulo: "Asalto a Base Enemiga",
        descripcion: "Operación ofensiva de alto riesgo.",
        fecha: new Date(Date.now() + 5 * 86400000).toISOString(),
        recompensa_puntos: 300, recompensa_dinero: 500,
        required_equipment: ["Uniforme MCCUU", "Chaleco medio", "Casco coyote", "M4A1 con silenciador"], private_server_url: "https://www.roblox.com/share?code=USMCF-ASALTO&type=Server",
        estado: "programada", created_by: adminId
      }
    );

    seedShop(db);

    saveDB(db);
    return db;
  }

  function seedShop(db) {
    var items = [
      { nombre: "Parche de unidad USMCF", descripcion: "Parche cosmético oficial para el uniforme autorizado.", tipo: "uniforme", precio_dinero: 120, precio_puntos: 0, stock: -1 },
      { nombre: "Insignia de especialidad", descripcion: "Insignia cosmética para miembros con especialidad aprobada.", tipo: "insignia", precio_dinero: 180, precio_puntos: 0, stock: -1 },
      { nombre: "Kit visual de operador", descripcion: "Conjunto cosmético sujeto a las normas de equipamiento de la unidad.", tipo: "equipo", precio_dinero: 300, precio_puntos: 0, stock: 20 },
      { nombre: "Placa conmemorativa", descripcion: "Reconocimiento digital para el perfil del miembro.", tipo: "reconocimiento", precio_dinero: 0, precio_puntos: 250, stock: -1 }
    ];
    items.forEach(function (item) {
      db.shop_items.push(Object.assign({ id: uid(), disponible: true, imagen_url: "", created_at: new Date().toISOString() }, item));
    });
  }

  function cleanupDemoPersonnel(db) {
    if (localStorage.getItem(DEMO_CLEANUP_KEY)) return;
    var demoEmails = ["staff@usmcf.com", "cliente@usmcf.com", "diego.salazar@usmcf.com", "mateo.ruiz@usmcf.com", "lucia.vega@usmcf.com", "tomas.leon@usmcf.com", "valeria.cruz@usmcf.com", "reyes.staff@usmcf.com", "torres.staff@usmcf.com"];
    var demoNames = ["Recluta Test", "Marine Entrenamiento", "Cabo Diego Salazar", "Soldado Mateo Ruiz", "Soldado Lucía Vega", "Recluta Tomás León", "Recluta Valeria Cruz", "Instructor Reyes", "Sargento Ana Torres", "Sargento Mayor"];
    var removedIds = db.profiles.filter(function (profile) {
      return demoEmails.indexOf(String(profile.email || "").toLowerCase()) !== -1 || demoNames.indexOf(profile.nombre) !== -1;
    }).map(function (profile) { return String(profile.id); });
    if (removedIds.length) {
      var removedOrderIds = db.orders.filter(function (row) { return removedIds.indexOf(String(row.user_id)) !== -1; }).map(function (row) { return String(row.id); });
      db.profiles = db.profiles.filter(function (row) { return removedIds.indexOf(String(row.id)) === -1; });
      ["transactions", "user_inventory", "mission_participants", "training_assignments", "specialty_applications", "discord_events"].forEach(function (table) {
        db[table] = (db[table] || []).filter(function (row) { return removedIds.indexOf(String(row.user_id)) === -1; });
      });
      db.orders = db.orders.filter(function (row) { return removedIds.indexOf(String(row.user_id)) === -1; });
      db.order_items = db.order_items.filter(function (row) { return removedOrderIds.indexOf(String(row.order_id)) === -1; });
      db.faction_members.forEach(function (row) { if (removedIds.indexOf(String(row.profile_id)) !== -1) row.profile_id = null; });
      var session = getSession();
      if (session && removedIds.indexOf(String(session.id)) !== -1) clearSession();
    }
    var passwords = getPasswords();
    Object.keys(passwords).forEach(function (email) { if (email !== "admin@usmcf.com") delete passwords[email]; });
    savePasswords(passwords);
    localStorage.setItem(DEMO_CLEANUP_KEY, "true");
  }

  function ensureTestAccounts(db) {
    var now = new Date().toISOString();
    var accounts = [
      {
        email: "admin@usmcf.com", nombre: "Comandante USMCF", callsign: "Comando",
        usuario_roblox: "AdminUSMCF", rango: "General", rol: "super_admin",
        estado: "activo", puntos: 10000, dinero: 50000
      },
      {
        email: "staff@usmcf.com", nombre: "Instructor USMCF", callsign: "Instructor",
        usuario_roblox: "StaffUSMCF", rango: "Sargento del Estado Mayor", rol: "staff",
        estado: "activo", puntos: 1800, dinero: 3500
      },
      {
        email: "soldado@usmcf.com", nombre: "Soldado de Prueba", callsign: "Narumi",
        usuario_roblox: "SoldadoUSMCF", rango: "Soldado", rol: "usuario",
        estado: "activo", puntos: 100, dinero: 720
      }
    ];

    accounts.forEach(function (account) {
      var profile = db.profiles.find(function (row) { return String(row.email || "").toLowerCase() === account.email; });
      if (!profile) {
        db.profiles.push(Object.assign({ id: uid(), discord_id: null, ultimo_salario: null, last_login: now, created_at: now }, account));
      }
    });
  }

  // Estas credenciales existen únicamente en el adaptador local de demostración.
  var testPasswords = {
    "admin@usmcf.com": "Admin123!",
    "staff@usmcf.com": "Staff123!",
    "soldado@usmcf.com": "Soldado123!"
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
        if (!/^[^@\s]+@usmcf\.com$/i.test(email)) return { data: { user: null, session: null }, error: { message: "Solo se aceptan correos institucionales @usmcf.com." } };
        var exists = db.profiles.find(function (p) { return p.email === email; });
        if (exists) {
          return { data: { user: null, session: null }, error: { message: "User already registered" } };
        }
        var meta = (opts.options && opts.options.data) || {};
        var id = uid();
        var profile = {
          id: id, email: email, nombre: meta.nombre || "Sin nombre",
          usuario_roblox: meta.usuario_roblox || "SinUsuario", callsign: meta.callsign || meta.usuario_roblox || "Marine",
          rango: "Recluta", rol: "usuario", estado: "pendiente",
          puntos: 0, dinero: 0, last_login: new Date().toISOString(), created_at: new Date().toISOString()
        };
        db.profiles.push(profile);
        var assignment = { id: uid(), user_id: id, trainer_id: null, estado: "asignado", assigned_at: new Date().toISOString(), started_at: null, completed_at: null };
        db.training_assignments.push(assignment);
        db.discord_events.push({ id: uid(), tipo: "training_assigned", titulo: "Nuevo recluta", mensaje: profile.nombre + " recibió el Entrenamiento Básico TRS.", mission_id: null, user_id: profile.id, estado: "pendiente", created_at: new Date().toISOString() });
        saveDB(db);

        var passwords = getPasswords();
        passwords[email] = opts.password;
        savePasswords(passwords);

        setSession({ id: id, email: email });
        return { data: { user: { id: id, email: email }, session: { id: id } }, error: null };
      },

      signInWithPassword: async function (opts) {
        var email = opts.email.toLowerCase().trim();
        if (!/^[^@\s]+@usmcf\.com$/i.test(email)) return { data: { user: null, session: null }, error: { message: "Debes ingresar con tu correo oficial @usmcf.com." } };
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
      },

      signInWithOAuth: async function () {
        return { data: null, error: { message: "Discord estará disponible al conectar Supabase." } };
      },

      linkIdentity: async function () {
        return { data: null, error: { message: "La vinculación real con Discord requiere Supabase." } };
      }
    },

    from: function (table) {
      return new QueryBuilder(table);
    },

    functions: {
      invoke: async function (name, opts) {
        var db = getDB();
        var body = (opts && opts.body) || {};
        if (name === "discord-mission-alert") {
          var event = db.discord_events.find(function (row) { return String(row.id) === String(body.event_id); });
          if (!event) return { data: null, error: { message: "Alerta no encontrada." } };
          event.estado = "simulado";
          event.sent_at = new Date().toISOString();
          saveDB(db);
          return { data: { delivered: true, local: true }, error: null };
        }
        if (name === "discord-role-sync") {
          var syncedProfile = db.profiles.find(function (row) { return String(row.id) === String(body.user_id); });
          if (!syncedProfile) return { data: null, error: { message: "Usuario no encontrado." } };
          return { data: { synced: true, local: true, role: syncedProfile.estado === "pendiente" ? "Recluta" : syncedProfile.rol }, error: null };
        }
        if (name === "admin-users") {
          var session = getSession();
          var actor = session && db.profiles.find(function (row) { return String(row.id) === String(session.id); });
          if (!actor || ["admin", "super_admin"].indexOf(actor.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Administración." } };
          if (body.action === "create") {
            var email = String(body.email || "").toLowerCase().trim();
            if (!/^[^@\s]+@usmcf\.com$/i.test(email)) return { data: null, error: { message: "Solo se aceptan correos institucionales @usmcf.com." } };
            if (db.profiles.some(function (row) { return row.email === email; })) return { data: null, error: { message: "Ese correo ya tiene una cuenta." } };
            var newId = uid();
            var now = new Date().toISOString();
            var newProfile = { id: newId, email: email, nombre: body.nombre || "Sin nombre", usuario_roblox: body.usuario_roblox || "SinUsuario", callsign: body.callsign || body.usuario_roblox || "Marine", rango: "Recluta", rol: body.rol || "usuario", estado: "pendiente", puntos: 0, dinero: 0, last_login: now, created_at: now };
            db.profiles.push(newProfile);
            db.training_assignments.push({ id: uid(), user_id: newId, trainer_id: null, estado: "asignado", assigned_at: now, started_at: null, completed_at: null });
            var createEvent = { id: uid(), tipo: "training_assigned", titulo: "Nuevo recluta", mensaje: newProfile.nombre + " recibió el Entrenamiento Básico TRS.", mission_id: null, user_id: newId, estado: "pendiente", created_at: now };
            db.discord_events.push(createEvent);
            var passwords = getPasswords();
            passwords[email] = body.password;
            savePasswords(passwords);
            saveDB(db);
            return { data: { user_id: newId, event_id: createEvent.id }, error: null };
          }
          if (body.action === "update") {
            var targetProfile = db.profiles.find(function (row) { return String(row.id) === String(body.user_id); });
            if (!targetProfile) return { data: null, error: { message: "Usuario no encontrado." } };
            if (body.email !== undefined && !/^[^@\s]+@usmcf\.com$/i.test(String(body.email).trim())) return { data: null, error: { message: "Solo se aceptan correos institucionales @usmcf.com." } };
            var oldEmail = targetProfile.email;
            ["nombre", "callsign", "usuario_roblox", "email", "rol", "estado", "rango"].forEach(function (field) { if (body[field] !== undefined) targetProfile[field] = body[field]; });
            if (oldEmail !== targetProfile.email) {
              var storedPasswords = getPasswords();
              storedPasswords[targetProfile.email] = storedPasswords[oldEmail];
              delete storedPasswords[oldEmail];
              savePasswords(storedPasswords);
            }
            saveDB(db);
            return { data: { updated: true }, error: null };
          }
          if (body.action === "reset_password") {
            var passwordTarget = db.profiles.find(function (row) { return String(row.id) === String(body.user_id); });
            if (!passwordTarget) return { data: null, error: { message: "Usuario no encontrado." } };
            if (String(body.password || "").length < 8) return { data: null, error: { message: "La contraseña debe tener al menos 8 caracteres." } };
            var passwordStore = getPasswords();
            passwordStore[passwordTarget.email] = String(body.password);
            savePasswords(passwordStore);
            return { data: { password_updated: true }, error: null };
          }
        }
        return { data: null, error: { message: "Función local no disponible." } };
      }
    },

    rpc: async function (name, args) {
      var db = getDB();
      var session = getSession();
      if (!session) return { data: null, error: { message: "Debes iniciar sesión." } };
      var profile = db.profiles.find(function (p) { return p.id === session.id; });
      if (!profile) return { data: null, error: { message: "Perfil no encontrado." } };

      if (name === "record_platform_login") {
        var loginTime = new Date().toISOString();
        profile.last_login = loginTime;
        var loginEvent = { id: uid(), tipo: "platform_login", titulo: "Ingreso a la plataforma", mensaje: profile.nombre + " (" + profile.usuario_roblox + ") ingresó a la Plataforma USMCF.", mission_id: null, user_id: profile.id, estado: "pendiente", created_at: loginTime };
        db.discord_events.push(loginEvent);
        saveDB(db);
        return { data: { event_id: loginEvent.id }, error: null };
      }

      if (name === "sync_my_discord_identity") {
        return { data: { linked: Boolean(profile.discord_id), discord_id: profile.discord_id || null }, error: null };
      }

      if (name === "pay_my_salary") {
        if (["admin", "super_admin"].indexOf(profile.rol) !== -1) return { data: { paid: false, unlimited: true, amount: 0, next_at: null }, error: null };
        var salary = (window.RANGOS || []).find(function (r) { return r.rango === profile.rango; });
        var amount = salary ? salary.salario : 0;
        var last = profile.ultimo_salario ? new Date(profile.ultimo_salario) : null;
        if (last && (Date.now() - last.getTime()) < 7 * 86400000) {
          return { data: { paid: false, amount: 0, next_at: new Date(last.getTime() + 7 * 86400000).toISOString() }, error: null };
        }
        profile.dinero += amount;
        profile.ultimo_salario = new Date().toISOString();
        db.transactions.push({ id: uid(), user_id: profile.id, tipo: "salario", descripcion: "Salario semanal — " + profile.rango, monto_dinero: amount, monto_puntos: 0, created_at: new Date().toISOString() });
        saveDB(db);
        return { data: { paid: true, amount: amount, next_at: new Date(Date.now() + 7 * 86400000).toISOString() }, error: null };
      }

      if (name === "join_mission") {
        var missionId = args && args.p_mission_id;
        var mission = db.missions.find(function (row) { return String(row.id) === String(missionId); });
        if (!mission || ["programada", "activa"].indexOf(mission.estado) === -1) return { data: null, error: { message: "La misión no admite nuevas inscripciones." } };
        if (profile.estado !== "activo") return { data: null, error: { message: "Tu cuenta debe estar activa para unirte." } };
        var duplicate = db.mission_participants.find(function (row) { return String(row.mission_id) === String(missionId) && String(row.user_id) === String(profile.id); });
        if (duplicate) return { data: null, error: { message: "Ya estás inscrito en esta misión." } };
        var participant = { id: uid(), mission_id: mission.id, user_id: profile.id, estado: mission.estado === "activa" ? "en_mision" : "inscrito", joined_at: new Date().toISOString(), reviewed_at: null, reviewed_by: null, rewarded_at: null };
        db.mission_participants.push(participant);
        var joinEvent = { id: uid(), tipo: "mission_join", titulo: "Marine en misión", mensaje: profile.nombre + " se unió a " + mission.titulo + (mission.estado === "activa" ? " y está EN MISIÓN." : "."), mission_id: mission.id, user_id: profile.id, estado: "pendiente", created_at: new Date().toISOString() };
        db.discord_events.push(joinEvent);
        saveDB(db);
        return { data: { participant_id: participant.id, event_id: joinEvent.id }, error: null };
      }

      if (name === "save_mission") {
        if (["staff", "admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Staff y Administración." } };
        var missionPayload = {
          titulo: String(args.p_title || "").trim(), descripcion: String(args.p_description || "").trim(), fecha: args.p_date,
          recompensa_puntos: Math.max(0, Number(args.p_reward_points || 0)), recompensa_dinero: Math.max(0, Number(args.p_reward_money || 0)),
          estado: args.p_status || "programada", private_server_url: String(args.p_private_server_url || ""),
          required_equipment: Array.isArray(args.p_required_equipment) ? args.p_required_equipment.filter(Boolean) : []
        };
        if (!missionPayload.titulo || !missionPayload.fecha || !missionPayload.required_equipment.length) return { data: null, error: { message: "Completa los datos y el equipamiento de la misión." } };
        var savedMission = args.p_mission_id ? db.missions.find(function (row) { return String(row.id) === String(args.p_mission_id); }) : null;
        var creating = !savedMission;
        if (creating) { savedMission = Object.assign({ id: uid(), created_by: profile.id, created_at: new Date().toISOString() }, missionPayload); db.missions.push(savedMission); }
        else Object.assign(savedMission, missionPayload);
        var missionEvent = { id: uid(), tipo: creating ? "mission_published" : "mission_updated", titulo: (creating ? "Nueva misión: " : "Misión actualizada: ") + savedMission.titulo, mensaje: savedMission.descripcion + "\nFecha: " + new Date(savedMission.fecha).toLocaleString("es-CO") + "\nRecompensa: " + savedMission.recompensa_puntos + " pts · USD " + savedMission.recompensa_dinero + "\nEquipamiento: " + savedMission.required_equipment.join(", ") + "\nServidor privado: " + savedMission.private_server_url, mission_id: savedMission.id, user_id: profile.id, estado: "pendiente", created_at: new Date().toISOString() };
        db.discord_events.push(missionEvent);
        saveDB(db);
        return { data: { mission_id: savedMission.id, event_id: missionEvent.id }, error: null };
      }

      if (name === "leave_mission") {
        var leaveMissionId = args && args.p_mission_id;
        var leaveMission = db.missions.find(function (row) { return String(row.id) === String(leaveMissionId); });
        if (!leaveMission || leaveMission.estado !== "programada") return { data: null, error: { message: "Solo puedes cancelar antes de que inicie la misión." } };
        db.mission_participants = db.mission_participants.filter(function (row) { return !(String(row.mission_id) === String(leaveMissionId) && String(row.user_id) === String(profile.id)); });
        saveDB(db);
        return { data: { left: true }, error: null };
      }

      if (name === "start_mission") {
        if (["staff", "admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Staff y Administración." } };
        var startMissionId = args && args.p_mission_id;
        var startMission = db.missions.find(function (row) { return String(row.id) === String(startMissionId); });
        if (!startMission || startMission.estado !== "programada") return { data: null, error: { message: "La misión no puede lanzarse en su estado actual." } };
        startMission.estado = "activa";
        startMission.started_at = new Date().toISOString();
        var eventIds = [];
        db.mission_participants.filter(function (row) { return String(row.mission_id) === String(startMission.id); }).forEach(function (participantRow) {
          participantRow.estado = "en_mision";
          var member = db.profiles.find(function (row) { return String(row.id) === String(participantRow.user_id); });
          var startEvent = { id: uid(), tipo: "mission_started", titulo: "Despliegue iniciado", mensaje: (member ? member.nombre : "Miembro USMCF") + " está EN MISIÓN: " + startMission.titulo + ".", mission_id: startMission.id, user_id: participantRow.user_id, estado: "pendiente", created_at: new Date().toISOString() };
          db.discord_events.push(startEvent);
          eventIds.push(startEvent.id);
        });
        saveDB(db);
        return { data: { event_ids: eventIds }, error: null };
      }

      if (name === "review_mission_participant") {
        if (["staff", "admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Staff y Administración." } };
        var reviewStatus = args && args.p_status;
        if (["confirmado", "ausente"].indexOf(reviewStatus) === -1) return { data: null, error: { message: "Estado de asistencia inválido." } };
        var reviewed = db.mission_participants.find(function (row) { return String(row.id) === String(args.p_participant_id); });
        if (!reviewed) return { data: null, error: { message: "Participante no encontrado." } };
        reviewed.estado = reviewStatus;
        reviewed.reviewed_at = new Date().toISOString();
        reviewed.reviewed_by = profile.id;
        saveDB(db);
        return { data: { reviewed: true }, error: null };
      }

      if (name === "finish_mission") {
        if (["staff", "admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Staff y Administración." } };
        var finishMissionId = args && args.p_mission_id;
        var finishMission = db.missions.find(function (row) { return String(row.id) === String(finishMissionId); });
        if (!finishMission || finishMission.estado !== "activa") return { data: null, error: { message: "Solo se puede terminar una misión activa." } };
        var missionParticipants = db.mission_participants.filter(function (row) { return String(row.mission_id) === String(finishMission.id); });
        if (!missionParticipants.length) return { data: null, error: { message: "La misión no tiene participantes." } };
        if (missionParticipants.some(function (row) { return ["confirmado", "ausente"].indexOf(row.estado) === -1; })) return { data: null, error: { message: "Debes corroborar a todos los participantes antes de terminar." } };
        missionParticipants.filter(function (row) { return row.estado === "confirmado" && !row.rewarded_at; }).forEach(function (row) {
          var rewardedProfile = db.profiles.find(function (candidate) { return String(candidate.id) === String(row.user_id); });
          if (!rewardedProfile) return;
          rewardedProfile.puntos += Number(finishMission.recompensa_puntos || 0);
          applyAutoPromotion(rewardedProfile, db);
          rewardedProfile.dinero += Number(finishMission.recompensa_dinero || 0);
          row.rewarded_at = new Date().toISOString();
          db.transactions.push({ id: uid(), user_id: rewardedProfile.id, tipo: "mision", descripcion: "Misión completada: " + finishMission.titulo, monto_puntos: Number(finishMission.recompensa_puntos || 0), monto_dinero: Number(finishMission.recompensa_dinero || 0), created_at: new Date().toISOString() });
        });
        finishMission.estado = "finalizada";
        finishMission.finalizada_at = new Date().toISOString();
        saveDB(db);
        return { data: { finished: true }, error: null };
      }

      if (name === "take_training") {
        if (["staff", "admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Staff y Administración." } };
        var assignment = db.training_assignments.find(function (row) { return String(row.id) === String(args.p_assignment_id); });
        if (!assignment || assignment.estado !== "asignado") return { data: null, error: { message: "El entrenamiento ya fue tomado o finalizado." } };
        assignment.trainer_id = profile.id;
        assignment.estado = "en_curso";
        assignment.started_at = new Date().toISOString();
        var recruit = db.profiles.find(function (row) { return String(row.id) === String(assignment.user_id); });
        var trainingStartEvent = { id: uid(), tipo: "training_started", titulo: "Entrenamiento iniciado", mensaje: profile.nombre + " inició el Entrenamiento Básico TRS de " + (recruit ? recruit.nombre : "un recluta") + ".", mission_id: null, user_id: assignment.user_id, estado: "pendiente", created_at: new Date().toISOString() };
        db.discord_events.push(trainingStartEvent);
        saveDB(db);
        return { data: { event_id: trainingStartEvent.id }, error: null };
      }

      if (name === "finish_training") {
        if (["staff", "admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Staff y Administración." } };
        var finishedAssignment = db.training_assignments.find(function (row) { return String(row.id) === String(args.p_assignment_id); });
        if (!finishedAssignment || finishedAssignment.estado !== "en_curso") return { data: null, error: { message: "El entrenamiento no está en curso." } };
        if (String(finishedAssignment.trainer_id) !== String(profile.id) && ["admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Solo el instructor responsable o un administrador puede finalizarlo." } };
        var graduated = db.profiles.find(function (row) { return String(row.id) === String(finishedAssignment.user_id); });
        if (!graduated) return { data: null, error: { message: "Recluta no encontrado." } };
        graduated.rango = "Soldado";
        graduated.estado = "activo";
        finishedAssignment.estado = "finalizado";
        finishedAssignment.completed_at = new Date().toISOString();
        var trainingFinishEvent = { id: uid(), tipo: "training_completed", titulo: "Entrenamiento finalizado", mensaje: graduated.nombre + " completó el TRS y recibió el rango SOLDADO.", mission_id: null, user_id: graduated.id, estado: "pendiente", created_at: new Date().toISOString() };
        db.discord_events.push(trainingFinishEvent);
        saveDB(db);
        return { data: { event_id: trainingFinishEvent.id, rank: "Soldado" }, error: null };
      }

      if (name === "adjust_member_balance") {
        if (["staff", "admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Staff y Administración." } };
        var target = db.profiles.find(function (row) { return String(row.id) === String(args.p_user_id); });
        if (!target) return { data: null, error: { message: "Miembro no encontrado." } };
        var pointsDelta = Number(args.p_points || 0);
        var moneyDelta = Number(args.p_money || 0);
        if (target.puntos + pointsDelta < 0 || target.dinero + moneyDelta < 0) return { data: null, error: { message: "El ajuste dejaría un saldo negativo." } };
        target.puntos += pointsDelta;
        target.dinero += moneyDelta;
        var promotionEvent = applyAutoPromotion(target, db);
        db.transactions.push({ id: uid(), user_id: target.id, tipo: "ajuste_mando", descripcion: args.p_reason || "Ajuste manual de mando", monto_puntos: pointsDelta, monto_dinero: moneyDelta, created_at: new Date().toISOString() });
        var pointsEvent = { id: uid(), tipo: "points_adjusted", titulo: "Actualización de puntos", mensaje: profile.nombre + " ajustó a " + target.nombre + ": " + (pointsDelta >= 0 ? "+" : "") + pointsDelta + " puntos y " + (moneyDelta >= 0 ? "+" : "") + moneyDelta + " de saldo.", mission_id: null, user_id: target.id, estado: "pendiente", created_at: new Date().toISOString() };
        db.discord_events.push(pointsEvent);
        saveDB(db);
        return { data: { points: target.puntos, money: target.dinero, event_id: pointsEvent.id, promotion_event_id: promotionEvent && promotionEvent.id }, error: null };
      }

      if (name === "publish_announcement") {
        if (["admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Administración." } };
        var announcementTitle = String(args && args.p_title || "").trim();
        var announcementMessage = String(args && args.p_message || "").trim();
        if (!announcementTitle || !announcementMessage) return { data: null, error: { message: "Título y mensaje son obligatorios." } };
        var announcementEvent = { id: uid(), tipo: "announcement_published", titulo: announcementTitle.slice(0, 120), mensaje: announcementMessage.slice(0, 1800), kind: String(args && args.p_kind || "general"), mission_id: null, user_id: profile.id, estado: "pendiente", created_at: new Date().toISOString() };
        db.discord_events.push(announcementEvent);
        saveDB(db);
        return { data: { event_id: announcementEvent.id }, error: null };
      }

      if (name === "request_specialty_training") {
        if (profile.rol !== "usuario" || profile.estado !== "activo") return { data: null, error: { message: "Debes ser un miembro activo para solicitar cursos." } };
        var specialtyKey = String(args && args.p_specialty_key || "");
        var requirements = { raider: 100, radio: 250, medico: 250, tirador_ligero: 300, tirador_pesado: 400, machine_gunner: 300, combat_engineer: 300, conductor: 120, artillero: 120 };
        if (requirements[specialtyKey] === undefined || Number(profile.puntos || 0) < requirements[specialtyKey]) return { data: null, error: { message: "No cumples los puntos requeridos para este curso." } };
        var existingTraining = db.specialty_training_requests.find(function (row) { return String(row.user_id) === String(profile.id) && row.specialty_key === specialtyKey && ["pendiente", "asignado", "en_curso"].indexOf(row.estado) !== -1; });
        if (existingTraining) return { data: null, error: { message: "Ya tienes una solicitud activa para esta especialidad." } };
        var trainingRequest = { id: uid(), user_id: profile.id, specialty_key: specialtyKey, notes: String(args.p_notes || "").slice(0, 500), estado: "pendiente", trainer_id: null, created_at: new Date().toISOString(), started_at: null, completed_at: null, reviewed_at: null };
        db.specialty_training_requests.push(trainingRequest);
        var requestEvent = { id: uid(), tipo: "specialty_training_requested", titulo: "Nuevo entrenamiento solicitado", mensaje: "@" + profile.callsign + " solicitó el curso " + specialtyKey + " con " + profile.puntos + " puntos.", mission_id: null, user_id: profile.id, estado: "pendiente", created_at: new Date().toISOString() };
        db.discord_events.push(requestEvent);
        saveDB(db);
        return { data: { request_id: trainingRequest.id, event_id: requestEvent.id }, error: null };
      }

      if (name === "admin_set_specialty") {
        if (["admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Administración." } };
        var managedUserId = args && args.p_user_id;
        var managedKey = String(args && args.p_specialty_key || "");
        var enabled = Boolean(args && args.p_enabled);
        var managedProfile = db.profiles.find(function (row) { return String(row.id) === String(managedUserId); });
        if (!managedProfile) return { data: null, error: { message: "Miembro no encontrado." } };
        var managedSpecialty = db.specialty_applications.find(function (row) { return String(row.user_id) === String(managedUserId) && row.role_key === managedKey; });
        if (enabled) {
          if (managedSpecialty) { managedSpecialty.estado = "aprobada"; managedSpecialty.reviewed_by = profile.id; managedSpecialty.reviewed_at = new Date().toISOString(); }
          else db.specialty_applications.push({ id: uid(), user_id: managedUserId, role_key: managedKey, estado: "aprobada", created_at: new Date().toISOString(), reviewed_at: new Date().toISOString(), reviewed_by: profile.id });
        } else {
          db.specialty_applications = db.specialty_applications.filter(function (row) { return !(String(row.user_id) === String(managedUserId) && row.role_key === managedKey); });
        }
        var managedEvent = { id: uid(), tipo: enabled ? "specialty_approved" : "specialty_revoked", titulo: enabled ? "Especialidad otorgada" : "Especialidad retirada", mensaje: profile.nombre + (enabled ? " otorgó " : " retiró ") + managedKey + " a " + managedProfile.nombre + ".", mission_id: null, user_id: managedUserId, estado: "pendiente", created_at: new Date().toISOString() };
        db.discord_events.push(managedEvent);
        saveDB(db);
        return { data: { event_id: managedEvent.id }, error: null };
      }

      if (name === "review_specialty_training") {
        if (["staff", "admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Staff y Administración." } };
        var requestedTraining = db.specialty_training_requests.find(function (row) { return String(row.id) === String(args.p_request_id); });
        if (!requestedTraining) return { data: null, error: { message: "Solicitud no encontrada." } };
        var courseAction = String(args.p_action || "");
        if (courseAction === "tomar" && requestedTraining.estado === "pendiente") {
          requestedTraining.estado = "en_curso"; requestedTraining.trainer_id = profile.id; requestedTraining.started_at = new Date().toISOString();
        } else if (courseAction === "finalizar" && requestedTraining.estado === "en_curso") {
          if (String(requestedTraining.trainer_id) !== String(profile.id) && ["admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Solo el instructor responsable o un administrador puede finalizarlo." } };
          requestedTraining.estado = "finalizado"; requestedTraining.completed_at = new Date().toISOString(); requestedTraining.reviewed_at = new Date().toISOString();
          var existingRole = db.specialty_applications.find(function (row) { return String(row.user_id) === String(requestedTraining.user_id) && row.role_key === requestedTraining.specialty_key; });
          if (existingRole) { existingRole.estado = "aprobada"; existingRole.reviewed_at = new Date().toISOString(); existingRole.reviewed_by = profile.id; }
          else db.specialty_applications.push({ id: uid(), user_id: requestedTraining.user_id, role_key: requestedTraining.specialty_key, estado: "aprobada", created_at: requestedTraining.created_at, reviewed_at: new Date().toISOString(), reviewed_by: profile.id });
        } else if (courseAction === "rechazar" && ["pendiente", "en_curso"].indexOf(requestedTraining.estado) !== -1) {
          requestedTraining.estado = "rechazada"; requestedTraining.reviewed_at = new Date().toISOString();
        } else return { data: null, error: { message: "La solicitud no permite esa acción." } };
        var courseEvent = { id: uid(), tipo: courseAction === "finalizar" ? "specialty_approved" : "specialty_training_" + courseAction, titulo: courseAction === "finalizar" ? "Especialidad concedida" : "Actualización de entrenamiento", mensaje: profile.nombre + " actualizó el curso " + requestedTraining.specialty_key + " a " + requestedTraining.estado + ".", mission_id: null, user_id: requestedTraining.user_id, estado: "pendiente", created_at: new Date().toISOString() };
        db.discord_events.push(courseEvent);
        saveDB(db);
        return { data: { event_id: courseEvent.id, user_id: requestedTraining.user_id }, error: null };
      }

      if (name === "create_support_ticket") {
        var ticketType = String(args && args.p_type || "soporte");
        var ticketSubject = String(args && args.p_subject || "").trim();
        var ticketBody = String(args && args.p_body || "").trim();
        if (!ticketSubject || !ticketBody) return { data: null, error: { message: "Asunto y detalle son obligatorios." } };
        var ticketNow = new Date().toISOString();
        var ticket = { id: uid(), user_id: profile.id, tipo: ticketType, asunto: ticketSubject.slice(0, 120), detalle: ticketBody.slice(0, 1800), estado: "abierto", assigned_to: null, created_at: ticketNow, updated_at: ticketNow, closed_at: null, reminded_at: null };
        db.support_tickets.push(ticket);
        var ticketEvent = { id: uid(), tipo: "ticket_created", titulo: "Nuevo ticket: " + ticket.asunto, mensaje: "@" + profile.callsign + " abrió un ticket de " + ticket.tipo + ".\n" + ticket.detalle, mission_id: null, user_id: profile.id, estado: "pendiente", created_at: ticketNow };
        db.discord_events.push(ticketEvent);
        saveDB(db);
        return { data: { ticket_id: ticket.id, event_id: ticketEvent.id }, error: null };
      }

      if (name === "comment_support_ticket") {
        var ticketForComment = db.support_tickets.find(function (row) { return String(row.id) === String(args.p_ticket_id); });
        if (!ticketForComment) return { data: null, error: { message: "Ticket no encontrado." } };
        if (String(ticketForComment.user_id) !== String(profile.id) && ["staff", "admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "No puedes comentar en este ticket." } };
        var commentText = String(args.p_message || "").trim();
        if (!commentText) return { data: null, error: { message: "El comentario está vacío." } };
        var commentNow = new Date().toISOString();
        db.support_ticket_comments.push({ id: uid(), ticket_id: ticketForComment.id, author_id: profile.id, author_name: profile.callsign || profile.nombre, message: commentText.slice(0, 1000), created_at: commentNow });
        ticketForComment.updated_at = commentNow;
        if (["staff", "admin", "super_admin"].indexOf(profile.rol) !== -1 && ticketForComment.estado === "abierto") ticketForComment.estado = "en_revision";
        var commentEvent = { id: uid(), tipo: "ticket_commented", titulo: "Respuesta en ticket: " + ticketForComment.asunto, mensaje: "@" + profile.callsign + ": " + commentText.slice(0, 900), mission_id: null, user_id: ticketForComment.user_id, estado: "pendiente", created_at: commentNow };
        db.discord_events.push(commentEvent);
        saveDB(db);
        return { data: { event_id: commentEvent.id }, error: null };
      }

      if (name === "update_support_ticket_status") {
        if (["staff", "admin", "super_admin"].indexOf(profile.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Staff y Administración." } };
        var ticketForStatus = db.support_tickets.find(function (row) { return String(row.id) === String(args.p_ticket_id); });
        var nextStatus = String(args.p_status || "");
        if (!ticketForStatus || ["abierto", "en_revision", "resuelto", "cerrado"].indexOf(nextStatus) === -1) return { data: null, error: { message: "Ticket o estado inválido." } };
        ticketForStatus.estado = nextStatus; ticketForStatus.assigned_to = profile.id; ticketForStatus.updated_at = new Date().toISOString(); ticketForStatus.closed_at = ["resuelto", "cerrado"].indexOf(nextStatus) !== -1 ? ticketForStatus.updated_at : null;
        var statusEvent = { id: uid(), tipo: "ticket_status_changed", titulo: "Ticket " + nextStatus, mensaje: profile.nombre + " cambió el estado de “" + ticketForStatus.asunto + "” a " + nextStatus + ".", mission_id: null, user_id: ticketForStatus.user_id, estado: "pendiente", created_at: ticketForStatus.updated_at };
        db.discord_events.push(statusEvent);
        saveDB(db);
        return { data: { event_id: statusEvent.id }, error: null };
      }

      if (name === "checkout_cart") {
        var cart = (args && args.p_items) || [];
        if (!Array.isArray(cart) || !cart.length) return { data: null, error: { message: "El carrito está vacío." } };
        var totalMoney = 0;
        var totalPoints = 0;
        var resolved = [];
        for (var i = 0; i < cart.length; i++) {
          var requested = cart[i];
          var item = db.shop_items.find(function (candidate) { return String(candidate.id) === String(requested.item_id) && candidate.disponible; });
          var quantity = Math.max(1, parseInt(requested.quantity, 10) || 1);
          if (!item) return { data: null, error: { message: "Uno de los artículos ya no está disponible." } };
          if (item.stock >= 0 && item.stock < quantity) return { data: null, error: { message: "Stock insuficiente para " + item.nombre + "." } };
          totalMoney += item.precio_dinero * quantity;
          totalPoints += item.precio_puntos * quantity;
          resolved.push({ item: item, quantity: quantity });
        }
        if (profile.dinero < totalMoney || profile.puntos < totalPoints) return { data: null, error: { message: "Saldo insuficiente para completar la compra." } };
        profile.dinero -= totalMoney;
        profile.puntos -= totalPoints;
        var orderId = uid();
        var invoice = "USMCF-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + String(db.orders.length + 1).padStart(4, "0");
        db.orders.push({ id: orderId, user_id: profile.id, invoice_number: invoice, total_dinero: totalMoney, total_puntos: totalPoints, estado: "pagada", created_at: new Date().toISOString() });
        resolved.forEach(function (entry) {
          var item = entry.item;
          db.order_items.push({ id: uid(), order_id: orderId, item_id: item.id, nombre: item.nombre, quantity: entry.quantity, precio_dinero: item.precio_dinero, precio_puntos: item.precio_puntos });
          var owned = db.user_inventory.find(function (row) { return row.user_id === profile.id && row.item_id === item.id; });
          if (owned) owned.cantidad = (owned.cantidad || 1) + entry.quantity;
          else db.user_inventory.push({ id: uid(), user_id: profile.id, item_id: item.id, cantidad: entry.quantity, comprado_at: new Date().toISOString() });
          if (item.stock > 0) item.stock -= entry.quantity;
        });
        db.transactions.push({ id: uid(), user_id: profile.id, tipo: "compra", descripcion: "Factura " + invoice, monto_dinero: -totalMoney, monto_puntos: -totalPoints, created_at: new Date().toISOString() });
        saveDB(db);
        return { data: { order_id: orderId, invoice_number: invoice, total_dinero: totalMoney, total_puntos: totalPoints }, error: null };
      }

      return { data: null, error: { message: "Función local no disponible." } };
    }
  };

})();
