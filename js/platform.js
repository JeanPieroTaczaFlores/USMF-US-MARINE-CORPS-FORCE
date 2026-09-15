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
    discordEvents: [],
    trainingAssignments: [],
    cart: [],
    storeCategory: "todos",
    libraryCategory: "todos",
    libraryQuery: "",
    adminQuery: ""
  };

  var libraryEntries = [
    { category: "reglas", title: "Conducta y respeto", summary: "Trato cortés, coordinación clara y cero tolerancia al comportamiento irrespetuoso.", bullets: ["Respeta a todos los miembros", "Comunicación breve durante misión", "Las ausencias deben justificarse"] },
    { category: "reglas", title: "Cadena de mando", summary: "Las órdenes de instructores, suboficiales y Alto Mando se cumplen dentro de la operación.", bullets: ["Sigue el canal de mando", "No interrumpas comunicaciones", "Reporta incidentes por la vía oficial"] },
    { category: "manuales", title: "Ingreso y entrenamiento TRS", summary: "Proceso desde la solicitud hasta la asignación de unidad.", bullets: ["Registro y verificación", "Entrenamiento inicial TRS", "Graduación y asignación de rol"] },
    { category: "manuales", title: "Uniforme y equipo", summary: "Configuración visual oficial para mantener disciplina y reconocimiento de aliados.", bullets: ["MCCUU desierto o bosque", "Colores Tan / Coyote Brown", "Accesorios de Store sólo si están aprobados"] },
    { category: "armas", title: "Infantería", summary: "Armamento autorizado para el elemento de infantería regular.", bullets: ["RF416 A3, M16A4 o M4 Carbine", "Mira M150 y cargador USGI", "Secundaria M9A1 Beretta"] },
    { category: "armas", title: "MARSOC y tiradores", summary: "Configuraciones reservadas para operadores y especialidades aprobadas.", bullets: ["RF416 A5 para MARSOC", "SCAR-L: máximo un operador por equipo", "RF417 exclusivo para tirador designado MARSOC"] },
    { category: "armas", title: "Armas de especialidad", summary: "Equipo asignado por función; no puede usarse fuera de la especialidad.", bullets: ["M249 para Machine Gunner", "M1014 para brecha del Combat Engineer", "M24, L115A3 o M110 para tiradores autorizados"] },
    { category: "loadouts", title: "Asalto / CQB", summary: "Carga ligera para movilidad máxima en incursiones y combate cercano.", bullets: ["Sin mochila", "Munición y material médico esencial", "Arma definida por división"] },
    { category: "loadouts", title: "Patrulla / Reconocimiento", summary: "Carga media orientada a autonomía, observación y navegación.", bullets: ["Mochila con autorización", "Raciones, kit médico y binoculares", "Brújula y equipo de comunicaciones"] },
    { category: "loadouts", title: "Operación nocturna", summary: "Configuración especial para visibilidad, identificación y control del ruido.", bullets: ["NVG sólo en misión nocturna", "IR Strobe recomendado", "Supresor bajo autorización"] },
    { category: "loadouts", title: "Despliegue anfibio", summary: "Equipo ligero e impermeable para operaciones costeras en el mapa Sea.", bullets: ["Prioriza movilidad", "Protege el material esencial", "Sigue la configuración indicada por el mando"] },
    { category: "manuales", title: "Controles y servidores", summary: "Guía de radio, postura, inclinación, accesorios e ingreso a servidores privados.", bullets: ["Configura teclas antes del despliegue", "Verifica radio y accesorios", "Usa sólo enlaces oficiales"] }
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

  async function loadSession() {
    if (!supabase) {
      setMessage("authMessage", "No se pudo iniciar el sistema de acceso.", "error");
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
      state.profile = await getProfile(user.id);
      if (!state.profile) throw new Error("Tu cuenta todavía no tiene un perfil vinculado.");
      $("authView").classList.add("hidden");
      $("memberView").classList.remove("hidden");
      $("logoutBtn").classList.remove("hidden");
      if (!isSupabaseConfigured) $("demoAccess").classList.remove("hidden");
      hydrateIdentity();
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
    $("welcomeTitle").textContent = "Bienvenido, " + (p.nombre || p.usuario_roblox || "Marine");
    $("serviceId").textContent = String(p.id).slice(0, 8).toUpperCase();
    $("summaryRank").textContent = p.rango || "Sin rango";
    $("summaryPoints").textContent = Number(p.puntos || 0).toLocaleString("es-PE");
    $("topBalance").textContent = money(p.dinero);
    var rank = (window.RANGOS || []).find(function (entry) { return entry.rango === p.rango; });
    $("salaryAmount").textContent = money(rank ? rank.salario : 0);
    $("summarySalary").textContent = money(rank ? rank.salario : 0);
    $("salaryRank").textContent = "Tarifa de " + (p.rango || "rango sin asignar");
    $("lastPayment").textContent = p.ultimo_salario ? dateText(p.ultimo_salario) : "Primer pago pendiente";
    var next = p.ultimo_salario ? new Date(new Date(p.ultimo_salario).getTime() + 7 * 86400000) : new Date();
    $("nextPayment").textContent = dateText(next);
    $("summaryPayDate").textContent = next <= new Date() ? "En proceso" : dateText(next);
    $("adminNav").classList.toggle("hidden", !isStaff());
    $("missionCommand").classList.toggle("hidden", !isStaff());
    $("adminCreatePanel").classList.toggle("hidden", !canManageUsers());
  }

  function isStaff() {
    return state.profile && ["staff", "admin", "super_admin"].indexOf(state.profile.rol) !== -1;
  }

  function canManageUsers() {
    return state.profile && ["admin", "super_admin"].indexOf(state.profile.rol) !== -1;
  }

  async function verifySalary() {
    if (!state.profile || state.profile.estado !== "activo") return;
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
      supabase.from("training_assignments").select("*").order("assigned_at", { ascending: false })
    ]);
    state.transactions = results[0].data || [];
    state.items = results[1].data || [];
    state.inventory = results[2].data || [];
    state.orders = results[3].data || [];
    state.missions = results[4].data || [];
    state.missionParticipants = results[5].data || [];
    state.discordEvents = results[6].data || [];
    state.trainingAssignments = results[7].data || [];
    state.profile = await getProfile(userId);
    hydrateIdentity();
    renderTransactions();
    renderStore();
    renderInventory();
    renderInvoices();
    renderMissions();
    renderOnboarding();
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
      supabase.from("transactions").select("*").order("created_at", { ascending: false })
    ]);
    state.adminProfiles = results[0].data || [];
    state.adminItems = results[1].data || [];
    state.trainingAssignments = results[2].data || [];
    state.adminInventory = results[3].data || [];
    state.adminOrders = results[4].data || [];
    state.adminTransactions = results[5].data || [];
    renderAdmin();
    renderMissions();
  }

  function renderTransactions() {
    var recent = state.transactions.slice(0, 6);
    $("recentTransactions").innerHTML = recent.length ? recent.map(transactionRow).join("") : '<p class="empty-state">Todavía no hay movimientos.</p>';
    var salaries = state.transactions.filter(function (row) { return row.tipo === "salario"; });
    $("salaryHistory").innerHTML = salaries.length ? salaries.map(transactionRow).join("") : '<p class="empty-state">Tu primer pago aparecerá aquí.</p>';
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
      return '<article class="store-card' + (storeLocked ? ' locked' : '') + '"><div class="store-card-visual" aria-hidden="true">' + escapeHtml(item.tipo.charAt(0).toUpperCase()) + '</div><div class="store-card-body"><span>' + escapeHtml(item.tipo) + '</span><h3>' + escapeHtml(item.nombre) + '</h3><p>' + escapeHtml(item.descripcion || "Implemento oficial USMCF.") + '</p><div class="store-card-footer"><div class="store-price"><strong>' + escapeHtml(price) + '</strong><small>' + escapeHtml(stock) + '</small></div><button class="add-cart" type="button" data-add="' + escapeHtml(item.id) + '" ' + (storeLocked || item.stock === 0 ? "disabled" : "") + '>' + (storeLocked ? 'REQUIERE TRS' : 'AGREGAR') + '</button></div></div></article>';
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
      return '<article class="library-card"><span>' + escapeHtml(entry.category) + '</span><h3>' + escapeHtml(entry.title) + '</h3><p>' + escapeHtml(entry.summary) + '</p><ul>' + entry.bullets.map(function (bullet) { return "<li>" + escapeHtml(bullet) + "</li>"; }).join("") + '</ul></article>';
    }).join("") : '<p class="empty-state">No encontramos contenido con ese término.</p>';
  }

  function missionStatusLabel(status) {
    return { programada: "PROGRAMADA", activa: "EN CURSO", finalizada: "FINALIZADA", cancelada: "CANCELADA" }[status] || String(status || "programada").toUpperCase();
  }

  function participantStatusLabel(status) {
    return { inscrito: "INSCRITO", en_mision: "EN MISIÓN", confirmado: "ASISTENCIA CONFIRMADA", ausente: "AUSENTE" }[status] || String(status || "inscrito").toUpperCase();
  }

  function profileName(userId) {
    var profile = state.adminProfiles.find(function (row) { return String(row.id) === String(userId); });
    if (profile) return profile.nombre || profile.usuario_roblox || profile.email;
    if (state.profile && String(state.profile.id) === String(userId)) return state.profile.nombre || state.profile.usuario_roblox || state.profile.email;
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
      return '<article class="mission-card ' + escapeHtml(mission.estado) + '"><div class="mission-card-top"><span class="mission-status">' + escapeHtml(missionStatusLabel(mission.estado)) + '</span><span>' + participants.length + ' participantes</span></div><h3>' + escapeHtml(mission.titulo) + '</h3><p>' + escapeHtml(mission.descripcion || "Sin descripción operativa.") + '</p><div class="mission-meta"><span><strong>FECHA</strong>' + escapeHtml(dateText(mission.fecha)) + '</span><span><strong>RECOMPENSA</strong>' + escapeHtml(points(mission.recompensa_puntos)) + ' · ' + escapeHtml(money(mission.recompensa_dinero)) + '</span></div><div class="mission-card-actions">' + myStatus + action + editAction + '</div></article>';
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
        var reviewed = ["confirmado", "ausente"].indexOf(participant.estado) !== -1;
        return '<div class="attendance-row"><div><strong>' + escapeHtml(profileName(participant.user_id)) + '</strong><small>' + escapeHtml(participantStatusLabel(participant.estado)) + (participant.rewarded_at ? ' · RECOMPENSA ACREDITADA' : '') + '</small></div><div class="admin-actions"><button type="button" data-review-participant="' + escapeHtml(participant.id) + '" data-review-status="confirmado" ' + (participant.estado === "confirmado" ? "disabled" : "") + '>CONFIRMAR</button><button type="button" data-review-participant="' + escapeHtml(participant.id) + '" data-review-status="ausente" ' + (participant.estado === "ausente" ? "disabled" : "") + '>AUSENTE</button></div></div>';
      }).join("") : '<p class="empty-state">Aún no hay inscritos.</p>';
      var startButton = mission.estado === "programada" ? '<button type="button" data-start-mission="' + escapeHtml(mission.id) + '">LANZAR MISIÓN</button>' : '';
      var finishButton = mission.estado === "activa" ? '<button type="button" class="finish-mission" data-finish-mission="' + escapeHtml(mission.id) + '" ' + (pending || !participants.length ? "disabled" : "") + '>TERMINAR Y ENTREGAR RECOMPENSAS</button>' : '';
      var confirmAll = mission.estado === "activa" && pending ? '<button type="button" data-confirm-all="' + escapeHtml(mission.id) + '">CONFIRMAR TODOS LOS PENDIENTES</button>' : '';
      return '<details class="mission-admin-card" ' + (mission.estado === "activa" ? "open" : "") + '><summary><span><strong>' + escapeHtml(mission.titulo) + '</strong><small>' + escapeHtml(missionStatusLabel(mission.estado)) + ' · ' + participants.length + ' participantes · Premio: ' + escapeHtml(points(mission.recompensa_puntos)) + ' + ' + escapeHtml(money(mission.recompensa_dinero)) + '</small></span><span>' + pending + ' por revisar</span></summary><div class="mission-admin-body"><div class="mission-command-actions"><button type="button" data-edit-mission="' + escapeHtml(mission.id) + '">EDITAR DATOS Y RECOMPENSAS</button>' + startButton + confirmAll + finishButton + '</div><div class="attendance-list">' + participantRows + '</div>' + (mission.estado === "activa" && pending ? '<p class="mission-blocker">Debes confirmar o marcar ausente a cada participante antes de cerrar.</p>' : '') + '</div></details>';
    }).join("") : '<p class="empty-state">Crea la primera misión desde el formulario.</p>';
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
    $("missionSubmitBtn").textContent = "CREAR MISIÓN";
    $("cancelMissionEdit").classList.add("hidden");
  }

  async function saveMission(event) {
    event.preventDefault();
    var id = $("missionId").value;
    var payload = {
      titulo: $("missionTitle").value.trim(),
      descripcion: $("missionDescription").value.trim(),
      fecha: new Date($("missionDate").value).toISOString(),
      recompensa_puntos: Math.max(0, parseInt($("missionRewardPoints").value, 10) || 0),
      recompensa_dinero: Math.max(0, parseInt($("missionRewardMoney").value, 10) || 0),
      estado: $("missionStatus").value
    };
    if (!id) payload.created_by = state.user.id;
    var result = id ? await supabase.from("missions").update(payload).eq("id", id) : await supabase.from("missions").insert(payload);
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    setMessage("appMessage", id ? "Misión actualizada." : "Misión creada y publicada.", "success");
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
    await loadPlatformData();
  }

  function renderAdmin() {
    if (!isStaff()) return;
    var query = state.adminQuery.trim().toLowerCase();
    var visibleProfiles = state.adminProfiles.filter(function (profile) {
      return !query || [profile.nombre, profile.usuario_roblox, profile.email, profile.rango, profile.rol, profile.estado].join(" ").toLowerCase().indexOf(query) !== -1;
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
      var editor = canManageUsers() ? '<div class="profile-editor"><label><span>NOMBRE</span><input data-profile-field="nombre" data-profile-id="' + escapeHtml(profile.id) + '" value="' + escapeHtml(profile.nombre) + '" /></label><label><span>USUARIO ROBLOX</span><input data-profile-field="usuario_roblox" data-profile-id="' + escapeHtml(profile.id) + '" value="' + escapeHtml(profile.usuario_roblox) + '" /></label><label class="wide"><span>CORREO</span><input type="email" data-profile-field="email" data-profile-id="' + escapeHtml(profile.id) + '" value="' + escapeHtml(profile.email) + '" /></label><label><span>PERMISO</span><select data-profile-field="rol" data-profile-id="' + escapeHtml(profile.id) + '">' + roleOptions + '</select></label><label><span>ESTADO</span><select data-profile-field="estado" data-profile-id="' + escapeHtml(profile.id) + '">' + statusOptions + '</select></label><label class="wide"><span>RANGO</span><select data-profile-field="rango" data-profile-id="' + escapeHtml(profile.id) + '">' + rankOptions + '</select></label><button class="wide" type="button" data-save-profile="' + escapeHtml(profile.id) + '">GUARDAR TODOS LOS CAMBIOS</button><label class="wide"><span>NUEVA CONTRASEÑA</span><input type="password" minlength="8" data-new-password-for="' + escapeHtml(profile.id) + '" placeholder="Mínimo 8 caracteres" /></label><button class="wide" type="button" data-reset-password="' + escapeHtml(profile.id) + '">CAMBIAR CONTRASEÑA</button></div>' : '';
      var dossier = '<details class="member-dossier"><summary>VER INVENTARIO, FACTURAS Y MOVIMIENTOS</summary><div class="dossier-grid"><div><strong>INVENTARIO</strong><p>' + inventoryText + '</p></div><div><strong>FACTURAS</strong><p>' + invoiceText + '</p></div><div><strong>ÚLTIMOS MOVIMIENTOS</strong><p>' + movementText + '</p></div></div></details>';
      return '<details class="admin-person member-accordion"><summary class="member-summary"><div><strong>' + escapeHtml(profile.nombre || profile.email) + '</strong><small>' + escapeHtml(profile.usuario_roblox) + ' · ' + escapeHtml(profile.estado) + ' · ' + escapeHtml(profile.rol) + ' · ' + escapeHtml(profile.rango) + '</small></div><div class="member-summary-balance"><strong>' + escapeHtml(points(profile.puntos)) + '</strong><small>' + escapeHtml(money(profile.dinero)) + '</small></div><span class="accordion-hint">MODIFICAR</span></summary><div class="member-admin-panel"><div><small>Último ingreso: ' + escapeHtml(dateText(profile.last_login)) + '</small>' + editor + dossier + '</div><div class="admin-actions member-management"><label><span>SUMAR/RESTAR PUNTOS</span><input type="number" value="0" data-points-for="' + escapeHtml(profile.id) + '" /></label><label><span>SUMAR/RESTAR USD</span><input type="number" value="0" data-money-for="' + escapeHtml(profile.id) + '" /></label><button type="button" data-adjust-member="' + escapeHtml(profile.id) + '">APLICAR AJUSTE</button><small>Usa números negativos para descontar.</small></div></div></details>';
    }).join("") : '<p class="empty-state">No hay usuarios que coincidan con la búsqueda.</p>';
    renderTrainingQueue();
    $("adminCatalog").innerHTML = state.adminItems.length ? state.adminItems.map(function (item) {
      return '<div class="admin-catalog-row"><div><strong>' + escapeHtml(item.nombre) + '</strong><small>' + escapeHtml(item.tipo) + ' · ' + (item.precio_dinero ? money(item.precio_dinero) : points(item.precio_puntos)) + ' · ' + (item.disponible ? "publicado" : "oculto") + '</small></div><div class="admin-actions"><button type="button" data-toggle-item="' + escapeHtml(item.id) + '" data-next="' + String(!item.disponible) + '">' + (item.disponible ? "OCULTAR" : "PUBLICAR") + '</button></div></div>';
    }).join("") : '<p class="empty-state">No hay implementos creados.</p>';
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

  async function createAdminUser(event) {
    event.preventDefault();
    var button = $("createUserBtn");
    setBusy(button, true, "CREANDO…");
    var result = await supabase.functions.invoke("admin-users", { body: { action: "create", email: $("newUserEmail").value.trim(), password: $("newUserPassword").value, nombre: $("newUserName").value.trim(), usuario_roblox: $("newUserRoblox").value.trim(), rol: $("newUserRole").value } });
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

  async function trainingAction(name, assignmentId, message) {
    var assignment = state.trainingAssignments.find(function (row) { return String(row.id) === String(assignmentId); });
    var result = await supabase.rpc(name, { p_assignment_id: assignmentId });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    setMessage("appMessage", message, "success");
    if (result.data && result.data.event_id) await sendDiscordEvent(result.data.event_id);
    if (name === "finish_training" && assignment) await syncDiscordRoles(assignment.user_id, false);
    await loadPlatformData();
  }

  async function publishItem(event) {
    event.preventDefault();
    var moneyPrice = Math.max(0, parseInt($("adminItemMoney").value, 10) || 0);
    var pointPrice = Math.max(0, parseInt($("adminItemPoints").value, 10) || 0);
    if (!moneyPrice && !pointPrice) return setMessage("appMessage", "El implemento necesita un precio en dinero o puntos.", "error");
    var result = await supabase.from("shop_items").insert({
      nombre: $("adminItemName").value.trim(),
      descripcion: $("adminItemDescription").value.trim(),
      tipo: $("adminItemType").value,
      stock: parseInt($("adminItemStock").value, 10),
      precio_dinero: moneyPrice,
      precio_puntos: pointPrice,
      imagen_url: "",
      disponible: true
    });
    if (result.error) return setMessage("appMessage", errorText(result.error), "error");
    $("adminItemForm").reset();
    $("adminItemStock").value = "-1";
    setMessage("appMessage", "Implemento publicado en la Store.", "success");
    await loadPlatformData();
  }

  function switchView(view) {
    if (view === "administracion" && !isStaff()) return;
    var titles = { resumen: "CENTRO DE CONTROL", salario: "MI SALARIO", tienda: "STORE", inventario: "INVENTARIO Y FACTURAS", misiones: "MISIONES", entrenamiento: "MI ENTRENAMIENTO", biblioteca: "BIBLIOTECA OPERATIVA", administracion: "ADMINISTRACIÓN" };
    document.querySelectorAll(".member-nav-btn").forEach(function (button) { button.classList.toggle("active", button.dataset.view === view); });
    document.querySelectorAll(".member-view").forEach(function (panel) { panel.classList.toggle("active", panel.dataset.panel === view); });
    $("viewTitle").textContent = titles[view] || "PLATAFORMA";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function login(event) {
    event.preventDefault();
    setMessage("authMessage", "");
    var button = $("loginBtn");
    setBusy(button, true, "VERIFICANDO…");
    var result = await supabase.auth.signInWithPassword({ email: $("loginEmail").value.trim(), password: $("loginPassword").value });
    setBusy(button, false);
    if (result.error) return setMessage("authMessage", errorText(result.error), "error");
    await enterPlatform(result.data.user);
  }

  async function register(event) {
    event.preventDefault();
    setMessage("authMessage", "");
    var button = $("registerBtn");
    setBusy(button, true, "CREANDO…");
    var result = await supabase.auth.signUp({
      email: $("registerEmail").value.trim(),
      password: $("registerPassword").value,
      options: { data: { nombre: $("registerName").value.trim(), usuario_roblox: $("registerRoblox").value.trim() } }
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
    $("logoutBtn").addEventListener("click", logout);
    $("cartButton").addEventListener("click", openCart);
    $("closeCartBtn").addEventListener("click", closeCart);
    $("cartBackdrop").addEventListener("click", closeCart);
    $("checkoutBtn").addEventListener("click", checkout);
    $("adminItemForm").addEventListener("submit", publishItem);
    $("adminUserForm").addEventListener("submit", createAdminUser);
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
      var takeTrainingButton = event.target.closest("[data-take-training]");
      if (takeTrainingButton) trainingAction("take_training", takeTrainingButton.dataset.takeTraining, "Entrenamiento tomado. Ya figuras como instructor responsable.");
      var finishTrainingButton = event.target.closest("[data-finish-training]");
      if (finishTrainingButton) trainingAction("finish_training", finishTrainingButton.dataset.finishTraining, "Entrenamiento finalizado. El recluta fue activado y ascendido automáticamente a Soldado.");
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
    });
    document.addEventListener("change", function (event) {
      var rank = event.target.closest("[data-rank]");
      if (!rank) return;
      supabase.from("profiles").update({ rango: rank.value }).eq("id", rank.dataset.rank).then(async function (result) {
        if (result.error) setMessage("appMessage", errorText(result.error), "error");
        else { setMessage("appMessage", "Rango actualizado.", "success"); await loadAdminData(); }
      });
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeCart(); });
  }

  bindEvents();
  renderLibrary();
  renderCart();
  loadSession();
})();
