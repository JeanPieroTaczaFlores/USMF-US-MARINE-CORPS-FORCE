(function () {
  "use strict";

  var state = {
    user: null,
    profile: null,
    items: [],
    inventory: [],
    orders: [],
    transactions: [],
    adminProfiles: [],
    adminItems: [],
    adminInventory: [],
    adminOrders: [],
    adminTransactions: [],
    missions: [],
    missionParticipants: [],
    voiceSessions: [],
    discordEvents: [],
    trainingAssignments: [],
    specialtyApplications: [],
    specialtyTrainingRequests: [],
    tickets: [],
    ticketComments: [],
    discordInvites: [],
    factionMembers: [],
    cart: [],
    storeCategory: "todos",
    libraryCategory: "todos",
    libraryQuery: "",
    adminQuery: "",
    editingItemId: null
  };

  var libraryEntries = [
    { category: "reglas", title: "Conducta y respeto", summary: "Trato cortés, coordinación clara y cero tolerancia al comportamiento irrespetuoso.", bullets: ["Respeta a todos los miembros", "Comunicación breve durante misión", "Las ausencias deben justificarse"] },
    { category: "reglas", title: "Cadena de mando", summary: "Las órdenes de instructores, suboficiales y Alto Mando se cumplen dentro de la operación.", bullets: ["Sigue el canal de mando", "No interrumpas comunicaciones", "Reporta incidentes por la vía oficial"] },
    { category: "manuales", title: "Ingreso y entrenamiento TRS", summary: "Proceso desde la solicitud hasta la asignación de unidad.", bullets: ["Registro y verificación", "Entrenamiento inicial TRS", "Graduación y asignación de rol"] },
    { category: "manuales", title: "Uniforme y equipo", summary: "Configuración visual oficial para mantener disciplina y reconocimiento de aliados.", bullets: ["MCCUU desierto o bosque", "Colores Tan / Coyote Brown", "Accesorios de Store sólo si están aprobados"] },
    { category: "equipamiento", title: "Uniforme USMCF oficial", image: "img/official-equipment/usmcf-uniforme.webp", summary: "MCCUU desierto o bosque con elementos Tan / Coyote Brown y representación visual uniforme de la facción.", bullets: ["Longship V1 SAPI en color TAN", "Casco, guantes, rodilleras, linterna y radio con auricular", "Bandera de Estados Unidos y parche de escuadra visibles"] },
    { category: "equipamiento", title: "Carga media autorizada", image: "img/official-equipment/chaleco-medio.webp", summary: "Configuración con mochila para patrulla y reconocimiento, únicamente cuando Mando la autoriza.", bullets: ["Raciones y kit médico", "Binoculares y brújula", "Mantener el frontal del chaleco ligero"] },
    { category: "equipamiento", title: "Carga ligera / CQB", image: "img/official-equipment/chaleco-ligero.webp", summary: "Configuración sin mochila para asalto, incursión y combate cercano con máxima movilidad.", bullets: ["Cargadores y munición", "Vendajes, torniquetes e IFAK", "Bolsas utilitarias y herramientas justificadas por el rol"] },
    { category: "equipamiento", title: "Casco y accesorios", summary: "Configuración oficial del casco AEGIS Maritime Balistic; el MICH 2000 queda restringido a Logística, artilleros y Machine Gunners.", bullets: ["Ballistic Goggles Tan o Ballistic Glass", "NVG sólo en misiones nocturnas", "Comms para pilotos y operadores de radio; IR Strobe para señalización"] },
    { category: "armas", title: "Infantería", image: "img/field/training.jpg", summary: "Armamento autorizado para el elemento de infantería regular.", bullets: ["RF416 A3, M16A4 o M4 Carbine", "Mira M150 y cargador USGI", "Secundaria M9A1 Beretta"] },
    { category: "armas", title: "MARSOC y tiradores", image: "img/field/night-ops.jpg", summary: "Configuraciones reservadas para operadores y especialidades aprobadas.", bullets: ["RF416 A5 para MARSOC", "SCAR-L: máximo un operador por equipo", "RF417 exclusivo para tirador designado MARSOC"] },
    { category: "armas", title: "Armas de especialidad", image: "img/field/mission.jpg", summary: "Equipo asignado por función; no puede usarse fuera de la especialidad.", bullets: ["M249 para Machine Gunner", "M1014 para brecha del Combat Engineer", "M24, L115A3 o M110 para tiradores autorizados"] },
    { category: "equipamiento", title: "Rifleman", summary: "Carga base obligatoria para quien no tenga una especialidad activa.", bullets: ["RF416 A3", "M9A1", "Equipo de combate estándar y suministros básicos"] },
    { category: "equipamiento", title: "DMR / Designated Marksman", summary: "Especialista de precisión y observación a media distancia.", bullets: ["Rifle DMR autorizado", "Óptica magnificada o de precisión", "Equipo de observación"] },
    { category: "equipamiento", title: "Machine Gunner", summary: "Elemento de fuego sostenido y supresión.", bullets: ["Ametralladora autorizada", "Munición adicional", "Equipo de apoyo de fuego y MICH 2000 autorizado"] },
    { category: "equipamiento", title: "Combat Medic", summary: "Soporte sanitario y estabilización de escuadra.", bullets: ["Rescue Axe", "Suministros médicos", "Equipo de estabilización"] },
    { category: "equipamiento", title: "Combat Engineer", summary: "Brecha, acceso y demolición controlada.", bullets: ["Halligan Tool", "M1014", "Herramientas de demolición autorizadas"] },
    { category: "equipamiento", title: "Grenadier", summary: "Apoyo explosivo y cobertura de humo bajo orden operativa.", bullets: ["M320 o lanzador autorizado", "Munición HE", "Granadas de humo"] },
    { category: "equipamiento", title: "Radio Operator", summary: "Enlace de comunicaciones, navegación y señalización.", bullets: ["Radio de largo alcance", "Equipo de navegación", "Material de señalización"] },
    { category: "loadouts", title: "Asalto / CQB", summary: "Carga ligera para movilidad máxima en incursiones y combate cercano.", bullets: ["Sin mochila", "Munición y material médico esencial", "Arma definida por división"] },
    { category: "loadouts", title: "Patrulla / Reconocimiento", summary: "Carga media orientada a autonomía, observación y navegación.", bullets: ["Mochila con autorización", "Raciones, kit médico y binoculares", "Brújula y equipo de comunicaciones"] },
    { category: "loadouts", title: "Operación nocturna", summary: "Configuración especial para visibilidad, identificación y control del ruido.", bullets: ["NVG sólo en misión nocturna", "IR Strobe recomendado", "Supresor bajo autorización"] },
    { category: "loadouts", title: "Despliegue anfibio", summary: "Equipo ligero e impermeable para operaciones costeras en el mapa Sea.", bullets: ["Prioriza movilidad", "Protege el material esencial", "Sigue la configuración indicada por el mando"] },
    { category: "manuales", title: "Controles y servidores", summary: "Guía de radio, postura, inclinación, accesorios e ingreso a servidores privados.", bullets: ["Configura teclas antes del despliegue", "Verifica radio y accesorios", "Usa sólo enlaces oficiales"] }
  ];

  var specialtyCatalog = [
    { key: "raider", icon: "⚔", name: "Marine Raider", points: 100, requirement: "Evaluación MARSOC", benefits: ["Misiones especiales y de alto riesgo", "Entrenamiento avanzado", "Uniforme Kandahar autorizado"] },
    { key: "radio", icon: "📡", name: "Operador de Radio", points: 250, requirement: "Curso de comunicaciones", benefits: ["Canal de mando exclusivo", "Coordinación de ataques", "Solicitud de refuerzos"] },
    { key: "medico", icon: "✚", name: "Médico de Combate", points: 250, requirement: "Curso de sanidad", benefits: ["Revivir y estabilizar aliados", "Prioridad de protección", "Soporte médico de escuadra"] },
    { key: "tirador_ligero", icon: "◎", name: "Tirador Designado Ligero", points: 300, requirement: "Prueba de puntería", benefits: ["Uso autorizado de M110", "Eventos de tiro", "Cobertura a media distancia"] },
    { key: "tirador_pesado", icon: "⌖", name: "Tirador Designado Pesado", points: 400, requirement: "Prueba avanzada", benefits: ["AWP y M2000 autorizados", "Largo alcance", "Posiciones de observación"] },
    { key: "machine_gunner", icon: "▰", name: "Machine Gunner", points: 300, requirement: "Curso de armas pesadas", benefits: ["PKM y M240", "Supresión y cobertura", "Control de zonas"] },
    { key: "combat_engineer", icon: "◆", name: "Combat Engineer", points: 300, requirement: "Curso de demoliciones", benefits: ["Brecha y explosivos", "Destrucción controlada", "Herramientas de ingeniería"] },
    { key: "conductor", icon: "▣", name: "Conductor", points: 120, requirement: "Instrucción vehicular", benefits: ["MRAP y HMMWV", "Maniobras tácticas", "Transporte de escuadra"] },
    { key: "artillero", icon: "✦", name: "Artillero", points: 120, requirement: "Instrucción de apoyo", benefits: ["Torretas y CAWS", "Fuego de apoyo", "Defensa vehicular"] }
  ];

  function $(id) { return document.getElementById(id); }
  function money(value) { return new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0)); }
  function points(value) { return Number(value || 0).toLocaleString("es-PE") + " pts"; }
  function dateText(value) {
    if (!value) return "Sin registro";
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }
  function initials(name) {
    return (name || "US").split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0); }).join("").toUpperCase();
  }
  function isOfficialEmail(value) { return /^[^@\s]+@usmcf\.com$/i.test(String(value || "").trim()); }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char];
    });
  }
  function errorText(error) {
    if (!error) return "Ocurrió un error inesperado.";
    var message = error.message || error.error_description || String(error);
    if (/invalid login/i.test(message)) return "Correo o contraseña incorrectos.";
    if (/already registered/i.test(message)) return "Ese correo ya tiene una cuenta.";
    return message;
  }
  function setMessage(target, message, kind) {
    var box = $(target);
    if (!box) return;
    box.textContent = message || "";
    box.className = "platform-alert" + (kind ? " " + kind : "") + (message ? "" : " hidden");
  }
  function setBusy(button, busy, label) {
    button.disabled = busy;
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.textContent = busy ? label : button.dataset.label;
  }

  function switchAuth(mode) {
    var login = mode === "login";
    $("loginTab").classList.toggle("active", login);
    $("registerTab").classList.toggle("active", !login);
    $("loginTab").setAttribute("aria-selected", String(login));
    $("registerTab").setAttribute("aria-selected", String(!login));
    $("loginForm").classList.toggle("hidden", !login);
    $("registerForm").classList.toggle("hidden", login);
    setMessage("authMessage", "");
  }

  async function getProfile(userId) {
    var result = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (result.error) throw result.error;
    return result.data;
  }

  function clearLegacyPreviewFromUrl() {
    var url = new URL(window.location.href);
    if (!url.searchParams.has("preview")) return;
    url.searchParams.delete("preview");
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
  }

  async function loadSession() {
    clearLegacyPreviewFromUrl();
    if (!supabase) {
      ["loginTab", "registerTab", "discordLoginBtn"].forEach(function (id) { if ($(id)) $(id).disabled = true; });
      ["loginForm", "registerForm"].forEach(function (id) { if ($(id)) $(id).classList.add("hidden"); });
      setMessage("authMessage", "La plataforma está en preparación. El acceso se habilitará cuando la base de datos oficial esté conectada.", "error");
      return;
    }
    var result = await supabase.auth.getSession();
    if (result.error) setMessage("authMessage", errorText(result.error), "error");
    var session = result.data && result.data.session;
    if (session && session.user) await enterPlatform(session.user);
  }

  async function enterPlatform(user) {
    try {
      state.user = user;
      if (isSupabaseConfigured) {
        var identitySync = await supabase.rpc("sync_my_discord_identity");
        if (identitySync.error) throw identitySync.error;
      }
      state.profile = await getProfile(user.id);
      if (!state.profile) throw new Error("Tu cuenta todavía no tiene un perfil vinculado.");
      $("authView").classList.add("hidden");
      $("memberView").classList.remove("hidden");
      $("logoutBtn").classList.remove("hidden");
      hydrateIdentity();
      switchView("resumen");
      var accessResult = await supabase.rpc("record_platform_login");
      if (!accessResult.error && accessResult.data && accessResult.data.event_id) await sendDiscordEvent(accessResult.data.event_id);
      await syncDiscordRoles(user.id, true);
      await verifySalary();
      await loadPlatformData();
      if (state.profile.estado !== "activo") {
        setMessage("appMessage", "Tu perfil está " + state.profile.estado + ". Puedes consultar la biblioteca, pero las compras se habilitan después de la aprobación del staff.");
      }
    } catch (error) {
      setMessage("authMessage", errorText(error), "error");
      await supabase.auth.signOut();
      state.user = null;
    }
  }

  function hydrateIdentity() {
    var p = state.profile;
    $("memberInitials").textContent = initials(p.nombre);
    $("memberName").textContent = p.nombre || p.usuario_roblox || "Marine";
    $("memberRank").textContent = p.rango || "Sin rango";
    $("welcomeTitle").textContent = "Bienvenido, @" + (p.callsign || p.usuario_roblox || "Marine");
    $("profileHandle").textContent = "@" + (p.callsign || p.usuario_roblox || "Marine");
    $("summaryRank").textContent = p.rango || "Sin rango";
    $("summaryPoints").textContent = Number(p.puntos || 0).toLocaleString("es-PE");
    var unlimitedAdmin = canManageUsers();
    $("topBalance").textContent = unlimitedAdmin ? "∞ USD" : money(p.dinero);
    $("balanceLabel").textContent = unlimitedAdmin ? "FONDOS DE MANDO" : "SALDO EN USD";
    $("salaryNav").classList.toggle("hidden", unlimitedAdmin);
    $("summarySalaryCard").classList.toggle("hidden", unlimitedAdmin);
    var rank = (window.RANGOS || []).find(function (entry) { return entry.rango === p.rango; });
    $("salaryAmount").textContent = money(rank ? rank.salario : 0);
    $("summarySalary").textContent = money(rank ? rank.salario : 0);
    $("salaryRank").textContent = "Tarifa de " + (p.rango || "rango sin asignar");
    $("lastPayment").textContent = p.ultimo_salario ? dateText(p.ultimo_salario) : "Primer pago pendiente";
    var next = p.ultimo_salario ? new Date(new Date(p.ultimo_salario).getTime() + 7 * 86400000) : new Date();
    $("nextPayment").textContent = dateText(next);
    $("summaryPayDate").textContent = next <= new Date() ? "En proceso" : dateText(next);
    var discordLinked = Boolean(p.discord_id);
    $("discordIdentityStatus").textContent = discordLinked ? "Vinculado y verificado · ID " + p.discord_id : "Aún no vinculado. Conecta tu Discord para sincronizar rangos y roles.";
    $("linkDiscordBtn").textContent = discordLinked ? "DISCORD VINCULADO" : "VINCULAR DISCORD";
    $("linkDiscordBtn").disabled = discordLinked;
    $("adminNav").classList.toggle("hidden", !isStaff());
    $("specialtiesNav").classList.toggle("hidden", canManageUsers());
    $("missionCommand").classList.toggle("hidden", !isStaff());
    $("adminCreatePanel").classList.toggle("hidden", !canManageUsers());
    $("adminStorePanel").classList.toggle("hidden", !isStaff());
    $("announcementPanel").classList.toggle("hidden", !canManageUsers());
    $("adminSectionTitle").textContent = canManageUsers() ? "Administración" : "Centro de Staff";
    $("adminScopeCopy").textContent = canManageUsers()
      ? "Control total de usuarios: nombre, Roblox, correo, contraseña, permisos, estado, rango, puntos, dólares, inventario, facturas y movimientos."
      : "Gestión operativa: misiones, entrenamientos, especialidades, consulta de expedientes y ajustes auditados de puntos y dólares.";
  }

  function isStaff() {
    return state.profile && ["staff", "admin", "super_admin"].indexOf(state.profile.rol) !== -1;
  }

  function canManageUsers() {
    return state.profile && ["admin", "super_admin"].indexOf(state.profile.rol) !== -1;
  }

  async function verifySalary() {
    if (!state.profile || state.profile.estado !== "activo" || canManageUsers()) return;
    var result = await supabase.rpc("pay_my_salary");
    if (result.error) {
      if (isSupabaseConfigured) setMessage("appMessage", "La consulta de salario no está disponible todavía: " + errorText(result.error), "error");
      return;
    }
    if (result.data && result.data.paid) {
      state.profile = await getProfile(state.user.id);
      hydrateIdentity();
      setMessage("appMessage", "Salario semanal acreditado: " + money(result.data.amount) + ".", "success");
    }
  }

  async function loadPlatformData() {
    var userId = state.user.id;
    var results = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      supabase.from("shop_items").select("*").eq("disponible", true).order("precio_dinero", { ascending: true }),
      supabase.from("user_inventory").select("*").eq("user_id", userId).order("comprado_at", { ascending: false }),
      supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("missions").select("*").order("fecha", { ascending: true }),
      supabase.from("mission_participants").select("*").order("joined_at", { ascending: true }),
      supabase.from("discord_events").select("*").order("created_at", { ascending: false }).limit(12),
      supabase.from("training_assignments").select("*").order("assigned_at", { ascending: false }),
      supabase.from("specialty_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("specialty_training_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("support_tickets").select("*").order("updated_at", { ascending: false }),
      supabase.from("support_ticket_comments").select("*").order("created_at", { ascending: true }),
      supabase.from("discord_invites").select("*").order("created_at", { ascending: false }).limit(1),
      supabase.from("voice_sessions").select("*").order("joined_at", { ascending: false }).limit(200)
    ]);
    state.transactions = results[0].data || [];
    state.items = results[1].data || [];
    state.inventory = results[2].data || [];
    state.orders = results[3].data || [];
    state.missions = results[4].data || [];
    state.missionParticipants = results[5].data || [];
    state.discordEvents = results[6].data || [];
    state.trainingAssignments = results[7].data || [];
    state.specialtyApplications = results[8].data || [];
    state.specialtyTrainingRequests = results[9].data || [];
    state.tickets = results[10].data || [];
    state.ticketComments = results[11].data || [];
    state.discordInvites = results[12].data || [];
    state.voiceSessions = results[13].data || [];
    state.profile = await getProfile(userId);
    hydrateIdentity();
    renderTransactions();
    renderStore();
    renderInventory();
    renderInvoices();
    renderMissions();
    renderOnboarding();
    renderRankProgress();
    renderSpecialties();
    renderSpecialtyTrainingRequests();
    renderTickets();
    renderDiscordInvite();
    $("summaryItems").textContent = state.inventory.reduce(function (sum, row) { return sum + Number(row.cantidad || 1); }, 0);
    if (isStaff()) await loadAdminData();
  }

  async function loadAdminData() {
    var results = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("shop_items").select("*").order("created_at", { ascending: false }),
      supabase.from("training_assignments").select("*").order("assigned_at", { ascending: false }),
      supabase.from("user_inventory").select("*").order("comprado_at", { ascending: false }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("faction_members").select("*").order("display_name", { ascending: true })
    ]);
    state.adminProfiles = results[0].data || [];
    state.adminItems = results[1].data || [];
    state.trainingAssignments = results[2].data || [];
    state.adminInventory = results[3].data || [];
    state.adminOrders = results[4].data || [];
    state.adminTransactions = results[5].data || [];
    state.factionMembers = results[6].data || [];
    renderAdmin();
    renderMissions();
  }

  function renderTransactions() {
    var recent = state.transactions.slice(0, 6);
    $("recentTransactions").innerHTML = recent.length ? recent.map(transactionRow).join("") : '<p class="empty-state">Todavía no hay movimientos.</p>';
    var salaries = state.transactions.filter(function (row) { return row.tipo === "salario"; });
    $("salaryHistory").innerHTML = salaries.length ? salaries.map(transactionRow).join("") : '<p class="empty-state">Tu primer pago aparecerá aquí.</p>';
  }

  function renderRankProgress() {
    var thresholds = window.RANK_THRESHOLDS || [];
    var currentPoints = Number(state.profile.puntos || 0);
    var currentIndex = thresholds.map(function (entry) { return entry.rango; }).indexOf(state.profile.rango);
    var next = thresholds.find(function (entry) { return entry.puntos > currentPoints; });
    $("rankProgressCurrent").textContent = state.profile.rango || "Sin rango";
    if (!next || currentIndex === -1 && /Teniente|Capitán|Mayor|Coronel|General/.test(state.profile.rango || "")) {
      $("rankProgressNext").textContent = "Carrera de oficial: validación de mando";
      $("rankProgressBar").style.width = "100%";
      $("rankProgressText").textContent = "Los rangos de oficial exigen guerras y capacitación; no se entregan automáticamente por puntos.";
      return;
    }
    var previous = thresholds.filter(function (entry) { return entry.puntos <= currentPoints; }).slice(-1)[0] || { puntos: 0 };
    var progress = Math.max(0, Math.min(100, ((currentPoints - previous.puntos) / Math.max(1, next.puntos - previous.puntos)) * 100));
    $("rankProgressNext").textContent = "Siguiente: " + next.rango;
    $("rankProgressBar").style.width = progress + "%";
    $("rankProgressText").textContent = currentPoints.toLocaleString("es-PE") + " / " + next.puntos.toLocaleString("es-PE") + " pts · faltan " + Math.max(0, next.puntos - currentPoints).toLocaleString("es-PE") + " puntos";
  }

  function renderSpecialties() {
    $("specialtyGrid").innerHTML = specialtyCatalog.map(function (specialty) {
      var application = state.specialtyApplications.find(function (row) { return String(row.user_id) === String(state.user.id) && row.role_key === specialty.key; });
      var courseRequest = state.specialtyTrainingRequests.find(function (row) { return String(row.user_id) === String(state.user.id) && row.specialty_key === specialty.key && row.estado !== "rechazada"; });
      var eligible = state.profile.estado === "activo" && Number(state.profile.puntos || 0) >= specialty.points;
      var action = application
        ? '<span class="specialty-application-status ' + escapeHtml(application.estado) + '">' + escapeHtml(application.estado === "aprobada" ? "ROL APROBADO" : application.estado === "rechazada" ? "SOLICITUD RECHAZADA" : "EN EVALUACIÓN") + '</span>'
        : courseRequest
          ? '<span class="specialty-application-status ' + escapeHtml(courseRequest.estado) + '">CURSO ' + escapeHtml(String(courseRequest.estado).replace("_", " ").toUpperCase()) + '</span>'
          : '<button class="platform-primary compact" type="button" data-apply-specialty="' + specialty.key + '" ' + (eligible ? "" : "disabled") + '>' + (eligible ? "SOLICITAR ENTRENAMIENTO" : "REQUIERE " + specialty.points + " PTS") + '</button>';
      return '<article class="specialty-card ' + (specialty.key === "raider" ? "raider" : "") + '"><div class="specialty-card-top"><span>' + escapeHtml(specialty.icon) + '</span><small>' + escapeHtml(specialty.requirement) + '</small></div><h3>' + escapeHtml(specialty.name) + '</h3><strong>' + escapeHtml(points(specialty.points)) + '</strong><ul>' + specialty.benefits.map(function (benefit) { return '<li>' + escapeHtml(benefit) + '</li>'; }).join("") + '</ul>' + action + '</article>';
    }).join("");
  }

  async function applySpecialty(roleKey) {
    var specialty = specialtyCatalog.find(function (entry) { return entry.key === roleKey; });
    if (!specialty) return;
    if (state.profile.estado !== "activo" || Number(state.profile.puntos || 0) < specialty.points) return setMessage("appMessage", "Todavía no cumples los requisitos para esta especialidad.", "error");
    switchView("entrenamiento");
    $("specialtyTrainingType").value = roleKey;
    $("specialtyTrainingNotes").focus();
    setMessage("appMessage", "Curso seleccionado: " + specialty.name + ". Añade tu disponibilidad y envía la solicitud.", "success");
  }

  async function reviewSpecialtyApplication(applicationId, status) {
    var application = state.specialtyApplications.find(function (row) { return String(row.id) === String(applicationId); });
    if (!application || !isStaff()) return;
    var result = await supabase.from("specialty_applications").update({ estado: status, reviewed_by: state.user.id, reviewed_at: new Date().toISOString() }).eq("id", applicationId);
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    if (status === "aprobada") await syncDiscordRoles(application.user_id, false);
    setMessage("appMessage", status === "aprobada" ? "Especialidad aprobada y enviada al bot de Discord." : "Solicitud rechazada.", "success");
    await loadPlatformData();
  }

  function renderOnboarding() {
    var assignment = state.trainingAssignments.find(function (row) { return String(row.user_id) === String(state.user.id); });
    var visible = assignment && assignment.estado !== "finalizado";
    $("onboardingBanner").classList.toggle("hidden", !visible);
    var trainer = assignment ? state.adminProfiles.find(function (row) { return String(row.id) === String(assignment.trainer_id); }) : null;
    if (visible) {
      $("onboardingStatus").textContent = String(assignment.estado || "asignado").replace("_", " ").toUpperCase();
      $("onboardingTrainer").textContent = trainer ? "Instructor responsable: " + trainer.nombre : "Esperando que Staff o Administración tome el entrenamiento.";
    }

    var completed = assignment && assignment.estado === "finalizado";
    var active = state.profile.estado === "activo";
    $("myTrainingStatus").textContent = completed ? "FINALIZADO" : assignment ? String(assignment.estado || "asignado").replace("_", " ").toUpperCase() : "SIN ASIGNACIÓN";
    $("myTrainingAssigned").textContent = assignment ? "Asignado el " + dateText(assignment.assigned_at) : "Administración debe revisar tu registro.";
    $("myTrainingTrainer").textContent = trainer ? trainer.nombre + " confirmó que es tu instructor." : "Staff o Administración debe tomar el entrenamiento.";
    $("myTrainingCompleted").textContent = completed ? "Confirmado el " + dateText(assignment.completed_at) + ". Rango Soldado otorgado." : "Sólo el instructor responsable o un Admin puede confirmar el final.";
    document.querySelectorAll("[data-training-step]").forEach(function (step) {
      var name = step.dataset.trainingStep;
      var reached = name === "assigned" ? !!assignment : name === "started" ? !!(assignment && assignment.started_at) : completed;
      step.classList.toggle("complete", reached);
    });
    $("wardrobeAccessCard").classList.toggle("authorized", active);
    $("wardrobeAccessTitle").textContent = active ? "Vestuarios habilitados" : "Vestuarios bloqueados";
    $("wardrobeAccessText").textContent = active ? "Tu entrenamiento fue confirmado y tu rango permite ingresar a la Store oficial." : "Completa el TRS y espera la aprobación del instructor para activar tu rango Soldado.";
    $("wardrobeAccessState").textContent = active ? "ACCESO AUTORIZADO" : "SIN AUTORIZACIÓN";
    $("wardrobeAccessButton").disabled = !active;
  }

  function specialtyName(key) {
    var specialty = specialtyCatalog.find(function (entry) { return entry.key === key; });
    return specialty ? specialty.name : key;
  }

  function renderSpecialtyTrainingRequests() {
    var eligible = specialtyCatalog.filter(function (entry) {
      var alreadyApproved = state.specialtyApplications.some(function (row) { return String(row.user_id) === String(state.user.id) && row.role_key === entry.key && row.estado === "aprobada"; });
      var openRequest = state.specialtyTrainingRequests.some(function (row) { return String(row.user_id) === String(state.user.id) && row.specialty_key === entry.key && ["pendiente", "asignado", "en_curso"].indexOf(row.estado) !== -1; });
      return Number(state.profile.puntos || 0) >= entry.points && !alreadyApproved && !openRequest;
    });
    $("eligibleCourseCount").textContent = eligible.length + (eligible.length === 1 ? " DISPONIBLE" : " DISPONIBLES");
    $("specialtyTrainingType").innerHTML = eligible.length
      ? eligible.map(function (entry) { return '<option value="' + escapeHtml(entry.key) + '">' + escapeHtml(entry.name) + ' · ' + escapeHtml(points(entry.points)) + '</option>'; }).join("")
      : '<option value="">No hay cursos nuevos disponibles</option>';
    $("specialtyTrainingSubmit").disabled = !eligible.length || state.profile.estado !== "activo";
    var mine = state.specialtyTrainingRequests.filter(function (row) { return String(row.user_id) === String(state.user.id); });
    $("mySpecialtyTrainingRequests").innerHTML = mine.length ? mine.map(function (request) {
      var trainer = state.adminProfiles.find(function (row) { return String(row.id) === String(request.trainer_id); });
      return '<div class="training-row"><div><strong>' + escapeHtml(specialtyName(request.specialty_key)) + '</strong><small>Solicitado ' + escapeHtml(dateText(request.created_at)) + ' · Instructor: ' + escapeHtml(trainer ? trainer.nombre : "Por asignar") + '</small><small>' + escapeHtml(request.notes || "Sin comentario adicional") + '</small><span class="training-status">' + escapeHtml(String(request.estado || "pendiente").replace("_", " ").toUpperCase()) + '</span></div></div>';
    }).join("") : '<p class="empty-state">Aún no has solicitado entrenamientos de especialidad.</p>';
  }

  async function requestSpecialtyTraining(event) {
    event.preventDefault();
    var key = $("specialtyTrainingType").value;
    var specialty = specialtyCatalog.find(function (entry) { return entry.key === key; });
    if (!specialty) return setMessage("appMessage", "No tienes un curso disponible para solicitar.", "error");
    var button = $("specialtyTrainingSubmit");
    setBusy(button, true, "ENVIANDO…");
    var result = await supabase.rpc("request_specialty_training", { p_specialty_key: key, p_notes: $("specialtyTrainingNotes").value.trim() });
    setBusy(button, false);
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    $("specialtyTrainingNotes").value = "";
    setMessage("appMessage", "Entrenamiento solicitado. Staff recibió la notificación en la plataforma y en Discord.", "success");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    await loadPlatformData();
  }

  async function specialtyTrainingAction(requestId, action) {
    if (!isStaff()) return;
    var result = await supabase.rpc("review_specialty_training", { p_request_id: requestId, p_action: action });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    if (action === "finalizar" && result.data && result.data.user_id) await syncDiscordRoles(result.data.user_id, false);
    setMessage("appMessage", action === "tomar" ? "Entrenamiento asignado a tu nombre." : action === "finalizar" ? "Curso finalizado y especialidad concedida." : "Solicitud rechazada.", "success");
    await loadPlatformData();
  }

  function ticketStatusLabel(status) {
    return { abierto: "ABIERTO", en_revision: "EN REVISIÓN", resuelto: "RESUELTO", cerrado: "CERRADO" }[status] || String(status || "abierto").toUpperCase();
  }

  function ticketCard(ticket, staffMode) {
    var comments = state.ticketComments.filter(function (row) { return String(row.ticket_id) === String(ticket.id); });
    var owner = profileName(ticket.user_id);
    var commentRows = comments.length ? comments.map(function (comment) {
      var author = comment.author_name || profileName(comment.author_id);
      return '<div class="ticket-comment ' + (String(comment.author_id) === String(ticket.user_id) ? "member" : "staff") + '"><div><strong>@' + escapeHtml(author) + '</strong><small>' + escapeHtml(dateText(comment.created_at)) + '</small></div><p>' + escapeHtml(comment.message) + '</p></div>';
    }).join("") : '<p class="empty-state">Todavía no hay respuestas.</p>';
    var controls = staffMode && ticket.estado !== "cerrado" ? '<div class="admin-actions ticket-controls"><button type="button" data-ticket-status="en_revision" data-ticket-id="' + escapeHtml(ticket.id) + '">EN REVISIÓN</button><button type="button" data-ticket-status="resuelto" data-ticket-id="' + escapeHtml(ticket.id) + '">RESOLVER</button><button type="button" data-ticket-status="cerrado" data-ticket-id="' + escapeHtml(ticket.id) + '">CERRAR</button></div>' : '';
    return '<details class="ticket-card"><summary><div><span>' + escapeHtml(ticket.tipo) + '</span><strong>' + escapeHtml(ticket.asunto) + '</strong><small>' + (staffMode ? escapeHtml(owner) + ' · ' : '') + escapeHtml(dateText(ticket.updated_at || ticket.created_at)) + '</small></div><b class="ticket-status ' + escapeHtml(ticket.estado) + '">' + escapeHtml(ticketStatusLabel(ticket.estado)) + '</b></summary><div class="ticket-body"><p class="ticket-opening">' + escapeHtml(ticket.detalle) + '</p><div class="ticket-thread">' + commentRows + '</div><form class="ticket-reply-form" data-ticket-reply-form="' + escapeHtml(ticket.id) + '"><input data-ticket-comment-input="' + escapeHtml(ticket.id) + '" maxlength="1000" required placeholder="Escribe un comentario o respuesta" /><button class="secondary-action" type="submit">COMENTAR</button></form>' + controls + '</div></details>';
  }

  function renderTickets() {
    var visible = isStaff() ? state.tickets : state.tickets.filter(function (row) { return String(row.user_id) === String(state.user.id); });
    $("ticketList").innerHTML = visible.length ? visible.map(function (ticket) { return ticketCard(ticket, false); }).join("") : '<p class="empty-state">No tienes tickets abiertos ni reportes enviados.</p>';
    var mineOpen = visible.filter(function (ticket) { return ["abierto", "en_revision"].indexOf(ticket.estado) !== -1; }).length;
    $("ticketPendingBadge").textContent = mineOpen;
    $("ticketPendingBadge").classList.toggle("hidden", !mineOpen);
  }

  function renderDiscordInvite() {
    var invite = state.discordInvites[0];
    var valid = invite && new Date(invite.expires_at) > new Date();
    $("discordInviteLink").classList.toggle("hidden", !valid);
    if (valid) {
      $("discordInviteLink").href = invite.invite_url;
      $("discordInviteStatus").textContent = "Invitación vigente hasta " + dateText(invite.expires_at) + ".";
    } else {
      $("discordInviteLink").removeAttribute("href");
      $("discordInviteStatus").textContent = "El bot publicará una invitación renovada cada 24 horas.";
    }
  }

  async function createTicket(event) {
    event.preventDefault();
    var button = $("ticketSubmit");
    setBusy(button, true, "CREANDO…");
    var result = await supabase.rpc("create_support_ticket", { p_type: $("ticketType").value, p_subject: $("ticketSubject").value.trim(), p_body: $("ticketBody").value.trim() });
    setBusy(button, false);
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    $("ticketForm").reset();
    setMessage("appMessage", "Ticket creado. Staff puede verlo en la plataforma y el bot avisará en Discord.", "success");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    await loadPlatformData();
  }

  async function addTicketComment(ticketId) {
    var input = document.querySelector('[data-ticket-comment-input="' + ticketId + '"]');
    var message = input ? input.value.trim() : "";
    if (!message) return;
    var result = await supabase.rpc("comment_support_ticket", { p_ticket_id: ticketId, p_message: message });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    setMessage("appMessage", "Comentario añadido al ticket.", "success");
    await loadPlatformData();
  }

  async function updateTicketStatus(ticketId, status) {
    if (!isStaff()) return;
    var result = await supabase.rpc("update_support_ticket_status", { p_ticket_id: ticketId, p_status: status });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    setMessage("appMessage", "Estado del ticket actualizado.", "success");
    await loadPlatformData();
  }

  function transactionRow(row) {
    var amount = Number(row.monto_dinero || 0);
    var pointAmount = Number(row.monto_puntos || 0);
    var display = amount ? (amount > 0 ? "+" : "") + money(amount) : (pointAmount > 0 ? "+" : "") + points(pointAmount);
    return '<div class="activity-row"><div><strong>' + escapeHtml(row.descripcion || row.tipo) + '</strong><small>' + escapeHtml(dateText(row.created_at)) + '</small></div><span class="activity-amount ' + ((amount < 0 || pointAmount < 0) ? "negative" : "") + '">' + escapeHtml(display) + '</span></div>';
  }

  function renderStore() {
    var storeLocked = state.profile.estado !== "activo";
    $("storeAccessNotice").classList.toggle("hidden", !storeLocked);
    $("cartButton").disabled = storeLocked;
    var filtered = state.items.filter(function (item) { return state.storeCategory === "todos" || item.tipo === state.storeCategory; });
    $("storeGrid").innerHTML = filtered.length ? filtered.map(function (item) {
      var price = item.precio_dinero > 0 ? money(item.precio_dinero) : points(item.precio_puntos);
      var stock = item.stock < 0 ? "Stock permanente" : item.stock + " disponibles";
      var visual = item.imagen_url ? '<img src="' + escapeHtml(item.imagen_url) + '" alt="' + escapeHtml(item.nombre) + '" loading="lazy" />' : escapeHtml(item.tipo.charAt(0).toUpperCase());
      return '<article class="store-card' + (storeLocked ? ' locked' : '') + '"><div class="store-card-visual">' + visual + '</div><div class="store-card-body"><span>' + escapeHtml(item.tipo) + '</span><h3>' + escapeHtml(item.nombre) + '</h3><p>' + escapeHtml(item.descripcion || "Implemento oficial USMCF.") + '</p><div class="store-card-footer"><div class="store-price"><strong>' + escapeHtml(price) + '</strong><small>' + escapeHtml(stock) + '</small></div><button class="add-cart" type="button" data-add="' + escapeHtml(item.id) + '" ' + (storeLocked || item.stock === 0 ? "disabled" : "") + '>' + (storeLocked ? 'REQUIERE TRS' : 'AGREGAR') + '</button></div></div></article>';
    }).join("") : '<p class="empty-state">No hay artículos publicados en esta categoría.</p>';
  }

  function addToCart(itemId) {
    if (state.profile.estado !== "activo") {
      setMessage("appMessage", "Tu vestuario se habilita cuando Staff o Administración confirma tu entrenamiento.", "error");
      switchView("entrenamiento");
      return;
    }
    var item = state.items.find(function (candidate) { return String(candidate.id) === String(itemId); });
    if (!item) return;
    var current = state.cart.find(function (entry) { return String(entry.item.id) === String(item.id); });
    if (current) current.quantity += 1;
    else state.cart.push({ item: item, quantity: 1 });
    renderCart();
    openCart();
  }

  function renderCart() {
    var count = state.cart.reduce(function (sum, entry) { return sum + entry.quantity; }, 0);
    $("cartCount").textContent = count;
    $("cartItems").innerHTML = state.cart.length ? state.cart.map(function (entry) {
      var price = entry.item.precio_dinero > 0 ? money(entry.item.precio_dinero * entry.quantity) : points(entry.item.precio_puntos * entry.quantity);
      return '<div class="cart-row"><div><strong>' + escapeHtml(entry.item.nombre) + '</strong><small>Cantidad: ' + entry.quantity + ' · ' + escapeHtml(price) + '</small></div><button type="button" data-remove="' + escapeHtml(entry.item.id) + '" aria-label="Quitar ' + escapeHtml(entry.item.nombre) + '">QUITAR</button></div>';
    }).join("") : '<p class="empty-state">Tu carrito está vacío.</p>';
    var moneyTotal = state.cart.reduce(function (sum, entry) { return sum + entry.item.precio_dinero * entry.quantity; }, 0);
    var pointsTotal = state.cart.reduce(function (sum, entry) { return sum + entry.item.precio_puntos * entry.quantity; }, 0);
    $("cartMoney").textContent = money(moneyTotal);
    $("cartPoints").textContent = points(pointsTotal);
    $("checkoutBtn").disabled = !state.cart.length;
  }

  function openCart() { $("cartDrawer").classList.remove("hidden"); $("cartBackdrop").classList.remove("hidden"); }
  function closeCart() { $("cartDrawer").classList.add("hidden"); $("cartBackdrop").classList.add("hidden"); }

  async function checkout() {
    if (!state.cart.length) return;
    if (state.profile.estado !== "activo") {
      setMessage("appMessage", "Tu cuenta debe estar activa para comprar.", "error");
      closeCart();
      return;
    }
    var button = $("checkoutBtn");
    setBusy(button, true, "PROCESANDO…");
    var payload = state.cart.map(function (entry) { return { item_id: entry.item.id, quantity: entry.quantity }; });
    var result = await supabase.rpc("checkout_cart", { p_items: payload });
    setBusy(button, false);
    if (result.error) {
      setMessage("appMessage", errorText(result.error), "error");
      closeCart();
      return;
    }
    state.cart = [];
    renderCart();
    closeCart();
    setMessage("appMessage", "Compra completada. Factura " + result.data.invoice_number + " generada automáticamente.", "success");
    await loadPlatformData();
    switchView("inventario");
  }

  function renderInventory() {
    var enriched = state.inventory.map(function (row) {
      var item = state.items.find(function (candidate) { return String(candidate.id) === String(row.item_id); });
      return { row: row, item: item };
    });
    $("inventoryGrid").innerHTML = enriched.length ? enriched.map(function (entry) {
      return '<div class="inventory-item"><div><strong>' + escapeHtml(entry.item ? entry.item.nombre : "Implemento adquirido") + '</strong><small>' + escapeHtml(entry.item ? entry.item.tipo : "inventario") + '</small></div><span>×' + Number(entry.row.cantidad || 1) + '</span></div>';
    }).join("") : '<p class="empty-state">Aún no tienes implementos.</p>';
  }

  function renderInvoices() {
    $("invoiceList").innerHTML = state.orders.length ? state.orders.map(function (order) {
      var totals = [order.total_dinero ? money(order.total_dinero) : "", order.total_puntos ? points(order.total_puntos) : ""].filter(Boolean).join(" + ");
      return '<div class="invoice-row"><div><strong>' + escapeHtml(order.invoice_number) + '</strong><small>' + escapeHtml(dateText(order.created_at)) + ' · ' + escapeHtml(totals) + '</small><button class="text-action" type="button" data-invoice="' + escapeHtml(order.id) + '">DESCARGAR FACTURA</button></div><span>' + escapeHtml((order.estado || "pagada").toUpperCase()) + '</span></div>';
    }).join("") : '<p class="empty-state">Las facturas de tus compras aparecerán aquí.</p>';
  }

  function downloadInvoice(orderId) {
    var order = state.orders.find(function (candidate) { return String(candidate.id) === String(orderId); });
    if (!order) return;
    var lines = ["USMCF — FACTURA DIGITAL", "", "Factura: " + order.invoice_number, "Fecha: " + dateText(order.created_at), "Miembro: " + (state.profile.nombre || state.profile.email), "Rango: " + state.profile.rango, "", "Total dinero: " + money(order.total_dinero), "Total puntos: " + points(order.total_puntos), "Estado: " + (order.estado || "pagada"), "", "Documento generado automáticamente por la Plataforma USMCF."];
    var blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = order.invoice_number + ".txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderLibrary() {
    var query = state.libraryQuery.toLowerCase();
    var entries = libraryEntries.filter(function (entry) {
      var categoryMatch = state.libraryCategory === "todos" || entry.category === state.libraryCategory;
      var text = [entry.category, entry.title, entry.summary].concat(entry.bullets).join(" ").toLowerCase();
      return categoryMatch && (!query || text.indexOf(query) !== -1);
    });
    $("libraryGrid").innerHTML = entries.length ? entries.map(function (entry) {
      var image = entry.image ? '<img class="library-card-image" src="' + escapeHtml(entry.image) + '" alt="Referencia oficial: ' + escapeHtml(entry.title) + '" loading="lazy" />' : '';
      return '<article class="library-card">' + image + '<div class="library-card-copy"><span>' + escapeHtml(entry.category) + '</span><h3>' + escapeHtml(entry.title) + '</h3><p>' + escapeHtml(entry.summary) + '</p><ul>' + entry.bullets.map(function (bullet) { return "<li>" + escapeHtml(bullet) + "</li>"; }).join("") + '</ul></div></article>';
    }).join("") : '<p class="empty-state">No encontramos contenido con ese término.</p>';
  }

  function missionStatusLabel(status) {
    return { programada: "PROGRAMADA", activa: "EN CURSO", finalizada: "FINALIZADA", cancelada: "CANCELADA" }[status] || String(status || "programada").toUpperCase();
  }

  function participantStatusLabel(status) {
    return { inscrito: "INSCRITO", en_mision: "EN MISIÓN", confirmado: "ASISTENCIA CONFIRMADA", ausente: "AUSENTE" }[status] || String(status || "inscrito").toUpperCase();
  }

  function safeRobloxUrl(value) {
    try {
      var url = new URL(String(value || ""));
      return url.protocol === "https:" && (url.hostname === "roblox.com" || url.hostname.endsWith(".roblox.com")) ? url.href : "";
    } catch (error) { return ""; }
  }

  function missionEquipment(mission) {
    if (Array.isArray(mission.required_equipment)) return mission.required_equipment.filter(Boolean);
    return String(mission.required_equipment || "").split(/[\n,]+/).map(function (item) { return item.trim(); }).filter(Boolean);
  }

  function ownsEquipment(label) {
    var wanted = String(label || "").toLowerCase();
    return state.inventory.some(function (owned) {
      var item = state.items.find(function (entry) { return String(entry.id) === String(owned.item_id); });
      var name = String(item && item.nombre || "").toLowerCase();
      return name && (name.indexOf(wanted) !== -1 || wanted.indexOf(name) !== -1);
    });
  }

  function profileName(userId) {
    var profile = state.adminProfiles.find(function (row) { return String(row.id) === String(userId); });
    if (profile) return profile.callsign || profile.nombre || profile.usuario_roblox || profile.email;
    if (state.profile && String(state.profile.id) === String(userId)) return state.profile.callsign || state.profile.nombre || state.profile.usuario_roblox || state.profile.email;
    return "Miembro USMCF";
  }

  function renderMissions() {
    var activeCount = state.missions.filter(function (mission) { return mission.estado === "activa"; }).length;
    var myEntries = state.missionParticipants.filter(function (row) { return String(row.user_id) === String(state.user.id); });
    $("missionSummary").innerHTML = '<article><span>OPERACIONES ACTIVAS</span><strong>' + activeCount + '</strong></article><article><span>MIS INSCRIPCIONES</span><strong>' + myEntries.length + '</strong></article><article><span>ASISTENCIAS CONFIRMADAS</span><strong>' + myEntries.filter(function (row) { return row.estado === "confirmado"; }).length + '</strong></article>';

    $("missionGrid").innerHTML = state.missions.length ? state.missions.map(function (mission) {
      var participants = state.missionParticipants.filter(function (row) { return String(row.mission_id) === String(mission.id); });
      var mine = participants.find(function (row) { return String(row.user_id) === String(state.user.id); });
      var canJoin = state.profile.estado === "activo" && ["programada", "activa"].indexOf(mission.estado) !== -1 && !mine;
      var canLeave = mine && mission.estado === "programada";
      var action = canJoin ? '<button type="button" class="platform-primary compact" data-join-mission="' + escapeHtml(mission.id) + '">UNIRME A LA MISIÓN</button>' : canLeave ? '<button type="button" class="secondary-action" data-leave-mission="' + escapeHtml(mission.id) + '">CANCELAR INSCRIPCIÓN</button>' : '';
      var editAction = isStaff() ? '<button type="button" class="mission-edit-direct" data-edit-mission="' + escapeHtml(mission.id) + '">MODIFICAR MISIÓN</button>' : '';
      var myStatus = mine ? '<span class="mission-personal-status ' + escapeHtml(mine.estado) + '">' + escapeHtml(mine.rewarded_at ? "RECOMPENSA ACREDITADA: " + points(mission.recompensa_puntos) + " + " + money(mission.recompensa_dinero) : participantStatusLabel(mine.estado)) + '</span>' : '';
      var equipment = missionEquipment(mission);
      var equipmentBlock = equipment.length ? '<div class="mission-equipment"><strong>EQUIPAMIENTO PARA ESTA MISIÓN</strong><ul>' + equipment.map(function (item) { var owned = ownsEquipment(item); return '<li><span>' + escapeHtml(item) + '</span><small class="' + (owned ? "ready" : "check") + '">' + (owned ? "EN INVENTARIO" : "VERIFICAR") + '</small></li>'; }).join("") + '</ul></div>' : '<div class="mission-equipment"><strong>EQUIPAMIENTO PARA ESTA MISIÓN</strong><p>El mando aún no publicó una lista.</p></div>';
      return '<article class="mission-card ' + escapeHtml(mission.estado) + '"><div class="mission-card-top"><span class="mission-status">' + escapeHtml(missionStatusLabel(mission.estado)) + '</span><span>' + participants.length + ' participantes</span></div><h3>' + escapeHtml(mission.titulo) + '</h3><p>' + escapeHtml(mission.descripcion || "Sin descripción operativa.") + '</p><div class="mission-meta"><span><strong>FECHA</strong>' + escapeHtml(dateText(mission.fecha)) + '</span><span><strong>RECOMPENSA</strong>' + escapeHtml(points(mission.recompensa_puntos)) + ' · ' + escapeHtml(money(mission.recompensa_dinero)) + '</span></div>' + equipmentBlock + '<div class="mission-card-actions">' + myStatus + action + editAction + '</div></article>';
    }).join("") : '<p class="empty-state">No hay misiones publicadas.</p>';

    $("discordConnection").textContent = isSupabaseConfigured ? "DISCORD SEGURO" : "SIMULACIÓN LOCAL";
    $("discordEventLog").innerHTML = state.discordEvents.length ? state.discordEvents.map(function (event) {
      return '<div class="activity-row"><div><strong>' + escapeHtml(event.titulo || "Alerta de misión") + '</strong><small>' + escapeHtml(event.mensaje || "Evento enviado al canal operativo") + ' · ' + escapeHtml(dateText(event.created_at)) + '</small></div><span class="event-status ' + escapeHtml(event.estado || "pendiente") + '">' + escapeHtml((event.estado || "pendiente").toUpperCase()) + '</span></div>';
    }).join("") : '<p class="empty-state">Las alertas de misión aparecerán aquí.</p>';

    if (isStaff()) renderMissionAdmin();
  }

  function renderMissionAdmin() {
    $("missionAdminList").innerHTML = state.missions.length ? state.missions.map(function (mission) {
      var participants = state.missionParticipants.filter(function (row) { return String(row.mission_id) === String(mission.id); });
      var pending = participants.filter(function (row) { return ["confirmado", "ausente"].indexOf(row.estado) === -1; }).length;
      var participantRows = participants.length ? participants.map(function (participant) {
        var member = state.adminProfiles.find(function (row) { return String(row.id) === String(participant.user_id); });
        var voiceRows = state.voiceSessions.filter(function (row) { return String(row.mission_id) === String(mission.id) && (String(row.profile_id || "") === String(participant.user_id) || (member && member.discord_id && String(row.discord_id) === String(member.discord_id))); });
        var voiceSeconds = voiceRows.reduce(function (sum, row) { return sum + Number(row.duration_seconds || (row.left_at ? Math.max(0, (new Date(row.left_at) - new Date(row.joined_at)) / 1000) : 0)); }, 0);
        var inVoice = voiceRows.some(function (row) { return !row.left_at; });
        var voiceText = voiceRows.length ? ' · VOZ: ' + (inVoice ? 'CONECTADO · ' : '') + formatDuration(voiceSeconds) : ' · VOZ: SIN REGISTRO';
        return '<div class="attendance-row"><div><strong>' + escapeHtml(profileName(participant.user_id)) + '</strong><small>' + escapeHtml(participantStatusLabel(participant.estado)) + (participant.rewarded_at ? ' · RECOMPENSA ACREDITADA' : '') + escapeHtml(voiceText) + '</small></div><div class="admin-actions"><button type="button" data-review-participant="' + escapeHtml(participant.id) + '" data-review-status="confirmado" ' + (participant.estado === "confirmado" ? "disabled" : "") + '>CONFIRMAR</button><button type="button" data-review-participant="' + escapeHtml(participant.id) + '" data-review-status="ausente" ' + (participant.estado === "ausente" ? "disabled" : "") + '>AUSENTE</button></div></div>';
      }).join("") : '<p class="empty-state">Aún no hay inscritos.</p>';
      var startButton = mission.estado === "programada" ? '<button type="button" data-start-mission="' + escapeHtml(mission.id) + '">LANZAR MISIÓN</button>' : '';
      var finishButton = mission.estado === "activa" ? '<button type="button" class="finish-mission" data-finish-mission="' + escapeHtml(mission.id) + '" ' + (pending || !participants.length ? "disabled" : "") + '>TERMINAR Y ENTREGAR RECOMPENSAS</button>' : '';
      var confirmAll = mission.estado === "activa" && pending ? '<button type="button" data-confirm-all="' + escapeHtml(mission.id) + '">CONFIRMAR TODOS LOS PENDIENTES</button>' : '';
      var voiceChannel = mission.voice_channel_name || mission.voice_channel_id || "Sin canal asignado";
      return '<details class="mission-admin-card" ' + (mission.estado === "activa" ? "open" : "") + '><summary><span><strong>' + escapeHtml(mission.titulo) + '</strong><small>' + escapeHtml(missionStatusLabel(mission.estado)) + ' · ' + participants.length + ' participantes · Voz: ' + escapeHtml(voiceChannel) + ' · Premio: ' + escapeHtml(points(mission.recompensa_puntos)) + ' + ' + escapeHtml(money(mission.recompensa_dinero)) + '</small></span><span>' + pending + ' por revisar</span></summary><div class="mission-admin-body"><div class="mission-command-actions"><button type="button" data-edit-mission="' + escapeHtml(mission.id) + '">EDITAR DATOS Y RECOMPENSAS</button>' + startButton + confirmAll + finishButton + '</div><div class="attendance-list">' + participantRows + '</div>' + (mission.estado === "activa" && pending ? '<p class="mission-blocker">Debes confirmar o marcar ausente a cada participante antes de cerrar.</p>' : '') + '</div></details>';
    }).join("") : '<p class="empty-state">Crea la primera misión desde el formulario.</p>';
  }

  function formatDuration(seconds) {
    var total = Math.max(0, Math.round(Number(seconds || 0)));
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    return (hours ? hours + " h " : "") + minutes + " min";
  }

  async function sendDiscordEvent(eventId) {
    if (!eventId || !supabase.functions || !supabase.functions.invoke) return;
    var result = await supabase.functions.invoke("discord-mission-alert", { body: { event_id: eventId } });
    if (result && result.error && isSupabaseConfigured) setMessage("appMessage", "La inscripción se guardó, pero Discord no pudo recibir la alerta todavía.", "error");
  }

  async function syncDiscordRoles(userId, silent) {
    if (!userId || !supabase.functions || !supabase.functions.invoke) return;
    var result = await supabase.functions.invoke("discord-role-sync", { body: { user_id: userId } });
    if (result && result.error && isSupabaseConfigured && !silent) {
      setMessage("appMessage", "Los cambios se guardaron en la web, pero el rol de Discord no pudo sincronizarse todavía.", "error");
    }
  }

  async function joinMission(missionId) {
    var result = await supabase.rpc("join_mission", { p_mission_id: missionId });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    setMessage("appMessage", "Te uniste a la misión. La alerta operativa fue registrada para Discord.", "success");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    await loadPlatformData();
  }

  async function leaveMission(missionId) {
    var result = await supabase.rpc("leave_mission", { p_mission_id: missionId });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    setMessage("appMessage", "Tu inscripción fue cancelada.", "success");
    await loadPlatformData();
  }

  function resetMissionForm() {
    $("missionForm").reset();
    $("missionId").value = "";
    $("missionRewardPoints").value = "100";
    $("missionRewardMoney").value = "0";
    $("missionEquipment").value = "";
    $("missionServerUrl").value = "";
    $("missionVoiceChannelId").value = "";
    $("missionVoiceChannelName").value = "";
    $("missionSubmitBtn").textContent = "CREAR MISIÓN";
    $("cancelMissionEdit").classList.add("hidden");
  }

  async function saveMission(event) {
    event.preventDefault();
    var id = $("missionId").value;
    var serverUrl = safeRobloxUrl($("missionServerUrl").value.trim());
    if (!serverUrl) return setMessage("appMessage", "Usa un enlace HTTPS oficial de roblox.com para el servidor privado.", "error");
    var equipment = $("missionEquipment").value.split(/\n+/).map(function (item) { return item.trim(); }).filter(Boolean);
    if (!equipment.length) return setMessage("appMessage", "Añade al menos un elemento de equipamiento obligatorio.", "error");
    var result = await supabase.rpc("save_mission", {
      p_mission_id: id || null,
      p_title: $("missionTitle").value.trim(),
      p_description: $("missionDescription").value.trim(),
      p_date: new Date($("missionDate").value).toISOString(),
      p_reward_points: Math.max(0, parseInt($("missionRewardPoints").value, 10) || 0),
      p_reward_money: Math.max(0, parseInt($("missionRewardMoney").value, 10) || 0),
      p_status: $("missionStatus").value,
      p_private_server_url: serverUrl,
      p_required_equipment: equipment,
      p_voice_channel_id: $("missionVoiceChannelId").value.trim(),
      p_voice_channel_name: $("missionVoiceChannelName").value.trim()
    });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    setMessage("appMessage", id ? "Misión actualizada y anuncio enviado al bot." : "Misión creada y anuncio enviado al bot.", "success");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    resetMissionForm();
    await loadPlatformData();
  }

  function editMission(missionId) {
    var mission = state.missions.find(function (row) { return String(row.id) === String(missionId); });
    if (!mission) return;
    $("missionId").value = mission.id;
    $("missionTitle").value = mission.titulo;
    $("missionDescription").value = mission.descripcion || "";
    $("missionDate").value = new Date(mission.fecha).toISOString().slice(0, 16);
    $("missionStatus").value = mission.estado === "finalizada" ? "programada" : mission.estado;
    $("missionRewardPoints").value = mission.recompensa_puntos || 0;
    $("missionRewardMoney").value = mission.recompensa_dinero || 0;
    $("missionEquipment").value = missionEquipment(mission).join("\n");
    $("missionServerUrl").value = mission.private_server_url || "";
    $("missionVoiceChannelId").value = mission.voice_channel_id || "";
    $("missionVoiceChannelName").value = mission.voice_channel_name || "";
    $("missionSubmitBtn").textContent = "GUARDAR CAMBIOS";
    $("cancelMissionEdit").classList.remove("hidden");
    $("missionCommand").scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(function () { $("missionTitle").focus(); }, 350);
  }

  async function missionRpc(name, args, successMessage) {
    var result = await supabase.rpc(name, args);
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    setMessage("appMessage", successMessage, "success");
    if (result.data && result.data.event_ids) {
      for (var i = 0; i < result.data.event_ids.length; i++) await sendDiscordEvent(result.data.event_ids[i]);
    }
    await loadPlatformData();
  }

  async function confirmAllParticipants(missionId) {
    var pending = state.missionParticipants.filter(function (row) { return String(row.mission_id) === String(missionId) && ["confirmado", "ausente"].indexOf(row.estado) === -1; });
    for (var i = 0; i < pending.length; i++) {
      var result = await supabase.rpc("review_mission_participant", { p_participant_id: pending[i].id, p_status: "confirmado" });
      if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    }
    setMessage("appMessage", "Todos los participantes pendientes fueron confirmados.", "success");
    await loadPlatformData();
  }

  async function adjustMember(profileId) {
    var pointInput = document.querySelector('[data-points-for="' + profileId + '"]');
    var moneyInput = document.querySelector('[data-money-for="' + profileId + '"]');
    var pointsDelta = parseInt(pointInput.value, 10) || 0;
    var moneyDelta = parseInt(moneyInput.value, 10) || 0;
    if (!pointsDelta && !moneyDelta) return setMessage("appMessage", "Escribe una cantidad positiva o negativa para ajustar.", "error");
    var result = await supabase.rpc("adjust_member_balance", { p_user_id: profileId, p_points: pointsDelta, p_money: moneyDelta, p_reason: "Ajuste manual de mando" });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    setMessage("appMessage", "Puntos y saldo actualizados con registro de auditoría.", "success");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    if (result.data && result.data.promotion_event_id) await sendDiscordEvent(result.data.promotion_event_id);
    await syncDiscordRoles(profileId, true);
    await loadPlatformData();
  }

  function renderAdmin() {
    if (!isStaff()) return;
    var query = state.adminQuery.trim().toLowerCase();
    var visibleProfiles = state.adminProfiles.filter(function (profile) {
      return !query || [profile.nombre, profile.callsign, profile.usuario_roblox, profile.email, profile.rango, profile.rol, profile.estado].join(" ").toLowerCase().indexOf(query) !== -1;
    });
    $("adminProfiles").innerHTML = visibleProfiles.length ? visibleProfiles.map(function (profile) {
      var rankOptions = (window.RANGOS || []).map(function (rank) { return '<option value="' + escapeHtml(rank.rango) + '" ' + (rank.rango === profile.rango ? "selected" : "") + '>' + escapeHtml(rank.rango) + '</option>'; }).join("");
      var roleOptions = [["usuario", "Miembro"], ["staff", "Staff"], ["admin", "Administrador"], ["super_admin", "Alto Mando"]].map(function (entry) { return '<option value="' + entry[0] + '" ' + (profile.rol === entry[0] ? "selected" : "") + '>' + entry[1] + '</option>'; }).join("");
      var statusOptions = [["pendiente", "Pendiente"], ["activo", "Activo"], ["suspendido", "Suspendido"]].map(function (entry) { return '<option value="' + entry[0] + '" ' + (profile.estado === entry[0] ? "selected" : "") + '>' + entry[1] + '</option>'; }).join("");
      var inventory = state.adminInventory.filter(function (row) { return String(row.user_id) === String(profile.id); });
      var orders = state.adminOrders.filter(function (row) { return String(row.user_id) === String(profile.id); });
      var transactions = state.adminTransactions.filter(function (row) { return String(row.user_id) === String(profile.id); }).slice(0, 5);
      var inventoryText = inventory.length ? inventory.map(function (row) { var item = state.adminItems.find(function (candidate) { return String(candidate.id) === String(row.item_id); }); return escapeHtml((item && item.nombre) || "Implemento") + " ×" + Number(row.cantidad || 1); }).join(" · ") : "Sin implementos asignados";
      var invoiceText = orders.length ? orders.map(function (order) { return escapeHtml(order.invoice_number) + " — " + escapeHtml(money(order.total_dinero)) + (order.total_puntos ? " + " + escapeHtml(points(order.total_puntos)) : ""); }).join("<br>") : "Sin facturas";
      var movementText = transactions.length ? transactions.map(function (row) { return escapeHtml(row.descripcion) + " — " + escapeHtml(money(row.monto_dinero)) + " / " + escapeHtml(points(row.monto_puntos)); }).join("<br>") : "Sin movimientos";
      var grantedSpecialties = state.specialtyApplications.filter(function (row) { return String(row.user_id) === String(profile.id) && row.estado === "aprobada"; });
      var specialtyText = grantedSpecialties.length ? grantedSpecialties.map(function (row) { return escapeHtml(specialtyName(row.role_key)); }).join(" · ") : "Sin especialidades asignadas";
      var editor = canManageUsers() ? '<div class="profile-editor"><label><span>NOMBRE</span><input data-profile-field="nombre" data-profile-id="' + escapeHtml(profile.id) + '" value="' + escapeHtml(profile.nombre) + '" /></label><label><span>USUARIO OPERATIVO</span><input data-profile-field="callsign" data-profile-id="' + escapeHtml(profile.id) + '" value="' + escapeHtml(profile.callsign || profile.usuario_roblox) + '" /></label><label><span>USUARIO ROBLOX</span><input data-profile-field="usuario_roblox" data-profile-id="' + escapeHtml(profile.id) + '" value="' + escapeHtml(profile.usuario_roblox) + '" /></label><label class="wide"><span>CORREO</span><input type="email" pattern="^[^@\\s]+@usmcf\\.com$" title="Solo se aceptan correos @usmcf.com" data-profile-field="email" data-profile-id="' + escapeHtml(profile.id) + '" value="' + escapeHtml(profile.email) + '" /></label><label><span>PERMISO</span><select data-profile-field="rol" data-profile-id="' + escapeHtml(profile.id) + '">' + roleOptions + '</select></label><label><span>ESTADO</span><select data-profile-field="estado" data-profile-id="' + escapeHtml(profile.id) + '">' + statusOptions + '</select></label><label class="wide"><span>RANGO</span><select data-profile-field="rango" data-profile-id="' + escapeHtml(profile.id) + '">' + rankOptions + '</select></label><button class="wide" type="button" data-save-profile="' + escapeHtml(profile.id) + '">GUARDAR TODOS LOS CAMBIOS</button><label class="wide"><span>NUEVA CONTRASEÑA</span><input type="password" minlength="8" data-new-password-for="' + escapeHtml(profile.id) + '" placeholder="Mínimo 8 caracteres" /></label><button class="wide" type="button" data-reset-password="' + escapeHtml(profile.id) + '">CAMBIAR CONTRASEÑA</button></div>' : '';
      var specialtyAdmin = canManageUsers() ? '<div class="specialty-admin-control"><label><span>ASIGNAR ESPECIALIDAD</span><select data-specialty-grant-for="' + escapeHtml(profile.id) + '">' + specialtyCatalog.map(function (entry) { return '<option value="' + escapeHtml(entry.key) + '">' + escapeHtml(entry.name) + '</option>'; }).join("") + '</select></label><button type="button" data-grant-specialty="' + escapeHtml(profile.id) + '">OTORGAR</button><button type="button" data-revoke-specialty="' + escapeHtml(profile.id) + '">RETIRAR</button><small>Actuales: ' + specialtyText + '</small></div>' : '';
      var dossier = '<details class="member-dossier"><summary>VER INVENTARIO, FACTURAS, ESPECIALIDADES Y MOVIMIENTOS</summary><div class="dossier-grid"><div><strong>INVENTARIO</strong><p>' + inventoryText + '</p></div><div><strong>FACTURAS</strong><p>' + invoiceText + '</p></div><div><strong>ESPECIALIDADES</strong><p>' + specialtyText + '</p></div><div><strong>ÚLTIMOS MOVIMIENTOS</strong><p>' + movementText + '</p></div></div></details>';
      var accordionAction = canManageUsers() ? "MODIFICAR" : "PUNTOS Y SALDO";
      return '<details class="admin-person member-accordion"><summary class="member-summary"><div><strong>' + escapeHtml(profile.nombre || profile.email) + '</strong><small>@' + escapeHtml(profile.callsign || profile.usuario_roblox) + ' · Roblox: ' + escapeHtml(profile.usuario_roblox) + ' · ' + escapeHtml(profile.estado) + ' · ' + escapeHtml(profile.rol) + ' · ' + escapeHtml(profile.rango) + '</small></div><div class="member-summary-balance"><strong>' + escapeHtml(points(profile.puntos)) + '</strong><small>' + escapeHtml(money(profile.dinero)) + '</small></div><span class="accordion-hint">' + accordionAction + '</span></summary><div class="member-admin-panel"><div><small>Último ingreso: ' + escapeHtml(dateText(profile.last_login)) + '</small>' + editor + specialtyAdmin + dossier + '</div><div class="admin-actions member-management"><label><span>SUMAR/RESTAR PUNTOS</span><input type="number" value="0" data-points-for="' + escapeHtml(profile.id) + '" /></label><label><span>SUMAR/RESTAR USD</span><input type="number" value="0" data-money-for="' + escapeHtml(profile.id) + '" /></label><button type="button" data-adjust-member="' + escapeHtml(profile.id) + '">APLICAR AJUSTE</button><small>Usa números negativos para descontar.</small></div></div></details>';
    }).join("") : '<p class="empty-state">No hay usuarios que coincidan con la búsqueda.</p>';
    renderTrainingQueue();
    renderSpecialtyApplicationQueue();
    renderSpecialtyTrainingQueue();
    renderStaffTicketQueue();
    renderFactionDirectory();
    $("adminCatalog").innerHTML = state.adminItems.length ? state.adminItems.map(function (item) {
      return '<div class="admin-catalog-row"><div><strong>' + escapeHtml(item.nombre) + '</strong><small>' + escapeHtml(item.tipo) + ' · ' + (item.precio_dinero ? money(item.precio_dinero) : points(item.precio_puntos)) + ' · ' + (item.disponible ? "publicado" : "oculto") + '</small></div><div class="admin-actions"><button type="button" data-edit-item="' + escapeHtml(item.id) + '">EDITAR</button><button type="button" data-toggle-item="' + escapeHtml(item.id) + '" data-next="' + String(!item.disponible) + '">' + (item.disponible ? "OCULTAR" : "PUBLICAR") + '</button></div></div>';
    }).join("") : '<p class="empty-state">No hay implementos creados.</p>';
  }

  function renderFactionDirectory() {
    var query = state.adminQuery.trim().toLowerCase();
    var members = state.factionMembers.filter(function (member) {
      return !query || [member.display_name, member.username, member.institutional_email].join(" ").toLowerCase().indexOf(query) !== -1;
    });
    $("factionMemberCount").textContent = state.factionMembers.length + (state.factionMembers.length === 1 ? " MIEMBRO" : " MIEMBROS");
    $("factionDirectory").innerHTML = members.length ? members.map(function (member) {
      var profile = state.adminProfiles.find(function (row) { return String(row.id) === String(member.profile_id) || String(row.discord_id || "") === String(member.discord_id); });
      var statusText = !member.is_active ? "FUERA DEL SERVIDOR" : profile ? "VINCULADO" : "SIN ACTIVAR";
      var statusDetail = profile ? escapeHtml(profile.rango) + ' · ' + escapeHtml(points(profile.puntos)) : member.is_active ? "Debe entrar o vincular Discord" : "Su expediente y puntos se conservan";
      var avatar = member.avatar_url ? '<img src="' + escapeHtml(member.avatar_url) + '" alt="" loading="lazy" />' : '<span>' + escapeHtml(initials(member.display_name)) + '</span>';
      return '<article class="faction-member">' + avatar + '<div><strong>' + escapeHtml(member.display_name) + '</strong><small>@' + escapeHtml(member.username) + '</small><small>' + escapeHtml(member.institutional_email) + '</small></div><div class="faction-link-state ' + (profile ? "linked" : "pending") + '"><strong>' + statusText + '</strong><small>' + statusDetail + '</small></div></article>';
    }).join("") : '<p class="empty-state">El bot está esperando su primera sincronización con el servidor de Discord.</p>';
  }

  function renderTrainingQueue() {
    var pending = state.trainingAssignments.filter(function (row) { return row.estado !== "finalizado"; }).length;
    $("trainingPendingCount").textContent = pending + (pending === 1 ? " PENDIENTE" : " PENDIENTES");
    $("trainingQueue").innerHTML = state.trainingAssignments.length ? state.trainingAssignments.map(function (assignment) {
      var recruit = state.adminProfiles.find(function (row) { return String(row.id) === String(assignment.user_id); });
      var trainer = state.adminProfiles.find(function (row) { return String(row.id) === String(assignment.trainer_id); });
      var canFinish = assignment.estado === "en_curso" && (canManageUsers() || String(assignment.trainer_id) === String(state.user.id));
      var actions = assignment.estado === "asignado" ? '<button type="button" data-take-training="' + escapeHtml(assignment.id) + '">TOMAR ENTRENAMIENTO</button>' : canFinish ? '<button type="button" data-finish-training="' + escapeHtml(assignment.id) + '">FINALIZAR Y GRADUAR</button>' : '';
      return '<div class="training-row"><div><strong>' + escapeHtml(recruit ? recruit.nombre : "Recluta") + '</strong><small>Entrenamiento Básico TRS · Roblox: ' + escapeHtml(recruit ? recruit.usuario_roblox : "Pendiente") + '</small><small>Instructor: ' + escapeHtml(trainer ? trainer.nombre : "Sin asignar") + '</small><span class="training-status">' + escapeHtml(String(assignment.estado || "asignado").replace("_", " ").toUpperCase()) + '</span></div><div class="admin-actions">' + actions + '</div></div>';
    }).join("") : '<p class="empty-state">No hay entrenamientos asignados.</p>';
  }

  function renderSpecialtyApplicationQueue() {
    var pending = state.specialtyApplications.filter(function (row) { return row.estado === "pendiente"; });
    $("specialtyPendingCount").textContent = pending.length + (pending.length === 1 ? " PENDIENTE" : " PENDIENTES");
    $("specialtyApplicationQueue").innerHTML = state.specialtyApplications.length ? state.specialtyApplications.map(function (application) {
      var specialty = specialtyCatalog.find(function (entry) { return entry.key === application.role_key; });
      var reviewed = application.estado !== "pendiente";
      return '<div class="training-row"><div><strong>' + escapeHtml(profileName(application.user_id)) + ' · ' + escapeHtml(specialty ? specialty.name : application.role_key) + '</strong><small>Solicitada: ' + escapeHtml(dateText(application.created_at)) + (application.reviewed_at ? ' · Revisada: ' + escapeHtml(dateText(application.reviewed_at)) : '') + '</small><span class="training-status">' + escapeHtml(application.estado.toUpperCase()) + '</span></div><div class="admin-actions"><button type="button" data-review-specialty="' + escapeHtml(application.id) + '" data-specialty-status="aprobada" ' + (reviewed ? "disabled" : "") + '>APROBAR ROL</button><button type="button" data-review-specialty="' + escapeHtml(application.id) + '" data-specialty-status="rechazada" ' + (reviewed ? "disabled" : "") + '>RECHAZAR</button></div></div>';
    }).join("") : '<p class="empty-state">Todavía no hay solicitudes de especialidad.</p>';
  }

  function renderSpecialtyTrainingQueue() {
    var open = state.specialtyTrainingRequests.filter(function (row) { return ["pendiente", "asignado", "en_curso"].indexOf(row.estado) !== -1; });
    $("specialtyTrainingPendingCount").textContent = open.length + (open.length === 1 ? " PENDIENTE" : " PENDIENTES");
    $("specialtyTrainingQueue").innerHTML = state.specialtyTrainingRequests.length ? state.specialtyTrainingRequests.map(function (request) {
      var trainer = state.adminProfiles.find(function (row) { return String(row.id) === String(request.trainer_id); });
      var ageDays = Math.floor((Date.now() - new Date(request.created_at).getTime()) / 86400000);
      var overdue = ageDays >= 3 && ["pendiente", "asignado"].indexOf(request.estado) !== -1;
      var actions = request.estado === "pendiente" ? '<button type="button" data-training-request-action="tomar" data-training-request-id="' + escapeHtml(request.id) + '">TOMAR CURSO</button><button type="button" data-training-request-action="rechazar" data-training-request-id="' + escapeHtml(request.id) + '">RECHAZAR</button>' : request.estado === "en_curso" && (canManageUsers() || String(request.trainer_id) === String(state.user.id)) ? '<button type="button" data-training-request-action="finalizar" data-training-request-id="' + escapeHtml(request.id) + '">FINALIZAR Y OTORGAR ROL</button>' : '';
      return '<div class="training-row ' + (overdue ? "overdue" : "") + '"><div><strong>@' + escapeHtml(profileName(request.user_id)) + ' · ' + escapeHtml(specialtyName(request.specialty_key)) + '</strong><small>Solicitado: ' + escapeHtml(dateText(request.created_at)) + ' · Instructor: ' + escapeHtml(trainer ? trainer.nombre : "Sin asignar") + '</small><small>' + escapeHtml(request.notes || "Sin comentario") + '</small><span class="training-status">' + (overdue ? "DEMORA DE " + ageDays + " DÍAS · BOT AVISARÁ A STAFF" : escapeHtml(String(request.estado).replace("_", " ").toUpperCase())) + '</span></div><div class="admin-actions">' + actions + '</div></div>';
    }).join("") : '<p class="empty-state">No hay entrenamientos de especialidad solicitados.</p>';
  }

  function renderStaffTicketQueue() {
    var open = state.tickets.filter(function (ticket) { return ["abierto", "en_revision"].indexOf(ticket.estado) !== -1; });
    $("ticketQueueCount").textContent = open.length + (open.length === 1 ? " ABIERTO" : " ABIERTOS");
    $("staffTicketQueue").innerHTML = state.tickets.length ? state.tickets.map(function (ticket) { return ticketCard(ticket, true); }).join("") : '<p class="empty-state">No hay tickets o reportes.</p>';
    var basicPending = state.trainingAssignments.filter(function (row) { return row.estado !== "finalizado"; }).length;
    var total = basicPending + open.length + state.specialtyTrainingRequests.filter(function (row) { return ["pendiente", "asignado"].indexOf(row.estado) !== -1; }).length;
    $("staffPendingBadge").textContent = total;
    $("staffPendingBadge").classList.toggle("hidden", !total);
  }

  async function createAdminUser(event) {
    event.preventDefault();
    if (!isOfficialEmail($("newUserEmail").value)) return setMessage("appMessage", "Solo se aceptan correos institucionales @usmcf.com.", "error");
    var button = $("createUserBtn");
    setBusy(button, true, "CREANDO…");
    var result = await supabase.functions.invoke("admin-users", { body: { action: "create", email: $("newUserEmail").value.trim(), password: $("newUserPassword").value, nombre: $("newUserName").value.trim(), usuario_roblox: $("newUserRoblox").value.trim(), callsign: $("newUserCallsign").value.trim(), rol: $("newUserRole").value } });
    setBusy(button, false);
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    $("adminUserForm").reset();
    $("adminCreatePanel").open = false;
    setMessage("appMessage", "Usuario creado como Recluta. El Entrenamiento Básico TRS fue asignado automáticamente.", "success");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    await loadAdminData();
  }

  async function saveProfile(profileId) {
    var payload = { action: "update", user_id: profileId };
    document.querySelectorAll('[data-profile-id="' + profileId + '"]').forEach(function (field) { payload[field.dataset.profileField] = field.value; });
    if (!isOfficialEmail(payload.email)) return setMessage("appMessage", "El correo del perfil debe terminar en @usmcf.com.", "error");
    var result = await supabase.functions.invoke("admin-users", { body: payload });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    setMessage("appMessage", "Perfil, permisos y rango actualizados.", "success");
    await syncDiscordRoles(profileId, false);
    await loadPlatformData();
  }

  async function resetMemberPassword(profileId) {
    var input = document.querySelector('[data-new-password-for="' + profileId + '"]');
    var password = input ? input.value : "";
    if (password.length < 8) return setMessage("appMessage", "La nueva contraseña debe tener al menos 8 caracteres.", "error");
    var result = await supabase.functions.invoke("admin-users", { body: { action: "reset_password", user_id: profileId, password: password } });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    input.value = "";
    setMessage("appMessage", "Contraseña cambiada por Administración.", "success");
  }

  async function adminSetSpecialty(profileId, enabled) {
    if (!canManageUsers()) return;
    var select = document.querySelector('[data-specialty-grant-for="' + profileId + '"]');
    if (!select) return;
    var result = await supabase.rpc("admin_set_specialty", { p_user_id: profileId, p_specialty_key: select.value, p_enabled: enabled });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    await syncDiscordRoles(profileId, false);
    setMessage("appMessage", enabled ? "Especialidad otorgada y enviada al bot de Discord." : "Especialidad retirada y roles sincronizados.", "success");
    await loadPlatformData();
  }

  async function trainingAction(name, assignmentId, message) {
    var assignment = state.trainingAssignments.find(function (row) { return String(row.id) === String(assignmentId); });
    var result = await supabase.rpc(name, { p_assignment_id: assignmentId });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    setMessage("appMessage", message, "success");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    if (name === "finish_training" && assignment) await syncDiscordRoles(assignment.user_id, false);
    await loadPlatformData();
  }

  function resetItemForm() {
    state.editingItemId = null;
    $("adminItemForm").reset();
    $("adminItemStock").value = "-1";
    $("adminItemSubmit").textContent = "PUBLICAR EN LA STORE";
    $("cancelItemEdit").classList.add("hidden");
    $("adminStoreTitle").textContent = "Publicar implemento";
  }

  function editStoreItem(itemId) {
    if (!isStaff()) return;
    var item = state.adminItems.find(function (candidate) { return String(candidate.id) === String(itemId); });
    if (!item) return;
    state.editingItemId = item.id;
    $("adminItemName").value = item.nombre || "";
    $("adminItemDescription").value = item.descripcion || "";
    $("adminItemImage").value = item.imagen_url || "";
    $("adminItemType").value = item.tipo || "uniforme";
    $("adminItemStock").value = Number.isFinite(Number(item.stock)) ? String(item.stock) : "-1";
    $("adminItemMoney").value = String(Number(item.precio_dinero || 0));
    $("adminItemPoints").value = String(Number(item.precio_puntos || 0));
    $("adminItemSubmit").textContent = "GUARDAR CAMBIOS";
    $("cancelItemEdit").classList.remove("hidden");
    $("adminStoreTitle").textContent = "Editar implemento";
    $("adminItemName").focus();
    $("adminStorePanel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function publishItem(event) {
    event.preventDefault();
    if (!isStaff()) return setMessage("appMessage", "Solo Staff y Administración pueden publicar implementos.", "error");
    var moneyPrice = Math.max(0, parseInt($("adminItemMoney").value, 10) || 0);
    var pointPrice = Math.max(0, parseInt($("adminItemPoints").value, 10) || 0);
    if (!moneyPrice && !pointPrice) return setMessage("appMessage", "El implemento necesita un precio en dinero o puntos.", "error");
    var itemData = {
      nombre: $("adminItemName").value.trim(),
      descripcion: $("adminItemDescription").value.trim(),
      tipo: $("adminItemType").value,
      stock: parseInt($("adminItemStock").value, 10),
      precio_dinero: moneyPrice,
      precio_puntos: pointPrice,
      imagen_url: $("adminItemImage").value.trim(),
      disponible: true
    };
    var result = state.editingItemId
      ? await supabase.from("shop_items").update(itemData).eq("id", state.editingItemId)
      : await supabase.from("shop_items").insert(itemData);
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    var wasEditing = Boolean(state.editingItemId);
    resetItemForm();
    setMessage("appMessage", wasEditing ? "Implemento actualizado en la Store." : "Implemento publicado en la Store.", "success");
    await loadPlatformData();
  }

  async function publishAnnouncement(event) {
    event.preventDefault();
    if (!canManageUsers()) return setMessage("appMessage", "Solo Administración puede publicar anuncios.", "error");
    var button = $("announcementSubmit");
    setBusy(button, true, "ENVIANDO…");
    var result = await supabase.rpc("publish_announcement", { p_title: $("announcementTitle").value.trim(), p_message: $("announcementBody").value.trim(), p_kind: $("announcementKind").value, p_channel_key: $("announcementChannel").value, p_embed_color: parseInt($("announcementColor").value, 10) });
    setBusy(button, false);
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    $("announcementForm").reset();
    setMessage("appMessage", "Anuncio entregado a la cola segura del bot de Discord.", "success");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    await loadPlatformData();
  }

  function switchView(view) {
    if (view === "administracion" && !isStaff()) return;
    if (view === "salario" && canManageUsers()) {
      setMessage("appMessage", "Administración usa fondos de mando sin límite y no recibe salario.", "success");
      view = "resumen";
    }
    var titles = { resumen: "CENTRO DE CONTROL", salario: "MI SALARIO", tienda: "STORE", inventario: "INVENTARIO Y FACTURAS", misiones: "MISIONES", entrenamiento: "MI ENTRENAMIENTO", especialidades: "ESPECIALIDADES", tickets: "TICKETS Y REPORTES", biblioteca: "BIBLIOTECA OPERATIVA", administracion: canManageUsers() ? "INTEGRANTES" : "CENTRO DE STAFF" };
    document.querySelectorAll(".member-nav-btn").forEach(function (button) { button.classList.toggle("active", button.dataset.view === view); });
    document.querySelectorAll(".member-view").forEach(function (panel) { panel.classList.toggle("active", panel.dataset.panel === view); });
    $("viewTitle").textContent = titles[view] || "PLATAFORMA";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function login(event) {
    event.preventDefault();
    setMessage("authMessage", "");
    var email = $("loginEmail").value.trim();
    if (!isOfficialEmail(email)) return setMessage("authMessage", "Debes ingresar con tu correo oficial @usmcf.com.", "error");
    var button = $("loginBtn");
    setBusy(button, true, "VERIFICANDO…");
    var result = await supabase.auth.signInWithPassword({ email: email, password: $("loginPassword").value });
    setBusy(button, false);
    if (result.error) return setMessage("authMessage", errorText(result.error), "error");
    await enterPlatform(result.data.user);
  }

  async function register(event) {
    event.preventDefault();
    setMessage("authMessage", "");
    var email = $("registerEmail").value.trim();
    if (!isOfficialEmail(email)) return setMessage("authMessage", "Solo se aceptan correos institucionales @usmcf.com.", "error");
    var button = $("registerBtn");
    setBusy(button, true, "CREANDO…");
    var result = await supabase.auth.signUp({
      email: email,
      password: $("registerPassword").value,
      options: { data: { nombre: $("registerName").value.trim(), usuario_roblox: $("registerRoblox").value.trim(), callsign: $("registerCallsign").value.trim() } }
    });
    setBusy(button, false);
    if (result.error) return setMessage("authMessage", errorText(result.error), "error");
    setMessage("authMessage", "Solicitud creada. El staff debe aprobar tu entrenamiento antes de habilitar compras.", "success");
    if (result.data && result.data.user && result.data.session) await enterPlatform(result.data.user);
  }

  async function loginWithDiscord() {
    if (!isSupabaseConfigured) return setMessage("authMessage", "Conecta Supabase y activa el proveedor Discord para usar la vinculación automática.");
    var result = await supabase.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin + window.location.pathname } });
    if (result.error) setMessage("authMessage", errorText(result.error), "error");
  }

  async function linkDiscordIdentity() {
    if (state.profile && state.profile.discord_id) return;
    if (!isSupabaseConfigured) return setMessage("appMessage", "La vinculación real se habilita al conectar Supabase y Discord.");
    var result = await supabase.auth.linkIdentity({ provider: "discord", options: { redirectTo: window.location.origin + window.location.pathname } });
    if (result.error) setMessage("appMessage", errorText(result.error), "error");
  }

  async function logout() {
    await supabase.auth.signOut();
    state.user = null; state.profile = null; state.cart = [];
    $("memberView").classList.add("hidden");
    $("authView").classList.remove("hidden");
    $("logoutBtn").classList.add("hidden");
    setMessage("appMessage", "");
    switchAuth("login");
  }

  function bindEvents() {
    $("loginTab").addEventListener("click", function () { switchAuth("login"); });
    $("registerTab").addEventListener("click", function () { switchAuth("register"); });
    $("loginForm").addEventListener("submit", login);
    $("registerForm").addEventListener("submit", register);
    $("discordLoginBtn").addEventListener("click", loginWithDiscord);
    $("linkDiscordBtn").addEventListener("click", linkDiscordIdentity);
    $("logoutBtn").addEventListener("click", logout);
    $("cartButton").addEventListener("click", openCart);
    $("closeCartBtn").addEventListener("click", closeCart);
    $("cartBackdrop").addEventListener("click", closeCart);
    $("checkoutBtn").addEventListener("click", checkout);
    $("adminItemForm").addEventListener("submit", publishItem);
    $("cancelItemEdit").addEventListener("click", resetItemForm);
    $("adminUserForm").addEventListener("submit", createAdminUser);
    $("announcementForm").addEventListener("submit", publishAnnouncement);
    $("specialtyTrainingForm").addEventListener("submit", requestSpecialtyTraining);
    $("ticketForm").addEventListener("submit", createTicket);
    $("missionForm").addEventListener("submit", saveMission);
    $("cancelMissionEdit").addEventListener("click", resetMissionForm);
    $("librarySearch").addEventListener("input", function (event) { state.libraryQuery = event.target.value; renderLibrary(); });
    $("adminUserSearch").addEventListener("input", function (event) { state.adminQuery = event.target.value; renderAdmin(); });
    document.addEventListener("toggle", function (event) {
      var opened = event.target;
      if (!opened.matches || !opened.matches(".member-accordion") || !opened.open) return;
      document.querySelectorAll(".member-accordion[open]").forEach(function (panel) {
        if (panel !== opened) panel.open = false;
      });
    }, true);
    document.addEventListener("click", function (event) {
      var nav = event.target.closest("[data-view], [data-go]");
      if (nav) switchView(nav.dataset.view || nav.dataset.go);
      var add = event.target.closest("[data-add]");
      if (add) addToCart(add.dataset.add);
      var remove = event.target.closest("[data-remove]");
      if (remove) { state.cart = state.cart.filter(function (entry) { return String(entry.item.id) !== String(remove.dataset.remove); }); renderCart(); }
      var invoice = event.target.closest("[data-invoice]");
      if (invoice) downloadInvoice(invoice.dataset.invoice);
      var join = event.target.closest("[data-join-mission]");
      if (join) joinMission(join.dataset.joinMission);
      var leave = event.target.closest("[data-leave-mission]");
      if (leave) leaveMission(leave.dataset.leaveMission);
      var editMissionButton = event.target.closest("[data-edit-mission]");
      if (editMissionButton) editMission(editMissionButton.dataset.editMission);
      var startMissionButton = event.target.closest("[data-start-mission]");
      if (startMissionButton) missionRpc("start_mission", { p_mission_id: startMissionButton.dataset.startMission }, "Misión lanzada. Los participantes figuran ahora en misión.");
      var reviewParticipant = event.target.closest("[data-review-participant]");
      if (reviewParticipant) missionRpc("review_mission_participant", { p_participant_id: reviewParticipant.dataset.reviewParticipant, p_status: reviewParticipant.dataset.reviewStatus }, "Asistencia actualizada.");
      var confirmAll = event.target.closest("[data-confirm-all]");
      if (confirmAll) confirmAllParticipants(confirmAll.dataset.confirmAll);
      var finishMissionButton = event.target.closest("[data-finish-mission]");
      if (finishMissionButton) missionRpc("finish_mission", { p_mission_id: finishMissionButton.dataset.finishMission }, "Misión terminada. Recompensas entregadas a los asistentes confirmados.");
      var adjustMemberButton = event.target.closest("[data-adjust-member]");
      if (adjustMemberButton) adjustMember(adjustMemberButton.dataset.adjustMember);
      var saveProfileButton = event.target.closest("[data-save-profile]");
      if (saveProfileButton) saveProfile(saveProfileButton.dataset.saveProfile);
      var resetPasswordButton = event.target.closest("[data-reset-password]");
      if (resetPasswordButton) resetMemberPassword(resetPasswordButton.dataset.resetPassword);
      var grantSpecialtyButton = event.target.closest("[data-grant-specialty]");
      if (grantSpecialtyButton) adminSetSpecialty(grantSpecialtyButton.dataset.grantSpecialty, true);
      var revokeSpecialtyButton = event.target.closest("[data-revoke-specialty]");
      if (revokeSpecialtyButton) adminSetSpecialty(revokeSpecialtyButton.dataset.revokeSpecialty, false);
      var takeTrainingButton = event.target.closest("[data-take-training]");
      if (takeTrainingButton) trainingAction("take_training", takeTrainingButton.dataset.takeTraining, "Entrenamiento tomado. Ya figuras como instructor responsable.");
      var finishTrainingButton = event.target.closest("[data-finish-training]");
      if (finishTrainingButton) trainingAction("finish_training", finishTrainingButton.dataset.finishTraining, "Entrenamiento finalizado. El recluta fue activado y ascendido automáticamente a Soldado.");
      var specialtyButton = event.target.closest("[data-apply-specialty]");
      if (specialtyButton) applySpecialty(specialtyButton.dataset.applySpecialty);
      var specialtyReview = event.target.closest("[data-review-specialty]");
      if (specialtyReview) reviewSpecialtyApplication(specialtyReview.dataset.reviewSpecialty, specialtyReview.dataset.specialtyStatus);
      var trainingRequestAction = event.target.closest("[data-training-request-action]");
      if (trainingRequestAction) specialtyTrainingAction(trainingRequestAction.dataset.trainingRequestId, trainingRequestAction.dataset.trainingRequestAction);
      var ticketStatus = event.target.closest("[data-ticket-status]");
      if (ticketStatus) updateTicketStatus(ticketStatus.dataset.ticketId, ticketStatus.dataset.ticketStatus);
      var storeFilter = event.target.closest("[data-category]");
      if (storeFilter) {
        state.storeCategory = storeFilter.dataset.category;
        document.querySelectorAll(".store-filter").forEach(function (button) { button.classList.toggle("active", button === storeFilter); });
        renderStore();
      }
      var libraryFilter = event.target.closest("[data-library]");
      if (libraryFilter) {
        state.libraryCategory = libraryFilter.dataset.library;
        document.querySelectorAll(".library-filter").forEach(function (button) { button.classList.toggle("active", button === libraryFilter); });
        renderLibrary();
      }
      var approve = event.target.closest("[data-approve]");
      if (approve) {
        supabase.from("profiles").update({ estado: "activo" }).eq("id", approve.dataset.approve).then(async function (result) {
          if (result.error) setMessage("appMessage", errorText(result.error), "error");
          else { setMessage("appMessage", "Miembro aprobado y acceso habilitado.", "success"); await loadAdminData(); }
        });
      }
      var toggleItem = event.target.closest("[data-toggle-item]");
      if (toggleItem) {
        supabase.from("shop_items").update({ disponible: toggleItem.dataset.next === "true" }).eq("id", toggleItem.dataset.toggleItem).then(async function (result) {
          if (result.error) setMessage("appMessage", errorText(result.error), "error");
          else await loadPlatformData();
        });
      }
      var editItemButton = event.target.closest("[data-edit-item]");
      if (editItemButton) editStoreItem(editItemButton.dataset.editItem);
    });
    document.addEventListener("change", function (event) {
      var rank = event.target.closest("[data-rank]");
      if (!rank) return;
      supabase.from("profiles").update({ rango: rank.value }).eq("id", rank.dataset.rank).then(async function (result) {
        if (result.error) setMessage("appMessage", errorText(result.error), "error");
        else { setMessage("appMessage", "Rango actualizado.", "success"); await loadAdminData(); }
      });
    });
    document.addEventListener("submit", function (event) {
      var replyForm = event.target.closest("[data-ticket-reply-form]");
      if (!replyForm) return;
      event.preventDefault();
      addTicketComment(replyForm.dataset.ticketReplyForm);
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeCart(); });
  }

  bindEvents();
  renderLibrary();
  renderCart();
  loadSession();
})();
