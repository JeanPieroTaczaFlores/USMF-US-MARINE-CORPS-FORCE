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
    cart: [],
    storeCategory: "todos",
    libraryCategory: "todos",
    libraryQuery: ""
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
  function money(value) { return Number(value || 0).toLocaleString("es-PE") + " ¢"; }
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
  }

  function isStaff() {
    return state.profile && ["staff", "admin", "super_admin"].indexOf(state.profile.rol) !== -1;
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
      supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false })
    ]);
    state.transactions = results[0].data || [];
    state.items = results[1].data || [];
    state.inventory = results[2].data || [];
    state.orders = results[3].data || [];
    state.profile = await getProfile(userId);
    hydrateIdentity();
    renderTransactions();
    renderStore();
    renderInventory();
    renderInvoices();
    $("summaryItems").textContent = state.inventory.reduce(function (sum, row) { return sum + Number(row.cantidad || 1); }, 0);
    if (isStaff()) await loadAdminData();
  }

  async function loadAdminData() {
    var results = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("shop_items").select("*").order("created_at", { ascending: false })
    ]);
    state.adminProfiles = results[0].data || [];
    state.adminItems = results[1].data || [];
    renderAdmin();
  }

  function renderTransactions() {
    var recent = state.transactions.slice(0, 6);
    $("recentTransactions").innerHTML = recent.length ? recent.map(transactionRow).join("") : '<p class="empty-state">Todavía no hay movimientos.</p>';
    var salaries = state.transactions.filter(function (row) { return row.tipo === "salario"; });
    $("salaryHistory").innerHTML = salaries.length ? salaries.map(transactionRow).join("") : '<p class="empty-state">Tu primer pago aparecerá aquí.</p>';
  }

  function transactionRow(row) {
    var amount = Number(row.monto_dinero || 0);
    var pointAmount = Number(row.monto_puntos || 0);
    var display = amount ? (amount > 0 ? "+" : "") + money(amount) : (pointAmount > 0 ? "+" : "") + points(pointAmount);
    return '<div class="activity-row"><div><strong>' + escapeHtml(row.descripcion || row.tipo) + '</strong><small>' + escapeHtml(dateText(row.created_at)) + '</small></div><span class="activity-amount ' + ((amount < 0 || pointAmount < 0) ? "negative" : "") + '">' + escapeHtml(display) + '</span></div>';
  }

  function renderStore() {
    var filtered = state.items.filter(function (item) { return state.storeCategory === "todos" || item.tipo === state.storeCategory; });
    $("storeGrid").innerHTML = filtered.length ? filtered.map(function (item) {
      var price = item.precio_dinero > 0 ? money(item.precio_dinero) : points(item.precio_puntos);
      var stock = item.stock < 0 ? "Stock permanente" : item.stock + " disponibles";
      return '<article class="store-card"><div class="store-card-visual" aria-hidden="true">' + escapeHtml(item.tipo.charAt(0).toUpperCase()) + '</div><div class="store-card-body"><span>' + escapeHtml(item.tipo) + '</span><h3>' + escapeHtml(item.nombre) + '</h3><p>' + escapeHtml(item.descripcion || "Implemento oficial USMCF.") + '</p><div class="store-card-footer"><div class="store-price"><strong>' + escapeHtml(price) + '</strong><small>' + escapeHtml(stock) + '</small></div><button class="add-cart" type="button" data-add="' + escapeHtml(item.id) + '" ' + (item.stock === 0 ? "disabled" : "") + '>AGREGAR</button></div></div></article>';
    }).join("") : '<p class="empty-state">No hay artículos publicados en esta categoría.</p>';
  }

  function addToCart(itemId) {
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

  function renderAdmin() {
    if (!isStaff()) return;
    $("adminProfiles").innerHTML = state.adminProfiles.length ? state.adminProfiles.map(function (profile) {
      var rankOptions = (window.RANGOS || []).map(function (rank) { return '<option value="' + escapeHtml(rank.rango) + '" ' + (rank.rango === profile.rango ? "selected" : "") + '>' + escapeHtml(rank.rango) + '</option>'; }).join("");
      return '<div class="admin-person"><div><strong>' + escapeHtml(profile.nombre || profile.email) + '</strong><small>' + escapeHtml(profile.usuario_roblox) + ' · ' + escapeHtml(profile.estado) + ' · ' + escapeHtml(profile.rol) + '</small></div><div class="admin-actions"><select data-rank="' + escapeHtml(profile.id) + '" aria-label="Rango de ' + escapeHtml(profile.nombre) + '">' + rankOptions + '</select>' + (profile.estado !== "activo" ? '<button type="button" data-approve="' + escapeHtml(profile.id) + '">APROBAR</button>' : "") + '</div></div>';
    }).join("") : '<p class="empty-state">No hay perfiles registrados.</p>';
    $("adminCatalog").innerHTML = state.adminItems.length ? state.adminItems.map(function (item) {
      return '<div class="admin-catalog-row"><div><strong>' + escapeHtml(item.nombre) + '</strong><small>' + escapeHtml(item.tipo) + ' · ' + (item.precio_dinero ? money(item.precio_dinero) : points(item.precio_puntos)) + ' · ' + (item.disponible ? "publicado" : "oculto") + '</small></div><div class="admin-actions"><button type="button" data-toggle-item="' + escapeHtml(item.id) + '" data-next="' + String(!item.disponible) + '">' + (item.disponible ? "OCULTAR" : "PUBLICAR") + '</button></div></div>';
    }).join("") : '<p class="empty-state">No hay implementos creados.</p>';
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
    var titles = { resumen: "CENTRO DE CONTROL", salario: "MI SALARIO", tienda: "STORE", inventario: "INVENTARIO Y FACTURAS", biblioteca: "BIBLIOTECA OPERATIVA", administracion: "ADMINISTRACIÓN" };
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
    $("librarySearch").addEventListener("input", function (event) { state.libraryQuery = event.target.value; renderLibrary(); });
    document.addEventListener("click", function (event) {
      var nav = event.target.closest("[data-view], [data-go]");
      if (nav) switchView(nav.dataset.view || nav.dataset.go);
      var add = event.target.closest("[data-add]");
      if (add) addToCart(add.dataset.add);
      var remove = event.target.closest("[data-remove]");
      if (remove) { state.cart = state.cart.filter(function (entry) { return String(entry.item.id) !== String(remove.dataset.remove); }); renderCart(); }
      var invoice = event.target.closest("[data-invoice]");
      if (invoice) downloadInvoice(invoice.dataset.invoice);
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
