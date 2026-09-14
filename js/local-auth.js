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
    // Auto-reparar tablas faltantes
    var defaults = { missions: [], mission_participants: [], training_assignments: [], transactions: [], opinions: [], notifications: [], discord_events: [], shop_items: [], user_inventory: [], orders: [], order_items: [] };
    for (var key in defaults) {
      if (!db[key]) db[key] = defaults[key];
    }
    seedAdditionalDemoPersonnel(db);
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
    });
    if (!db.shop_items.length) seedShop(db);
    saveDB(db);
    return db;
  }

  function initDB() {
    var db = {
      profiles: [],
      missions: [],
      mission_participants: [],
      training_assignments: [],
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
    var staffId = uid();
    var clienteId = uid();

    db.profiles.push(
      {
        id: adminId, email: "admin@usmcf.com", nombre: "Comandante USMCF",
        usuario_roblox: "AdminUSMCF", rango: "General", rol: "super_admin",
        estado: "activo", puntos: 10000, dinero: 50000,
        last_login: now, created_at: now
      },
      {
        id: staffId, email: "staff@usmcf.com", nombre: "Sargento Mayor",
        usuario_roblox: "StaffUSMCF", rango: "Sargento Mayor de 1ra Clase",
        rol: "staff", estado: "activo", puntos: 5000, dinero: 15000,
        last_login: now, created_at: now
      },
      {
        id: clienteId, email: "cliente@usmcf.com", nombre: "Recluta Test",
        usuario_roblox: "ClienteTest", rango: "Soldado",
        rol: "usuario", estado: "activo", puntos: 100, dinero: 500,
        last_login: now, created_at: now
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

  function seedAdditionalDemoPersonnel(db) {
    var now = new Date().toISOString();
    var demoPersonnel = [
      { email: "diego.salazar@usmcf.com", nombre: "Cabo Diego Salazar", usuario_roblox: "DiegoSalazarUSMC", rango: "Cabo", rol: "usuario", estado: "activo", puntos: 850, dinero: 2400 },
      { email: "mateo.ruiz@usmcf.com", nombre: "Soldado Mateo Ruiz", usuario_roblox: "MateoRuizUSMC", rango: "Soldado", rol: "usuario", estado: "activo", puntos: 320, dinero: 900 },
      { email: "lucia.vega@usmcf.com", nombre: "Soldado Lucía Vega", usuario_roblox: "LuciaVegaUSMC", rango: "Soldado de Primera", rol: "usuario", estado: "activo", puntos: 470, dinero: 1300 },
      { email: "tomas.leon@usmcf.com", nombre: "Recluta Tomás León", usuario_roblox: "TomasLeonUSMC", rango: "Recluta", rol: "usuario", estado: "pendiente", puntos: 0, dinero: 0, training: true },
      { email: "valeria.cruz@usmcf.com", nombre: "Recluta Valeria Cruz", usuario_roblox: "ValeriaCruzUSMC", rango: "Recluta", rol: "usuario", estado: "pendiente", puntos: 0, dinero: 0, training: true },
      { email: "reyes.staff@usmcf.com", nombre: "Instructor Reyes", usuario_roblox: "ReyesStaffUSMC", rango: "Sargento", rol: "staff", estado: "activo", puntos: 2100, dinero: 6200 },
      { email: "torres.staff@usmcf.com", nombre: "Sargento Ana Torres", usuario_roblox: "AnaTorresUSMC", rango: "Sargento de Artillería", rol: "staff", estado: "activo", puntos: 3400, dinero: 9800 }
    ];
    var passwords = getPasswords();
    demoPersonnel.forEach(function (person, index) {
      var existing = db.profiles.find(function (profile) { return profile.email === person.email; });
      if (!existing) {
        existing = Object.assign({ id: uid(), last_login: now, created_at: new Date(Date.now() - (index + 1) * 3600000).toISOString(), ultimo_salario: null }, person);
        delete existing.training;
        db.profiles.push(existing);
        if (person.training) db.training_assignments.push({ id: uid(), user_id: existing.id, trainer_id: null, estado: "asignado", assigned_at: now, started_at: null, completed_at: null });
      }
      if (!passwords[person.email]) passwords[person.email] = "Demo123!";
    });
    savePasswords(passwords);
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
        if (name === "admin-users") {
          var session = getSession();
          var actor = session && db.profiles.find(function (row) { return String(row.id) === String(session.id); });
          if (!actor || ["admin", "super_admin"].indexOf(actor.rol) === -1) return { data: null, error: { message: "Acceso exclusivo de Administración." } };
          if (body.action === "create") {
            var email = String(body.email || "").toLowerCase().trim();
            if (db.profiles.some(function (row) { return row.email === email; })) return { data: null, error: { message: "Ese correo ya tiene una cuenta." } };
            var newId = uid();
            var now = new Date().toISOString();
            var newProfile = { id: newId, email: email, nombre: body.nombre || "Sin nombre", usuario_roblox: body.usuario_roblox || "SinUsuario", rango: "Recluta", rol: body.rol || "usuario", estado: "pendiente", puntos: 0, dinero: 0, last_login: now, created_at: now };
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
            var oldEmail = targetProfile.email;
            ["nombre", "usuario_roblox", "email", "rol", "estado", "rango"].forEach(function (field) { if (body[field] !== undefined) targetProfile[field] = body[field]; });
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

      if (name === "pay_my_salary") {
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
        db.transactions.push({ id: uid(), user_id: target.id, tipo: "ajuste_mando", descripcion: args.p_reason || "Ajuste manual de mando", monto_puntos: pointsDelta, monto_dinero: moneyDelta, created_at: new Date().toISOString() });
        var pointsEvent = { id: uid(), tipo: "points_adjusted", titulo: "Actualización de puntos", mensaje: profile.nombre + " ajustó a " + target.nombre + ": " + (pointsDelta >= 0 ? "+" : "") + pointsDelta + " puntos y " + (moneyDelta >= 0 ? "+" : "") + moneyDelta + " de saldo.", mission_id: null, user_id: target.id, estado: "pendiente", created_at: new Date().toISOString() };
        db.discord_events.push(pointsEvent);
        saveDB(db);
        return { data: { points: target.puntos, money: target.dinero, event_id: pointsEvent.id }, error: null };
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
