// ============================================================
// USMCF — Vanilla JS App (no React)
// ============================================================

// ---- SUPABASE ----
const sb = (window.SUPABASE_URL && window.SUPABASE_ANON)
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON)
  : null;

// ---- STATE ----
let user = null, profile = null, authLoading = true;
const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');

// ---- RANGOS ----
const RANGOS = [
  "Soldado","Soldado 1ra Clase","Cabo","Cabo de Escuadra",
  "Sargento de Escuadra","Sargento de Pelotón","Sargento de Compañía",
  "Sargento Mayor de 3ra Clase","Sargento Mayor de 2da Clase",
  "Sargento Mayor de 1ra Clase","Sargento Mayor","Sargento Mayor Command",
  "Teniente 2do","Teniente 1ro","Capitán","Mayor",
  "Teniente Coronel","Coronel","General de Brigada","General de División",
  "Teniente General","General"
];
const SALARIOS = {Soldado:80,"Soldado 1ra Clase":120,Cabo:160,"Cabo de Escuadra":200,"Sargento de Escuadra":280,"Sargento de Pelotón":360,"Sargento de Compañía":440,"Sargento Mayor de 3ra Clase":520,"Sargento Mayor de 2da Clase":600,"Sargento Mayor de 1ra Clase":700,"Sargento Mayor":800,"Sargento Mayor Command":900,"Teniente 2do":1000,"Teniente 1ro":1100,Capitán:1250,Mayor:1400,"Teniente Coronel":1600,Coronel:1800,"General de Brigada":2000,"General de División":2200,"Teniente General":2400,General:2600};

// ---- ROUTER ----
function getRoute(){ return location.hash.slice(1) || '/'; }
function nav(path){ location.hash = path; }
window.addEventListener('hashchange', route);

// ---- AUTH ----
async function initAuth(){
  if(!sb){ authLoading=false; route(); return; }
  const {data:{session}} = await sb.auth.getSession();
  user = session?.user || null;
  if(user) await fetchProfile(user.id);
  else { authLoading=false; route(); }
  sb.auth.onAuthStateChange((_e, sess)=>{
    user = sess?.user || null;
    if(user){ fetchProfile(user.id); sb.from('usuarios').update({last_login:new Date().toISOString()}).eq('auth_id',user.id); }
    else { profile=null; authLoading=false; route(); }
  });
}
async function fetchProfile(aid){
  if(!aid){ authLoading=false; route(); return; }
  const {data} = await sb.from('usuarios').select('*').eq('auth_id',aid).single();
  profile = data; authLoading=false; route();
}
async function login(email,pass){
  const {error} = await sb.auth.signInWithPassword({email,password:pass});
  if(error) throw new Error(error.message.includes('Invalid')?'Correo o contraseña incorrectos.':error.message);
  await refreshProfile(); nav('#/redirect');
}
async function register(d){
  const {error} = await sb.auth.signUp({email:d.email,password:d.password,options:{data:{nombre:d.nombre,roblox:d.roblox}}});
  if(error) throw new Error(error.message.includes('already')?'Este correo ya está registrado.':error.message);
  nav('#/pendiente');
}
async function logout(){ await sb.auth.signOut(); location.href='#/login'; }
async function refreshProfile(){
  const {data:{session}} = await sb.auth.getSession();
  const uid = session?.user?.id;
  if(uid){ user=session.user; await fetchProfile(uid); }
}
function roleRedirect(){
  if(!profile) return nav('#/login');
  if(profile.estado==='pendiente') return nav('#/pendiente');
  if(profile.rol==='super_admin'||profile.rol==='admin') return nav('#/admin');
  if(profile.rol==='staff') return nav('#/staff');
  nav('#/dashboard');
}

// ---- ROUTE HANDLER ----
function route(){
  if(authLoading){ app.innerHTML=loadingScreen(); return; }
  const r = getRoute();
  if(r==='/redirect') return roleRedirect();
  const publicRoutes = ['/','/login','/register','/pendiente','/recuperar','/tienda','/opiniones','/misiones'];
  if(publicRoutes.includes(r)) return renderPublic(r);
  if(!user||!profile) return nav('#/login');
  if(profile.estado==='pendiente') return nav('#/pendiente');
  if(r==='/admin' && (profile.rol==='super_admin'||profile.rol==='admin')) return renderAdminPage();
  if(r==='/staff' && profile.rol==='staff') return renderStaffPage();
  if(r==='/dashboard') return renderDashboardPage();
  nav('#/');
}

// ---- UTILS ----
function timeAgo(s){
  if(!s) return 'Nunca';
  const d=Date.now()-new Date(s).getTime(), m=Math.floor(d/60000);
  if(m<1) return 'Ahora'; if(m<60) return m+'min';
  const h=Math.floor(m/60); if(h<24) return h+'h';
  return Math.floor(h/24)+'d';
}
function fmt(n){ return (n||0).toLocaleString('es-PE'); }
function fmtDate(s){ return s ? new Date(s).toLocaleDateString('es-PE') : '—'; }
function badge(variant,text){
  const v={default:'bg-base-600/30 text-base-300 border-base-600/40',accent:'bg-[rgba(201,162,39,.12)] text-accent border-[rgba(201,162,39,.25)]',danger:'bg-[rgba(220,38,38,.12)] text-danger border-[rgba(220,38,38,.25)]',success:'bg-[rgba(22,163,74,.12)] text-success border-[rgba(22,163,74,.2)]',warning:'bg-[rgba(217,119,6,.12)] text-warning border-[rgba(217,119,6,.2)]'};
  return `<span class="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded border ${v[variant]||v.default}">${text}</span>`;
}
function loadingScreen(){
  return `<div class="min-h-screen flex items-center justify-center"><div class="flex flex-col items-center gap-4"><div class="spinner"></div><p class="text-base-400 text-sm font-medium tracking-widest uppercase">Cargando...</p></div></div>`;
}
function inputCSS(extra){ return `w-full px-3 py-2 bg-base-900 border border-base-700/50 rounded-lg text-sm text-base-200 placeholder-base-500 ${extra||''}`; }
function labelCSS(){ return 'block text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400 mb-1'; }
function btnAccent(extra){ return `px-5 py-2 bg-accent text-base-950 font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer disabled:opacity-50 ${extra||''}`; }
function sectionTitle(t){ return `<h2 class="text-[11px] font-semibold tracking-[0.15em] uppercase text-accent mb-3 border-l-[3px] border-l-accent pl-3">${t}</h2>`; }

// ---- PANEL LAYOUT ----
function panelLayout(title, content){
  return `
  <div class="min-h-screen bg-base-950">
    <header class="sticky top-0 z-50 border-b border-base-700/50 bg-base-900/80 backdrop-blur-md">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <a href="#/" class="flex items-center gap-2">
          <svg class="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span class="font-display text-sm font-semibold tracking-[0.15em] uppercase text-base-100">USMCF</span>
        </a>
        <div class="flex items-center gap-4">
          <span class="text-xs text-base-400 hidden sm:block">${profile?.nombre||''} <span class="text-accent ml-1">(${(profile?.rol||'').toUpperCase()})</span></span>
          <button onclick="logout()" class="flex items-center gap-2 px-3 py-1.5 text-xs font-medium tracking-wider uppercase text-base-400 border border-base-600 rounded-lg hover:border-danger/50 hover:text-danger transition-colors cursor-pointer">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span class="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
    <main class="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      <h1 class="font-display text-xl sm:text-2xl font-semibold tracking-[0.08em] uppercase text-base-100 mb-6">${title}</h1>
      ${content}
    </main>
  </div>`;
}

// ---- PUBLIC PAGES ----
function renderPublic(r){
  if(r==='/'||r==='') return renderLanding();
  if(r==='/login') return renderLogin();
  if(r==='/register') return renderRegister();
  if(r==='/pendiente') return renderPending();
  if(r==='/recuperar') return renderRecover();
  if(r==='/tienda') return renderTienda();
  if(r==='/opiniones') return renderOpiniones();
  if(r==='/misiones') return renderMisionesPublic();
}

function renderLanding(){
  app.innerHTML=`
  <div class="min-h-screen bg-base-950 flex items-center justify-center px-4">
    <div class="text-center max-w-xl">
      <div class="w-16 h-16 rounded-2xl bg-[rgba(201,162,39,.1)] border border-[rgba(201,162,39,.2)] flex items-center justify-center mx-auto mb-8">
        <svg class="w-8 h-8 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <h1 class="font-display text-4xl sm:text-5xl font-bold tracking-[0.05em] uppercase text-base-100 mb-4">US MARINE CORPS FORCE</h1>
      <p class="text-base-400 text-lg mb-10 leading-relaxed">"Siempre fiel. Siempre leales. Un marino, una misión, una causa."</p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <a href="#/login" class="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-base-950 font-semibold text-sm tracking-wider uppercase rounded-xl transition-colors">INICIAR SESIÓN <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
        <a href="#/register" class="inline-flex items-center gap-2 px-6 py-3 border border-base-600 text-base-300 hover:border-accent/40 hover:text-accent font-semibold text-sm tracking-wider uppercase rounded-xl transition-colors">REGÍSTRATE</a>
      </div>
      <div class="mt-16 grid grid-cols-3 gap-6 text-center">
        <div class="p-4 bg-base-800/30 border border-base-700/30 rounded-xl"><div class="text-[10px] font-semibold tracking-[0.15em] uppercase text-accent mb-1">MISIONES</div><div class="text-xs text-base-400">Opera en equipos tácticos</div></div>
        <div class="p-4 bg-base-800/30 border border-base-700/30 rounded-xl"><div class="text-[10px] font-semibold tracking-[0.15em] uppercase text-accent mb-1">OPINIONES</div><div class="text-xs text-base-400">Comparte tu feedback</div></div>
        <div class="p-4 bg-base-800/30 border border-base-700/30 rounded-xl"><div class="text-[10px] font-semibold tracking-[0.15em] uppercase text-accent mb-1">RANGOS</div><div class="text-xs text-base-400">Sistema jerárquico real</div></div>
      </div>
    </div>
  </div>`;
}

function renderLogin(){
  app.innerHTML=`
  <div class="min-h-screen flex items-center justify-center bg-base-950 px-4">
    <div class="w-full max-w-[420px]">
      <div class="text-center mb-8">
        <a href="#/" class="inline-flex items-center gap-3 mb-6">
          <div class="w-12 h-12 rounded-xl bg-[rgba(201,162,39,.1)] border border-[rgba(201,162,39,.2)] flex items-center justify-center"><svg class="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
          <span class="font-display text-xl font-bold tracking-[0.15em] uppercase text-base-100">USMCF</span>
        </a>
        <h1 class="font-display text-2xl font-semibold tracking-[0.05em] uppercase text-base-100 mb-2">INICIAR SESIÓN</h1>
        <p class="text-sm text-base-400">Accede a tu panel de la facción</p>
      </div>
      <div class="bg-base-800/40 border border-base-700/40 rounded-2xl p-6 sm:p-8">
        <div id="login-error" class="mb-5 px-4 py-3 rounded-lg bg-[rgba(220,38,38,.12)] border border-[rgba(220,38,38,.25)] text-danger text-sm hidden"></div>
        <form id="login-form" class="space-y-4">
          <div>
            <label class="${labelCSS()}">Correo Electrónico</label>
            <input type="email" id="login-email" placeholder="tu@correo.com" class="${inputCSS('pl-4')}">
          </div>
          <div>
            <label class="${labelCSS()}">Contraseña</label>
            <input type="password" id="login-pass" placeholder="••••••••" class="${inputCSS('pl-4')}">
          </div>
          <button type="submit" id="login-btn" class="${btnAccent('w-full flex items-center justify-center gap-2')}">INICIAR SESIÓN →</button>
        </form>
        <div class="mt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <a href="#/recuperar" class="text-base-400 hover:text-accent transition-colors">¿Olvidaste tu contraseña?</a>
          <a href="#/register" class="text-base-400 hover:text-accent transition-colors">¿No tienes cuenta? <span class="text-accent">Regístrate</span></a>
        </div>
      </div>
    </div>
  </div>`;
  document.getElementById('login-form').onsubmit = async(e)=>{
    e.preventDefault();
    const btn=document.getElementById('login-btn'), errEl=document.getElementById('login-error');
    const email=document.getElementById('login-email').value, pass=document.getElementById('login-pass').value;
    if(!email||!pass){errEl.textContent='Completa todos los campos.';errEl.classList.remove('hidden');return;}
    btn.disabled=true; btn.textContent='ENTRANDO...'; errEl.classList.add('hidden');
    try{ await login(email,pass); }
    catch(ex){ errEl.textContent=ex.message; errEl.classList.remove('hidden'); btn.disabled=false; btn.textContent='INICIAR SESIÓN →'; }
  };
}

function renderRegister(){
  app.innerHTML=`
  <div class="min-h-screen flex items-center justify-center bg-base-950 px-4">
    <div class="w-full max-w-[420px]">
      <div class="text-center mb-8">
        <a href="#/" class="inline-flex items-center gap-3 mb-6">
          <div class="w-12 h-12 rounded-xl bg-[rgba(201,162,39,.1)] border border-[rgba(201,162,39,.2)] flex items-center justify-center"><svg class="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
          <span class="font-display text-xl font-bold tracking-[0.15em] uppercase text-base-100">USMCF</span>
        </a>
        <h1 class="font-display text-2xl font-semibold tracking-[0.05em] uppercase text-base-100 mb-2">CREAR CUENTA</h1>
        <p class="text-sm text-base-400">Únete a la Marine Corps Force</p>
      </div>
      <div class="bg-base-800/40 border border-base-700/40 rounded-2xl p-6 sm:p-8">
        <div id="reg-error" class="mb-5 px-4 py-3 rounded-lg bg-[rgba(220,38,38,.12)] border border-[rgba(220,38,38,.25)] text-danger text-sm hidden"></div>
        <form id="reg-form" class="space-y-4">
          <div><label class="${labelCSS()}">Nombre completo</label><input id="reg-nombre" placeholder="Tu nombre" class="${inputCSS()}"></div>
          <div><label class="${labelCSS()}">Usuario de Roblox</label><input id="reg-roblox" placeholder="Tu usuario" class="${inputCSS()}"></div>
          <div><label class="${labelCSS()}">Correo Electrónico</label><input type="email" id="reg-email" placeholder="tu@correo.com" class="${inputCSS()}"></div>
          <div><label class="${labelCSS()}">Contraseña</label><input type="password" id="reg-pass" placeholder="Mínimo 8 caracteres" class="${inputCSS()}"></div>
          <div><label class="${labelCSS()}">Confirmar Contraseña</label><input type="password" id="reg-pass2" placeholder="Repite tu contraseña" class="${inputCSS()}"></div>
          <button type="submit" id="reg-btn" class="${btnAccent('w-full flex items-center justify-center gap-2')}">REGISTRARME →</button>
        </form>
        <div class="mt-5 text-center text-xs"><a href="#/login" class="text-base-400 hover:text-accent transition-colors">¿Ya tienes cuenta? <span class="text-accent">Inicia sesión</span></a></div>
      </div>
    </div>
  </div>`;
  document.getElementById('reg-form').onsubmit=async(e)=>{
    e.preventDefault();
    const errEl=document.getElementById('reg-error'),btn=document.getElementById('reg-btn');
    const d={nombre:document.getElementById('reg-nombre').value,roblox:document.getElementById('reg-roblox').value,email:document.getElementById('reg-email').value,password:document.getElementById('reg-pass').value,confirm:document.getElementById('reg-pass2').value};
    if(!d.nombre||!d.roblox||!d.email||!d.password||!d.confirm){errEl.textContent='Completa todos los campos.';errEl.classList.remove('hidden');return;}
    if(d.password.length<8){errEl.textContent='Mínimo 8 caracteres.';errEl.classList.remove('hidden');return;}
    if(!/[A-Z]/.test(d.password)){errEl.textContent='Debe contener al menos una mayúscula.';errEl.classList.remove('hidden');return;}
    if(!/[0-9]/.test(d.password)){errEl.textContent='Debe contener al menos un número.';errEl.classList.remove('hidden');return;}
    if(d.password!==d.confirm){errEl.textContent='Las contraseñas no coinciden.';errEl.classList.remove('hidden');return;}
    btn.disabled=true;btn.textContent='CREANDO...';errEl.classList.add('hidden');
    try{await register(d)}catch(ex){errEl.textContent=ex.message;errEl.classList.remove('hidden');btn.disabled=false;btn.textContent='REGISTRARME →';}
  };
}

function renderPending(){
  app.innerHTML=`<div class="min-h-screen flex items-center justify-center bg-base-950 px-4"><div class="w-full max-w-[420px]"><div class="bg-base-800/40 border border-base-700/40 rounded-2xl p-8 text-center"><div class="w-16 h-16 rounded-2xl bg-[rgba(217,119,6,.12)] border border-[rgba(217,119,6,.2)] flex items-center justify-center mx-auto mb-6"><svg class="w-8 h-8 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><h1 class="font-display text-xl font-semibold tracking-[0.05em] uppercase text-base-100 mb-3">SOLICITUD PENDIENTE</h1><p class="text-sm text-base-400 leading-relaxed mb-6">Tu cuenta está esperando la aprobación de un administrador o staff.</p><div class="flex flex-col gap-2"><a href="#/login" class="px-4 py-2.5 text-xs font-semibold tracking-wider uppercase text-base-300 border border-base-600 rounded-lg hover:border-accent/40 hover:text-accent transition-colors">Volver al inicio de sesión</a><a href="#/" class="text-xs text-base-500 hover:text-base-300 transition-colors">Volver al sitio</a></div></div></div></div>`;
}

function renderRecover(){
  app.innerHTML=`
  <div class="min-h-screen flex items-center justify-center bg-base-950 px-4">
    <div class="w-full max-w-[420px]">
      <div class="text-center mb-8">
        <a href="#/" class="inline-flex items-center gap-3 mb-6"><div class="w-12 h-12 rounded-xl bg-[rgba(201,162,39,.1)] border border-[rgba(201,162,39,.2)] flex items-center justify-center"><svg class="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><span class="font-display text-xl font-bold tracking-[0.15em] uppercase text-base-100">USMCF</span></a>
        <h1 class="font-display text-2xl font-semibold tracking-[0.05em] uppercase text-base-100 mb-2">RECUPERAR CONTRASEÑA</h1>
      </div>
      <div class="bg-base-800/40 border border-base-700/40 rounded-2xl p-6 sm:p-8">
        <div id="rec-error" class="mb-5 px-4 py-3 rounded-lg bg-[rgba(220,38,38,.12)] border border-[rgba(220,38,38,.25)] text-danger text-sm hidden"></div>
        <div id="rec-msg" class="mb-5 px-4 py-3 rounded-lg bg-[rgba(22,163,74,.12)] border border-[rgba(22,163,74,.2)] text-success text-sm hidden"></div>
        <form id="rec-form" class="space-y-4">
          <div><label class="${labelCSS()}">Correo Electrónico</label><input type="email" id="rec-email" placeholder="tu@correo.com" class="${inputCSS()}"></div>
          <button type="submit" class="${btnAccent('w-full flex items-center justify-center gap-2')}">ENVIAR →</button>
        </form>
        <div class="mt-5 text-center text-xs"><a href="#/login" class="text-base-400 hover:text-accent transition-colors">← Volver al inicio de sesión</a></div>
      </div>
    </div>
  </div>`;
  document.getElementById('rec-form').onsubmit=async(e)=>{
    e.preventDefault();
    const email=document.getElementById('rec-email').value, errEl=document.getElementById('rec-error'), msgEl=document.getElementById('rec-msg');
    if(!email){errEl.textContent='Ingresa tu correo.';errEl.classList.remove('hidden');return;}
    const{error}=await sb.auth.resetPasswordForEmail(email);
    if(error){errEl.textContent=error.message;errEl.classList.remove('hidden');return;}
    msgEl.textContent='Contraseña restablecida. Tu nueva contraseña temporal es: Reset123! — Cámbiala después de iniciar sesión.';msgEl.classList.remove('hidden');
  };
}

function renderTienda(){
  app.innerHTML=`
  ${navBar()}
  <main class="max-w-[1000px] mx-auto px-4 py-12">
    <div class="flex items-center gap-3 mb-2"><svg class="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg><h1 class="font-display text-xl font-semibold tracking-[0.08em] uppercase text-base-100">TIENDA USMCF</h1></div>
    <p class="text-sm text-base-400 mb-10 ml-8">Equipamiento y items exclusivos para miembros de la facción.</p>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
      ${[{t:'ARMAS',d:'Armas exclusivas para misiones y entrenamiento táctico.',items:['Rifles M4A1','Sniper M110','Escopeta M590','Pistola M17']},
        {t:'SKINS',d:'Skins únicas para tu personaje y equipo visual.',items:['Camuflaje Forest','Ghillie Suit','Urban Stealth','Desert Ops']},
        {t:'RANGOS',d:'Insignias y rangos especiales para distinguirte.',items:['Insignia Elite','Placa MARSOC','Badge Recon','Pin Honor']}
      ].map(c=>`<div class="bg-base-800/40 border border-base-700/30 rounded-xl p-6 hover:border-accent/20 transition-colors"><div class="w-12 h-12 rounded-xl bg-[rgba(201,162,39,.1)] border border-[rgba(201,162,39,.2)] flex items-center justify-center mb-4"><svg class="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></div><h3 class="font-display text-sm font-semibold tracking-[0.12em] uppercase text-base-100 mb-1">${c.t}</h3><p class="text-xs text-base-500 leading-relaxed mb-4">${c.d}</p><ul class="space-y-1.5">${c.items.map(i=>`<li class="flex items-center gap-2 text-xs text-base-400"><div class="w-1 h-1 rounded-full bg-accent/50 shrink-0"></div>${i}</li>`).join('')}</ul></div>`).join('')}
    </div>
    <div class="bg-base-800/30 border border-base-700/30 rounded-xl p-6 text-center">
      <div class="flex items-center justify-center gap-2 mb-2"><svg class="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span class="text-[11px] font-semibold tracking-[0.15em] uppercase text-accent">PRÓXIMAMENTE</span></div>
      <h2 class="font-display text-lg font-semibold tracking-[0.05em] uppercase text-base-100 mb-2">LA TIENDA ESTÁ EN CONSTRUCCIÓN</h2>
      <p class="text-sm text-base-400 max-w-md mx-auto leading-relaxed">El equipo está trabajando para traerte los mejores items.</p>
      <div class="mt-5 w-full max-w-xs mx-auto"><div class="flex items-center justify-between text-[10px] text-base-500 mb-1.5"><span class="tracking-wider uppercase">Progreso</span><span class="text-accent font-semibold">40%</span></div><div class="w-full h-1.5 bg-base-700/40 rounded-full overflow-hidden"><div class="h-full w-[40%] bg-accent rounded-full"></div></div></div>
    </div>
  </main>`;
}

function renderOpiniones(){
  app.innerHTML=`
  ${navBar()}
  <main class="max-w-[700px] mx-auto px-4 py-12">
    <div class="flex items-center gap-3 mb-6"><svg class="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><h1 class="font-display text-xl font-semibold tracking-[0.08em] uppercase text-base-100">OPINIONES</h1></div>
    <div class="bg-base-800/40 border border-base-700/40 rounded-2xl p-6 mb-8">
      <div id="op-error" class="mb-4 px-4 py-3 rounded-lg bg-[rgba(220,38,38,.12)] border border-[rgba(220,38,38,.25)] text-danger text-sm hidden"></div>
      <div id="op-success" class="mb-4 px-4 py-3 rounded-lg bg-[rgba(22,163,74,.12)] border border-[rgba(22,163,74,.2)] text-success text-sm hidden"></div>
      <textarea id="op-text" rows="4" placeholder="Comparte tu opinión sobre la facción..." class="${inputCSS('resize-none mb-3')}"></textarea>
      <button onclick="submitOpinion()" class="inline-flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-base-950 font-semibold text-xs tracking-wider uppercase rounded-lg transition-colors cursor-pointer">ENVIAR →</button>
    </div>
    <div id="op-list" class="space-y-3"><div class="text-center py-12"><p class="text-sm text-base-400">Cargando...</p></div></div>
  </main>`;
  loadOpinions();
}

async function loadOpinions(){
  const {data}=await sb.from('opiniones').select('*').order('created_at',{ascending:false}).limit(20);
  const el=document.getElementById('op-list');
  if(!data||!data.length){el.innerHTML='<div class="text-center py-12"><p class="text-sm text-base-400">No hay opiniones aún. Sé el primero.</p></div>';return;}
  el.innerHTML=data.map(o=>`<div class="p-4 bg-base-800/30 border border-base-700/20 rounded-xl"><p class="text-sm text-base-200 leading-relaxed">"${o.contenido}"</p><p class="text-xs text-base-500 mt-2">${fmtDate(o.created_at)}</p></div>`).join('');
}

async function submitOpinion(){
  const text=document.getElementById('op-text').value;
  const errEl=document.getElementById('op-error'),msgEl=document.getElementById('op-success');
  errEl.classList.add('hidden');msgEl.classList.add('hidden');
  if(!text||text.trim().length<5){errEl.textContent='Escribe al menos 5 caracteres.';errEl.classList.remove('hidden');return;}
  if(!profile){errEl.textContent='Inicia sesión para enviar opiniones.';errEl.classList.remove('hidden');return;}
  const{error}=await sb.from('opiniones').insert({contenido:text.trim(),usuario_id:profile.id});
  if(error){errEl.textContent=error.message;errEl.classList.remove('hidden');return;}
  msgEl.textContent='¡Opinión enviada!';msgEl.classList.remove('hidden');
  document.getElementById('op-text').value='';
  loadOpinions();
}

function renderMisionesPublic(){
  app.innerHTML=`
  ${navBar()}
  <main class="max-w-[900px] mx-auto px-4 py-12">
    <div class="flex items-center gap-3 mb-8"><svg class="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg><h1 class="font-display text-xl font-semibold tracking-[0.08em] uppercase text-base-100">MISIONES DISPONIBLES</h1></div>
    <div id="misiones-list"><div class="text-center py-16"><div class="spinner mx-auto mb-4"></div></div></div>
  </main>`;
  loadMisionesPublic();
}

async function loadMisionesPublic(){
  const {data}=await sb.from('misiones').select('*').in('estado',['activa','programada']).order('fecha',{ascending:true});
  const el=document.getElementById('misiones-list');
  if(!data||!data.length){el.innerHTML='<div class="text-center py-16"><p class="text-sm text-base-400">No hay misiones disponibles ahora.</p></div>';return;}
  el.innerHTML=`<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${data.map(m=>`
    <div class="bg-base-800/40 border border-base-700/30 rounded-xl p-5 hover:border-accent/20 transition-colors">
      <div class="flex items-start justify-between mb-3"><h3 class="text-sm font-semibold text-base-100 uppercase tracking-wider">${m.titulo}</h3>${m.estado==='activa'?badge('accent',m.estado):badge('default',m.estado)}</div>
      <p class="text-xs text-base-400 leading-relaxed mb-4">${m.descripcion||''}</p>
      <div class="flex items-center gap-4 text-xs text-base-500 mb-4">
        ${m.fecha?`<span>📅 ${fmtDate(m.fecha)}</span>`:''}
        <span class="text-[#c9a227]">⭐ ${m.recompensa_puntos} pts</span>
        <span class="text-success">💰 ${m.recompensa_dinero} coins</span>
      </div>
      <button onclick="joinMission('${m.id}')" class="w-full py-2 bg-accent hover:bg-accent-hover text-base-950 font-semibold text-[11px] tracking-wider uppercase rounded-lg transition-colors cursor-pointer">INSCRIBIRSE</button>
    </div>`).join('')}</div>`;
}

async function joinMission(id){
  if(!profile){alert('Inicia sesión para inscribirte.');return;}
  const{error}=await sb.from('misiones_participantes').insert({mision_id:id,usuario_id:profile.id,recompensa_pagada:false});
  if(error){alert(error.message);return;}
  alert('¡Inscrito exitosamente!');loadMisionesPublic();
}

function navBar(){
  return `<nav class="sticky top-0 z-50 border-b border-base-700/50 bg-base-900/80 backdrop-blur-md"><div class="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between"><a href="#/" class="flex items-center gap-2"><svg class="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span class="font-display text-sm font-semibold tracking-[0.15em] uppercase text-base-100">USMCF</span></a><div class="flex items-center gap-4"><a href="#/" class="text-xs text-base-400 hover:text-accent transition-colors tracking-wider uppercase">INICIO</a><a href="#/opiniones" class="text-xs text-base-400 hover:text-accent transition-colors tracking-wider uppercase">OPINIONES</a></div></div></nav>`;
}

// ---- DASHBOARD ----
function renderDashboardPage(){
  app.innerHTML=panelLayout('MI PANEL',`
    <p class="text-base-400 text-sm mb-6">Bienvenido, <span class="text-base-200 font-medium">${profile?.nombre||''}</span></p>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8" id="dash-stats"></div>
    <div class="mb-8" id="dash-salary"></div>
    <div class="mb-8" id="dash-missions">${sectionTitle('MIS MISIONES')}<div class="text-center py-8"><div class="spinner mx-auto"></div></div></div>
    <div class="mb-8" id="dash-inventory">${sectionTitle('MI INVENTARIO')}<div class="text-center py-8"><div class="spinner mx-auto"></div></div></div>
    <div id="dash-history">${sectionTitle('HISTORIAL')}<div class="text-center py-8"><div class="spinner mx-auto"></div></div></div>
  `);
  renderDashStats();
  renderDashSalary();
  loadDashData();
}

function renderDashStats(){
  const s=SALARIOS[profile?.rango]||80;
  document.getElementById('dash-stats').innerHTML=`
    <div class="bg-base-800/40 border border-base-700/40 rounded-xl p-5 border-l-4 border-l-accent"><div class="flex items-center gap-2 mb-2"><span class="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400">RANGO</span></div><div class="font-display text-xl font-semibold text-base-100">${profile?.rango||''}</div><div class="text-xs text-base-500 mt-1">Salario: ${s} coins/sem</div></div>
    <div class="bg-base-800/40 border border-base-700/40 rounded-xl p-5 border-l-4 border-l-[#c9a227]"><div class="flex items-center gap-2 mb-2"><span class="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400">DINERO</span></div><div class="font-display text-xl font-semibold text-base-100">${fmt(profile?.dinero)} <span class="text-sm text-base-400">coins</span></div></div>
    <div class="bg-base-800/40 border border-base-700/40 rounded-xl p-5 border-l-4 border-l-success"><div class="flex items-center gap-2 mb-2"><span class="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400">PUNTOS</span></div><div class="font-display text-xl font-semibold text-base-100">${fmt(profile?.puntos)}</div></div>
    <div class="bg-base-800/40 border border-base-700/40 rounded-xl p-5 border-l-4 border-l-base-500"><div class="flex items-center gap-2 mb-2"><span class="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-400">ROBLOX</span></div><div class="font-display text-lg font-semibold text-base-100">${profile?.usuario_roblox||''}</div><div class="text-xs text-base-500 mt-1">Rol: ${profile?.rol||''}</div></div>
  `;
}

function renderDashSalary(){
  let next=0;
  if(profile?.ultimo_cobro_salario){
    const diff=Date.now()-new Date(profile.ultimo_cobro_salario).getTime();
    next=Math.max(0,7-Math.floor(diff/(86400000)));
  }
  const s=SALARIOS[profile?.rango]||80;
  document.getElementById('dash-salary').innerHTML=`
    ${sectionTitle('SALARIO SEMANAL')}
    <div class="bg-base-800/40 border border-base-700/40 rounded-xl p-5 max-w-md">
      <p class="text-sm text-base-400 mb-3">Cobra tu salario semanal según tu rango actual.</p>
      <button onclick="claimSalary()" id="salary-btn" ${next>0?'disabled':''} class="w-full py-2.5 border-2 border-[#c9a227] bg-[#c9a227]/10 text-[#c9a227] font-semibold text-xs tracking-wider uppercase rounded-lg transition-colors hover:bg-[#c9a227] hover:text-base-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
        ${next>0?`DISPONIBLE EN ${next} DÍA(S)`:'COBRAR SALARIO'}
      </button>
      <p id="salary-msg" class="mt-2 text-xs text-base-300"></p>
    </div>
  `;
}

async function claimSalary(){
  const btn=document.getElementById('salary-btn'),msg=document.getElementById('salary-msg');
  btn.disabled=true;btn.textContent='PROCESANDO...';
  const s=SALARIOS[profile?.rango]||80;
  await sb.from('usuarios').update({dinero:profile.dinero+s,ultimo_cobro_salario:new Date().toISOString()}).eq('id',profile.id);
  await sb.from('movimientos').insert({usuario_id:profile.id,tipo:'salario',monto:s,moneda:'coins',descripcion:`Salario semanal - ${profile.rango}`});
  await refreshProfile();msg.textContent=`Cobraste ${s} coins.`;renderDashStats();renderDashSalary();loadDashData();
}

async function loadDashData(){
  const[m,i,h]=await Promise.all([
    sb.from('misiones_participantes').select('*, misiones(*)').eq('usuario_id',profile.id),
    sb.from('compras').select('*, tienda_items(*)').eq('usuario_id',profile.id).order('fecha',{ascending:false}),
    sb.from('movimientos').select('*').eq('usuario_id',profile.id).order('fecha',{ascending:false}).limit(15),
  ]);
  const missions=m.data||[], inv=i.data||[], hist=h.data||[];
  document.getElementById('dash-missions').innerHTML=sectionTitle('MIS MISIONES')+(missions.length===0?'<p class="text-sm text-base-400">No estás inscrito en ninguna misión. <a href="#/misiones" class="text-accent hover:underline">Ver misiones</a></p>':'<div class="space-y-2">'+missions.map(mp=>{const ms=mp.misiones;if(!ms)return'';return`<div class="flex items-center justify-between p-4 bg-base-800/40 border border-base-700/30 rounded-xl"><div><span class="text-sm font-medium text-base-200">${ms.titulo}</span><span class="text-xs text-base-500 ml-3">${fmtDate(ms.fecha)}</span></div>${ms.estado==='activa'?badge('accent',ms.estado):ms.estado==='terminada'?badge('success',ms.estado):badge('default',ms.estado)}</div>`;}).join('')+'</div>');
  document.getElementById('dash-inventory').innerHTML=sectionTitle('MI INVENTARIO')+(inv.length===0?'<p class="text-sm text-base-400">Aún no has comprado nada. <a href="#/tienda" class="text-accent hover:underline">Ir a la tienda</a></p>':'<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">'+inv.map(x=>`<div class="p-4 bg-base-800/40 border border-base-700/30 rounded-xl"><div class="text-sm font-medium text-base-200">${x.tienda_items?.nombre||''}</div><div class="text-xs text-base-500 mt-1">Comprado: ${fmtDate(x.fecha)}</div></div>`).join('')+'</div>');
  document.getElementById('dash-history').innerHTML=sectionTitle('HISTORIAL')+(hist.length===0?'<p class="text-sm text-base-400">Sin movimientos aún.</p>':'<div class="space-y-0 max-w-2xl">'+hist.map(x=>`<div class="flex items-center justify-between py-3 border-b border-base-700/20"><span class="text-sm text-base-300">${x.descripcion}</span><div class="flex items-center gap-3"><span class="text-sm font-medium ${x.monto>0?'text-success':'text-danger'}">${x.monto>0?'+':''}${x.monto} ${x.moneda==='coins'?'coins':'pts'}</span><span class="text-xs text-base-500">${fmtDate(x.fecha)}</span></div></div>`).join('')+'</div>');
}

// ---- STAFF PANEL ----
function renderStaffPage(){
  app.innerHTML=panelLayout('PANEL DE STAFF',`
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6" id="staff-stats"></div>
    <div class="flex gap-0 border-b border-base-700/50 overflow-x-auto mb-6" id="staff-tabs"></div>
    <div id="staff-content"></div>
  `);
  loadStaffData();
}

let staffTab='solicitudes';
async function loadStaffData(){
  const[u,m,o]=await Promise.all([
    sb.from('usuarios').select('*').order('created_at',{ascending:false}),
    sb.from('misiones').select('*').order('created_at',{ascending:false}),
    sb.from('opiniones').select('*').order('created_at',{ascending:false}),
  ]);
  const users=u.data||[];
  const stats={total:users.length,pendientes:users.filter(x=>x.estado==='pendiente').length,misiones:(m.data||[]).length};
  document.getElementById('staff-stats').innerHTML=`<div class="bg-base-800/50 border border-base-700/40 rounded-xl p-4"><span class="text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400">Usuarios</span><div class="font-display text-2xl font-semibold text-base-100">${stats.total}</div></div><div class="bg-base-800/50 border border-base-700/40 rounded-xl p-4"><span class="text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400">Pendientes</span><div class="font-display text-2xl font-semibold text-base-100">${stats.pendientes}</div></div><div class="bg-base-800/50 border border-base-700/40 rounded-xl p-4"><span class="text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400">Misiones</span><div class="font-display text-2xl font-semibold text-base-100">${stats.misiones}</div></div>`;
  const tabs=[{id:'solicitudes',label:'SOLICITUDES',count:stats.pendientes},{id:'usuarios',label:'USUARIOS',count:stats.total},{id:'misiones',label:'MISIONES',count:stats.misiones},{id:'opiniones',label:'OPINIONES'}];
  document.getElementById('staff-tabs').innerHTML=tabs.map(t=>`<button onclick="switchStaffTab('${t.id}')" class="px-4 py-2.5 text-xs font-semibold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors cursor-pointer ${staffTab===t.id?'text-accent border-accent':'text-base-400 border-transparent hover:text-base-200'}">${t.label} <span class="ml-1.5 text-[10px] opacity-60">(${t.count})</span></button>`).join('');
  window._staffUsers=users;window._staffMissions=m.data||[];window._staffOpinions=o.data||[];
  renderStaffContent();
}

function switchStaffTab(t){staffTab=t;renderStaffContent();}

function renderStaffContent(){
  const el=document.getElementById('staff-content');
  if(staffTab==='solicitudes') renderStaffSolicitudes(el);
  else if(staffTab==='usuarios') renderStaffUsuarios(el);
  else if(staffTab==='misiones') renderStaffMisiones(el);
  else renderStaffOpiniones(el);
}

function renderStaffSolicitudes(el){
  const reqs=window._staffUsers.filter(u=>u.estado==='pendiente');
  if(!reqs.length){el.innerHTML='<p class="text-sm text-base-400 text-center py-12">No hay solicitudes pendientes.</p>';return;}
  el.innerHTML=`<div class="table-wrap"><table><thead><tr><th>NOMBRE</th><th>ROBLOX</th><th>EMAIL</th><th>FECHA</th><th></th></tr></thead><tbody>${reqs.map(u=>`<tr><td class="text-base-200">${u.nombre}</td><td class="text-base-300">${u.usuario_roblox}</td><td class="text-base-400">${u.email}</td><td class="text-base-400 text-xs">${fmtDate(u.created_at)}</td><td><div class="flex gap-2"><button onclick="staffApprove('${u.id}')" class="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase bg-[rgba(22,163,74,.12)] text-success border border-[rgba(22,163,74,.2)] rounded-md hover:bg-success hover:text-white transition-colors cursor-pointer">APROBAR</button><button onclick="staffReject('${u.id}')" class="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase bg-[rgba(220,38,38,.12)] text-danger border border-[rgba(220,38,38,.25)] rounded-md hover:bg-danger hover:text-white transition-colors cursor-pointer">RECHAZAR</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
async function staffApprove(id){await sb.from('usuarios').update({estado:'activo',rango:'Soldado',dinero:500,puntos:100}).eq('id',id);loadStaffData();}
async function staffReject(id){if(!confirm('Rechazar?'))return;await sb.from('usuarios').delete().eq('id',id);loadStaffData();}

function renderStaffUsuarios(el){
  el.innerHTML=`<div class="table-wrap"><table><thead><tr><th>NOMBRE</th><th>ROBLOX</th><th>RANGO</th><th>PTS</th><th>COINS</th><th>ROL</th><th>ESTADO</th><th>ACTIVIDAD</th></tr></thead><tbody>${window._staffUsers.map(u=>`<tr><td class="text-base-200">${u.nombre}</td><td class="text-base-300">${u.usuario_roblox}</td><td class="text-base-300 text-xs">${u.rango}</td><td class="text-base-300 text-xs">${u.puntos||0}</td><td class="text-base-300 text-xs">${u.dinero||0}</td><td>${badge(u.rol==='staff'?'warning':'default',u.rol)}</td><td>${badge(u.estado==='activo'?'success':'danger',u.estado)}</td><td class="text-xs ${!u.last_login?'text-danger':(Date.now()-new Date(u.last_login).getTime()<3600000)?'text-success':'text-base-400'}">${timeAgo(u.last_login)}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderStaffMisiones(el){
  const ms=window._staffMissions;
  el.innerHTML=`<div class="table-wrap"><table><thead><tr><th>TÍTULO</th><th>FECHA</th><th>PTS</th><th>COINS</th><th>ESTADO</th></tr></thead><tbody>${ms.length?ms.map(m=>`<tr><td class="text-base-200">${m.titulo}</td><td class="text-base-400 text-xs">${fmtDate(m.fecha)}</td><td class="text-base-300 text-xs">${m.recompensa_puntos}</td><td class="text-base-300 text-xs">${m.recompensa_dinero}</td><td>${m.estado==='activa'?badge('accent',m.estado):m.estado==='terminada'?badge('success',m.estado):badge('default',m.estado)}</td></tr>`).join(''):'<tr><td colspan="5" class="text-center py-8 text-base-400">No hay misiones</td></tr>'}</tbody></table></div>`;
}

function renderStaffOpiniones(el){
  const ops=window._staffOpinions;
  if(!ops.length){el.innerHTML='<p class="text-sm text-base-400 text-center py-12">No hay opiniones.</p>';return;}
  el.innerHTML=ops.map(o=>`<div class="p-4 bg-base-800/40 border border-base-700/30 rounded-xl mb-3"><p class="text-sm text-base-200 leading-relaxed">"${o.contenido}"</p><p class="text-xs text-base-500 mt-1">${fmtDate(o.fecha)}</p></div>`).join('');
}

// ---- ADMIN PANEL ----
function renderAdminPage(){
  app.innerHTML=panelLayout('PANEL DE ADMINISTRACIÓN',`
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6" id="admin-stats"></div>
    <div class="flex gap-0 border-b border-base-700/50 overflow-x-auto mb-6" id="admin-tabs"></div>
    <div id="admin-content"></div>
  `);
  loadAdminData();
}

let adminTab='usuarios';
let adminSearch='';
async function loadAdminData(){
  const[u,m,s,o,r]=await Promise.all([
    sb.from('usuarios').select('*').order('created_at',{ascending:false}),
    sb.from('misiones').select('*').order('created_at',{ascending:false}),
    sb.from('tienda_items').select('*').order('created_at',{ascending:false}),
    sb.from('opiniones').select('*, usuarios(nombre, usuario_roblox, puntos, dinero)').order('created_at',{ascending:false}),
    sb.from('roles').select('*').order('created_at',{ascending:false}),
  ]);
  const users=u.data||[];
  window._aUsers=users;window._aMissions=m.data||[];window._aItems=s.data||[];
  window._aOpinions=o.data||[];window._aRoles=r.data||[];
  const stats={total:users.length,pendientes:users.filter(x=>x.estado==='pendiente').length,activos:users.filter(x=>x.estado==='activo').length,misiones:window._aMissions.length,items:window._aItems.length,opiniones:window._aOpinions.length};
  document.getElementById('admin-stats').innerHTML=`
    <div class="bg-base-800/50 border border-base-700/40 rounded-xl p-4"><span class="text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400">Usuarios</span><div class="font-display text-2xl font-semibold text-base-100">${stats.total}</div></div>
    <div class="bg-base-800/50 border border-base-700/40 rounded-xl p-4"><span class="text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400">Pendientes</span><div class="font-display text-2xl font-semibold text-base-100">${stats.pendientes}</div></div>
    <div class="bg-base-800/50 border border-base-700/40 rounded-xl p-4"><span class="text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400">Activos</span><div class="font-display text-2xl font-semibold text-base-100">${stats.activos}</div></div>
    <div class="bg-base-800/50 border border-base-700/40 rounded-xl p-4"><span class="text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400">Misiones</span><div class="font-display text-2xl font-semibold text-base-100">${stats.misiones}</div></div>
    <div class="bg-base-800/50 border border-base-700/40 rounded-xl p-4"><span class="text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400">Items</span><div class="font-display text-2xl font-semibold text-base-100">${stats.items}</div></div>
    <div class="bg-base-800/50 border border-base-700/40 rounded-xl p-4"><span class="text-[11px] font-semibold tracking-[0.12em] uppercase text-base-400">Opiniones</span><div class="font-display text-2xl font-semibold text-base-100">${stats.opiniones}</div></div>
  `;
  const tabs=[{id:'usuarios',label:'USUARIOS',count:stats.total},{id:'solicitudes',label:'SOLICITUDES',count:stats.pendientes},{id:'misiones',label:'MISIONES',count:stats.misiones},{id:'tienda',label:'TIENDA',count:stats.items},{id:'opiniones',label:'OPINIONES',count:stats.opiniones},{id:'roles',label:'ROLES',count:window._aRoles.length}];
  document.getElementById('admin-tabs').innerHTML=tabs.map(t=>`<button onclick="switchAdminTab('${t.id}')" class="px-4 py-2.5 text-xs font-semibold tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors cursor-pointer ${adminTab===t.id?'text-accent border-accent':'text-base-400 border-transparent hover:text-base-200'}">${t.label} <span class="ml-1.5 text-[10px] opacity-60">(${t.count})</span></button>`).join('');
  renderAdminContent();
}

function switchAdminTab(t){adminTab=t;adminSearch='';renderAdminContent();}

function renderAdminContent(){
  const el=document.getElementById('admin-content');
  if(adminTab==='usuarios') renderAdminUsuarios(el);
  else if(adminTab==='solicitudes') renderAdminSolicitudes(el);
  else if(adminTab==='misiones') renderAdminMisiones(el);
  else if(adminTab==='tienda') renderAdminTienda(el);
  else if(adminTab==='opiniones') renderAdminOpiniones(el);
  else renderAdminRoles(el);
}

function renderAdminUsuarios(el){
  const users=adminSearch?window._aUsers.filter(u=>(u.nombre+u.usuario_roblox+u.rango+u.rol+u.email).toLowerCase().includes(adminSearch.toLowerCase())):window._aUsers;
  el.innerHTML=`
    <div class="flex items-center gap-3 mb-4">
      <input id="admin-search" value="${adminSearch}" oninput="adminSearch=this.value;renderAdminContent()" placeholder="Buscar por nombre, usuario, rango o rol..." class="${inputCSS('flex-1')}">
      <button onclick="showCreateUser()" class="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-[rgba(201,162,39,.1)] text-accent border border-[rgba(201,162,39,.2)] rounded-lg hover:bg-accent hover:text-base-950 transition-colors cursor-pointer">+ NUEVO</button>
    </div>
    <div class="table-wrap"><table><thead><tr><th>NOMBRE</th><th>ROBLOX</th><th>RANGO</th><th>PUNTOS</th><th>DINERO</th><th>ROL</th><th>ESTADO</th><th>ACTIVIDAD</th><th>ACCIONES</th></tr></thead><tbody>
    ${users.map(u=>{
      const rv=u.rol==='super_admin'||u.rol==='admin'?'danger':u.rol==='staff'?'warning':'default';
      const sv=u.estado==='activo'?'success':u.estado==='pendiente'?'warning':'danger';
      const ac=!u.last_login?'text-danger':(Date.now()-new Date(u.last_login).getTime()<3600000)?'text-success':'text-base-400';
      return `<tr><td class="text-base-200 font-medium">${u.nombre}</td><td class="text-base-300">${u.usuario_roblox}</td><td class="text-base-300 text-xs">${u.rango}</td><td class="text-accent text-xs font-semibold">${u.puntos||0}</td><td class="text-success text-xs font-semibold">${u.dinero||0}</td><td>${badge(rv,u.rol)}</td><td>${badge(sv,u.estado)}</td><td class="text-xs ${ac}">${timeAgo(u.last_login)}</td><td><div class="flex gap-1"><button onclick='editUser(${JSON.stringify(u).replace(/'/g,"\\'")})' title="Editar" class="p-1.5 text-base-500 hover:text-accent transition-colors cursor-pointer">✏️</button><button onclick='grantUser(${JSON.stringify(u).replace(/'/g,"\\'")})' title="Dar recursos" class="p-1.5 text-base-500 hover:text-success transition-colors cursor-pointer">🎁</button><button onclick="deleteUser('${u.id}','${u.nombre}')" title="Eliminar" class="p-1.5 text-base-500 hover:text-danger transition-colors cursor-pointer">🗑️</button></div></td></tr>`;
    }).join('')}
    ${!users.length?'<tr><td colspan="9" class="text-center py-8 text-base-400">No se encontraron usuarios</td></tr>':''}
    </tbody></table></div>
  `;
}

async function deleteUser(id,nombre){if(!confirm(`¿Eliminar usuario ${nombre}?`))return;await sb.from('usuarios').delete().eq('id',id);loadAdminData();}

function showCreateUser(){
  const opts=RANGOS.map(r=>`<option value="${r}">${r.toUpperCase()}</option>`).join('');
  modalRoot.innerHTML=`<div class="modal-overlay" onclick="closeModal()"><div class="modal-box max-w-lg" onclick="event.stopPropagation()">
    <div class="flex justify-between items-center mb-4"><span class="text-sm font-semibold text-base-100 uppercase tracking-wider">Crear Nuevo Usuario</span><button onclick="closeModal()" class="text-base-500 hover:text-base-200 cursor-pointer">✕</button></div>
    <div id="cu-error" class="mb-3 px-3 py-2 rounded-lg bg-[rgba(220,38,38,.12)] border border-[rgba(220,38,38,.25)] text-danger text-xs hidden"></div>
    <div class="grid grid-cols-2 gap-3 mb-3">
      <input id="cu-nombre" placeholder="Nombre *" class="${inputCSS()}">
      <input id="cu-roblox" placeholder="Roblox" class="${inputCSS()}">
      <input id="cu-email" type="email" placeholder="Email *" class="${inputCSS()}">
      <input id="cu-pass" type="password" placeholder="Contraseña *" class="${inputCSS()}">
    </div>
    <div class="grid grid-cols-4 gap-3 mb-3">
      <select id="cu-rango" class="${inputCSS()}">${opts}</select>
      <select id="cu-rol" class="${inputCSS()}"><option value="usuario">USUARIO</option><option value="staff">STAFF</option><option value="admin">ADMIN</option><option value="super_admin">SUPER ADMIN</option></select>
      <input id="cu-puntos" type="number" value="0" placeholder="Puntos" class="${inputCSS('text-accent')}">
      <input id="cu-dinero" type="number" value="0" placeholder="Dinero" class="${inputCSS('text-success')}">
    </div>
    <button onclick="createUser()" class="${btnAccent()}">CREAR USUARIO</button>
  </div></div>`;
}

async function createUser(){
  const errEl=document.getElementById('cu-error');
  const d={nombre:document.getElementById('cu-nombre').value,roblox:document.getElementById('cu-roblox').value,email:document.getElementById('cu-email').value,password:document.getElementById('cu-pass').value,rango:document.getElementById('cu-rango').value,rol:document.getElementById('cu-rol').value,puntos:parseInt(document.getElementById('cu-puntos').value)||0,dinero:parseInt(document.getElementById('cu-dinero').value)||0};
  if(!d.nombre||!d.email||!d.password){errEl.textContent='Nombre, email y contraseña son obligatorios.';errEl.classList.remove('hidden');return;}
  if(d.password.length<6){errEl.textContent='Mínimo 6 caracteres.';errEl.classList.remove('hidden');return;}
  const{data,error:authErr}=await sb.auth.admin.createUser({email:d.email,password:d.password,email_confirm:true,options:{data:{nombre:d.nombre,roblox:d.roblox||'SinUsuario'}}});
  if(authErr){errEl.textContent=authErr.message;errEl.classList.remove('hidden');return;}
  if(data.user){await sb.from('usuarios').update({nombre:d.nombre,usuario_roblox:d.roblox||'SinUsuario',rango:d.rango,rol:d.rol,estado:'activo',puntos:d.puntos,dinero:d.dinero}).eq('auth_id',data.user.id);}
  closeModal();loadAdminData();
}

function editUser(u){
  const opts=RANGOS.map(r=>`<option value="${r}" ${u.rango===r?'selected':''}>${r}</option>`).join('');
  modalRoot.innerHTML=`<div class="modal-overlay" onclick="closeModal()"><div class="modal-box max-w-lg" onclick="event.stopPropagation()">
    <div class="flex justify-between items-center mb-4"><span class="text-sm font-semibold text-base-100 uppercase tracking-wider">✏️ Editar Usuario</span><button onclick="closeModal()" class="text-base-500 hover:text-base-200 cursor-pointer">✕</button></div>
    <div id="eu-error" class="mb-3 px-3 py-2 rounded-lg bg-[rgba(220,38,38,.12)] border border-[rgba(220,38,38,.25)] text-danger text-xs hidden"></div>
    <div class="grid grid-cols-2 gap-3 mb-3">
      <div><label class="${labelCSS()}">Nombre</label><input id="eu-nombre" value="${u.nombre||''}" class="${inputCSS()}"></div>
      <div><label class="${labelCSS()}">Roblox</label><input id="eu-roblox" value="${u.usuario_roblox||''}" class="${inputCSS()}"></div>
    </div>
    <div class="mb-3"><label class="${labelCSS()}">Rango</label><select id="eu-rango" class="${inputCSS()}">${opts}</select></div>
    <div class="grid grid-cols-2 gap-3 mb-3">
      <div><label class="${labelCSS()}">Puntos</label><input id="eu-puntos" type="number" value="${u.puntos||0}" class="${inputCSS('text-accent font-semibold')}"></div>
      <div><label class="${labelCSS()}">Dinero (Coins)</label><input id="eu-dinero" type="number" value="${u.dinero||0}" class="${inputCSS('text-success font-semibold')}"></div>
    </div>
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div><label class="${labelCSS()}">Rol</label><select id="eu-rol" class="${inputCSS()}"><option value="usuario" ${u.rol==='usuario'?'selected':''}>USUARIO</option><option value="staff" ${u.rol==='staff'?'selected':''}>STAFF</option><option value="admin" ${u.rol==='admin'?'selected':''}>ADMIN</option><option value="super_admin" ${u.rol==='super_admin'?'selected':''}>SUPER ADMIN</option></select></div>
      <div><label class="${labelCSS()}">Estado</label><select id="eu-estado" class="${inputCSS()}"><option value="activo" ${u.estado==='activo'?'selected':''}>ACTIVO</option><option value="pendiente" ${u.estado==='pendiente'?'selected':''}>PENDIENTE</option><option value="baneado" ${u.estado==='baneado'?'selected':''}>BANEADO</option></select></div>
    </div>
    <div class="flex gap-2"><button onclick="saveUser('${u.id}')" class="${btnAccent('flex items-center gap-2')}">GUARDAR CAMBIOS</button><button onclick="closeModal()" class="px-5 py-2 bg-base-700/50 text-base-400 font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer hover:text-base-200">CANCELAR</button></div>
  </div></div>`;
}

async function saveUser(id){
  const d={nombre:document.getElementById('eu-nombre').value,usuario_roblox:document.getElementById('eu-roblox').value,rango:document.getElementById('eu-rango').value,puntos:parseInt(document.getElementById('eu-puntos').value)||0,dinero:parseInt(document.getElementById('eu-dinero').value)||0,rol:document.getElementById('eu-rol').value,estado:document.getElementById('eu-estado').value};
  if(!d.nombre){document.getElementById('eu-error').textContent='Nombre obligatorio.';document.getElementById('eu-error').classList.remove('hidden');return;}
  await sb.from('usuarios').update(d).eq('id',id);
  closeModal();loadAdminData();
}

function grantUser(u){
  modalRoot.innerHTML=`<div class="modal-overlay" onclick="closeModal()"><div class="modal-box max-w-md" onclick="event.stopPropagation()">
    <div class="flex justify-between items-center mb-4"><span class="text-sm font-semibold text-base-100 uppercase tracking-wider">🎁 Dar Recursos</span><button onclick="closeModal()" class="text-base-500 hover:text-base-200 cursor-pointer">✕</button></div>
    <div class="p-3 bg-base-800/50 rounded-lg border border-base-700/40 mb-4">
      <p class="text-xs text-base-400 uppercase tracking-wider">Destinatario</p>
      <p class="text-sm text-base-100 font-medium">${u.nombre} <span class="text-base-400">(${u.usuario_roblox})</span></p>
      <div class="flex gap-4 mt-1"><span class="text-xs text-accent">Pts: ${u.puntos||0}</span><span class="text-xs text-success">Coins: ${u.dinero||0}</span></div>
    </div>
    <div class="grid grid-cols-2 gap-3 mb-3">
      <div><label class="${labelCSS()}">Puntos a dar</label><input id="gr-puntos" type="number" value="0" class="${inputCSS('text-accent font-semibold')}"></div>
      <div><label class="${labelCSS()}">Coins a dar</label><input id="gr-dinero" type="number" value="0" class="${inputCSS('text-success font-semibold')}"></div>
    </div>
    <input id="gr-razon" placeholder="Razón (opcional)" class="${inputCSS('mb-4')}">
    <div class="flex gap-2"><button onclick="doGrant('${u.id}',${u.puntos||0},${u.dinero||0})" class="px-5 py-2 bg-success text-white font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer">ENVIAR</button><button onclick="closeModal()" class="px-5 py-2 bg-base-700/50 text-base-400 font-semibold text-xs tracking-wider uppercase rounded-lg cursor-pointer hover:text-base-200">CANCELAR</button></div>
  </div></div>`;
}

async function doGrant(id,currentPts,currentCoins){
  const pts=parseInt(document.getElementById('gr-puntos').value)||0;
  const money=parseInt(document.getElementById('gr-dinero').value)||0;
  const razon=document.getElementById('gr-razon').value||'Asignado por admin';
  if(!pts&&!money)return;
  await sb.from('usuarios').update({puntos:currentPts+pts,dinero:currentCoins+money}).eq('id',id);
  if(pts) await sb.from('movimientos').insert({usuario_id:id,tipo:'ingreso',monto:pts,moneda:'puntos',descripcion:razon});
  if(money) await sb.from('movimientos').insert({usuario_id:id,tipo:'ingreso',monto:money,moneda:'coins',descripcion:razon});
  closeModal();loadAdminData();
}

function closeModal(){modalRoot.innerHTML='';}

function renderAdminSolicitudes(el){
  const reqs=window._aUsers.filter(u=>u.estado==='pendiente');
  if(!reqs.length){el.innerHTML='<p class="text-sm text-base-400 text-center py-12">No hay solicitudes pendientes.</p>';return;}
  el.innerHTML=`<div class="table-wrap"><table><thead><tr><th>NOMBRE</th><th>ROBLOX</th><th>EMAIL</th><th>PUNTOS</th><th>DINERO</th><th>FECHA</th><th></th></tr></thead><tbody>${reqs.map(u=>`<tr><td class="text-base-200">${u.nombre}</td><td class="text-base-300">${u.usuario_roblox}</td><td class="text-base-400">${u.email}</td><td class="text-accent text-xs font-semibold">${u.puntos||0}</td><td class="text-success text-xs font-semibold">${u.dinero||0}</td><td class="text-base-400 text-xs">${fmtDate(u.created_at)}</td><td><div class="flex gap-2"><button onclick="adminApprove('${u.id}')" class="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase bg-[rgba(22,163,74,.12)] text-success border border-[rgba(22,163,74,.2)] rounded-md hover:bg-success hover:text-white transition-colors cursor-pointer">APROBAR</button><button onclick="adminReject('${u.id}')" class="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase bg-[rgba(220,38,38,.12)] text-danger border border-[rgba(220,38,38,.25)] rounded-md hover:bg-danger hover:text-white transition-colors cursor-pointer">RECHAZAR</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
async function adminApprove(id){await sb.from('usuarios').update({estado:'activo',rango:'Soldado',dinero:500,puntos:100}).eq('id',id);loadAdminData();}
async function adminReject(id){if(!confirm('¿Rechazar?'))return;await sb.from('usuarios').delete().eq('id',id);loadAdminData();}

function renderAdminMisiones(el){
  el.innerHTML=`
    <button onclick="showCreateMission()" class="mb-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-[rgba(201,162,39,.1)] text-accent border border-[rgba(201,162,39,.2)] rounded-lg hover:bg-accent hover:text-base-950 transition-colors cursor-pointer">+ NUEVA MISIÓN</button>
    <div class="table-wrap"><table><thead><tr><th>TÍTULO</th><th>FECHA</th><th>PUNTOS</th><th>DINERO</th><th>ESTADO</th><th></th></tr></thead><tbody>
    ${window._aMissions.map(m=>`<tr><td class="text-base-200 font-medium">${m.titulo}</td><td class="text-base-400 text-xs">${fmtDate(m.fecha)}</td><td class="text-accent text-xs font-semibold">${m.recompensa_puntos}</td><td class="text-success text-xs font-semibold">${m.recompensa_dinero}</td><td>${m.estado==='activa'?badge('accent',m.estado):m.estado==='terminada'?badge('success',m.estado):badge('default',m.estado)}</td><td><div class="flex gap-1">${m.estado!=='terminada'?`<button onclick="finishMission('${m.id}','${m.titulo}')" class="px-2 py-1 text-[10px] font-semibold uppercase bg-[rgba(22,163,74,.12)] text-success border border-[rgba(22,163,74,.2)] rounded cursor-pointer hover:bg-success hover:text-white">TERMINAR</button>`:''}<button onclick="deleteMission('${m.id}')" class="p-1.5 text-base-500 hover:text-danger transition-colors cursor-pointer">🗑️</button></div></td></tr>`).join('')}
    ${!window._aMissions.length?'<tr><td colspan="6" class="text-center py-8 text-base-400">No hay misiones</td></tr>':''}
    </tbody></table></div>
  `;
}

function showCreateMission(){
  modalRoot.innerHTML=`<div class="modal-overlay" onclick="closeModal()"><div class="modal-box max-w-lg" onclick="event.stopPropagation()">
    <div class="flex justify-between items-center mb-4"><span class="text-sm font-semibold text-base-100 uppercase tracking-wider">Crear Misión</span><button onclick="closeModal()" class="text-base-500 hover:text-base-200 cursor-pointer">✕</button></div>
    <input id="cm-titulo" placeholder="Título" class="${inputCSS('mb-3')}">
    <input id="cm-desc" placeholder="Descripción" class="${inputCSS('mb-3')}">
    <input id="cm-fecha" type="datetime-local" class="${inputCSS('mb-3')}">
    <div class="grid grid-cols-2 gap-3 mb-3"><div><label class="${labelCSS()}">Puntos</label><input id="cm-pts" type="number" value="0" class="${inputCSS()}"></div><div><label class="${labelCSS()}">Coins</label><input id="cm-coins" type="number" value="0" class="${inputCSS()}"></div></div>
    <button onclick="createMission()" class="${btnAccent()}">CREAR MISIÓN</button>
  </div></div>`;
}

async function createMission(){
  const t=document.getElementById('cm-titulo').value;if(!t)return;
  const f=document.getElementById('cm-fecha').value;
  await sb.from('misiones').insert({titulo:t,descripcion:document.getElementById('cm-desc').value,fecha:f?new Date(f).toISOString():null,recompensa_puntos:parseInt(document.getElementById('cm-pts').value)||0,recompensa_dinero:parseInt(document.getElementById('cm-coins').value)||0,estado:'programada'});
  closeModal();loadAdminData();
}

async function finishMission(id,titulo){
  if(!confirm('Terminar misión y pagar recompensas?'))return;
  const{data:participants}=await sb.from('misiones_participantes').select('usuario_id').eq('mision_id',id).eq('recompensa_pagada',false);
  if(participants?.length){
    for(const p of participants){
      const{data:mission}=await sb.from('misiones').select('recompensa_puntos,recompensa_dinero').eq('id',id).single();
      if(mission){
        const{data:usr}=await sb.from('usuarios').select('puntos,dinero').eq('id',p.usuario_id).single();
        if(usr){
          await sb.from('usuarios').update({puntos:usr.puntos+mission.recompensa_puntos,dinero:usr.dinero+mission.recompensa_dinero}).eq('id',p.usuario_id);
          await sb.from('movimientos').insert([{usuario_id:p.usuario_id,tipo:'recompensa',monto:mission.recompensa_puntos,moneda:'puntos',descripcion:`Recompensa: ${titulo}`},{usuario_id:p.usuario_id,tipo:'recompensa',monto:mission.recompensa_dinero,moneda:'coins',descripcion:`Recompensa: ${titulo}`}]);
        }
        await sb.from('misiones_participantes').update({recompensa_pagada:true}).eq('mision_id',id).eq('usuario_id',p.usuario_id);
      }
    }
  }
  await sb.from('misiones').update({estado:'terminada'}).eq('id',id);loadAdminData();
}

async function deleteMission(id){if(!confirm('¿Eliminar misión?'))return;await sb.from('misiones').delete().eq('id',id);loadAdminData();}

function renderAdminTienda(el){
  el.innerHTML=`
    <button onclick="showCreateItem()" class="mb-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-[rgba(201,162,39,.1)] text-accent border border-[rgba(201,162,39,.2)] rounded-lg hover:bg-accent hover:text-base-950 transition-colors cursor-pointer">+ NUEVO ITEM</button>
    <div class="table-wrap"><table><thead><tr><th>IMG</th><th>NOMBRE</th><th>TIPO</th><th>DINERO</th><th>PUNTOS</th><th>STOCK</th><th>VISIBLE</th><th></th></tr></thead><tbody>
    ${window._aItems.map(it=>`<tr><td>${it.imagen_url?`<img src="${it.imagen_url}" class="w-10 h-10 rounded-lg object-cover border border-base-700/40">`:'<span class="text-base-600 text-xs">—</span>'}</td><td class="text-base-200 font-medium">${it.nombre}</td><td>${badge('default',it.tipo)}</td><td class="text-success text-xs font-semibold">${it.precio_coins}</td><td class="text-accent text-xs font-semibold">${it.precio_puntos}</td><td class="text-base-300 text-xs">${it.stock>=0?it.stock:'∞'}</td><td><button onclick="toggleItem('${it.id}',${it.disponible})" class="px-2 py-1 text-[10px] font-semibold uppercase rounded cursor-pointer transition-colors ${it.disponible?'bg-[rgba(22,163,74,.12)] text-success border border-[rgba(22,163,74,.2)] hover:bg-success hover:text-white':'bg-base-700/30 text-base-500 border border-base-600/40'}">${it.disponible?'SÍ':'NO'}</button></td><td><button onclick="deleteItem('${it.id}')" class="p-1.5 text-base-500 hover:text-danger transition-colors cursor-pointer">🗑️</button></td></tr>`).join('')}
    ${!window._aItems.length?'<tr><td colspan="8" class="text-center py-8 text-base-400">No hay items</td></tr>':''}
    </tbody></table></div>
  `;
}

function showCreateItem(){
  modalRoot.innerHTML=`<div class="modal-overlay" onclick="closeModal()"><div class="modal-box max-w-lg" onclick="event.stopPropagation()">
    <div class="flex justify-between items-center mb-4"><span class="text-sm font-semibold text-base-100 uppercase tracking-wider">Crear Item</span><button onclick="closeModal()" class="text-base-500 hover:text-base-200 cursor-pointer">✕</button></div>
    <input id="ci-nombre" placeholder="Nombre" class="${inputCSS('mb-3')}">
    <input id="ci-desc" placeholder="Descripción" class="${inputCSS('mb-3')}">
    <input id="ci-img" placeholder="URL de imagen" class="${inputCSS('mb-3')}">
    <select id="ci-tipo" class="${inputCSS('mb-3')}"><option value="arma">Arma</option><option value="skin">Skin</option><option value="rango">Rango</option><option value="general">General</option></select>
    <div class="grid grid-cols-3 gap-3 mb-3"><div><label class="${labelCSS()}">Precio Dinero</label><input id="ci-coins" type="number" value="0" class="${inputCSS()}"></div><div><label class="${labelCSS()}">Precio Puntos</label><input id="ci-pts" type="number" value="0" class="${inputCSS()}"></div><div><label class="${labelCSS()}">Stock (-1=inf)</label><input id="ci-stock" type="number" value="-1" class="${inputCSS()}"></div></div>
    <button onclick="createItem()" class="${btnAccent()}">CREAR ITEM</button>
  </div></div>`;
}

async function createItem(){
  if(!document.getElementById('ci-nombre').value)return;
  await sb.from('tienda_items').insert({nombre:document.getElementById('ci-nombre').value,descripcion:document.getElementById('ci-desc').value,imagen_url:document.getElementById('ci-img').value,tipo:document.getElementById('ci-tipo').value,precio_coins:parseInt(document.getElementById('ci-coins').value)||0,precio_puntos:parseInt(document.getElementById('ci-pts').value)||0,stock:parseInt(document.getElementById('ci-stock').value)||-1,disponible:true});
  closeModal();loadAdminData();
}

async function toggleItem(id,cur){await sb.from('tienda_items').update({disponible:!cur}).eq('id',id);loadAdminData();}
async function deleteItem(id){if(!confirm('Eliminar item?'))return;await sb.from('tienda_items').delete().eq('id',id);loadAdminData();}

function renderAdminOpiniones(el){
  if(!window._aOpinions.length){el.innerHTML='<p class="text-sm text-base-400 text-center py-12">No hay opiniones.</p>';return;}
  el.innerHTML=`<div class="table-wrap"><table><thead><tr><th>AUTOR</th><th>ROBLOX</th><th>PUNTOS</th><th>DINERO</th><th>OPINIÓN</th><th>FECHA</th><th></th></tr></thead><tbody>
  ${window._aOpinions.map(o=>`<tr><td class="text-base-200 font-medium">${o.usuarios?.nombre||'—'}</td><td class="text-base-400 text-xs">${o.usuarios?.usuario_roblox||'—'}</td><td class="text-accent text-xs font-semibold">${o.usuarios?.puntos??0}</td><td class="text-success text-xs font-semibold">${o.usuarios?.dinero??0}</td><td class="text-base-300 text-xs max-w-[300px] truncate">"${o.contenido}"</td><td class="text-base-400 text-xs">${fmtDate(o.created_at)}</td><td><button onclick="deleteOpinion('${o.id}')" class="p-1.5 text-base-500 hover:text-danger transition-colors cursor-pointer">🗑️</button></td></tr>`).join('')}
  </tbody></table></div>`;
}
async function deleteOpinion(id){if(!confirm('¿Eliminar opinión?'))return;await sb.from('opiniones').delete().eq('id',id);loadAdminData();}

function renderAdminRoles(el){
  el.innerHTML=`
    <div class="flex items-center justify-between mb-4"><p class="text-xs text-base-400">Gestiona los tipos de rol disponibles en el sistema.</p><button onclick="showCreateRole()" class="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-[rgba(201,162,39,.1)] text-accent border border-[rgba(201,162,39,.2)] rounded-lg hover:bg-accent hover:text-base-950 transition-colors cursor-pointer">+ NUEVO ROL</button></div>
    <div class="table-wrap"><table><thead><tr><th>NOMBRE</th><th>DESCRIPCIÓN</th><th>COLOR</th><th>FECHA</th><th></th></tr></thead><tbody>
    ${window._aRoles.map(r=>`<tr><td class="text-base-200 font-medium">${r.nombre}</td><td class="text-base-400 text-xs">${r.descripcion||'—'}</td><td>${badge(r.color||'default',r.color||'default')}</td><td class="text-base-400 text-xs">${fmtDate(r.created_at)}</td><td><button onclick="deleteRole('${r.id}','${r.nombre}')" class="p-1.5 text-base-500 hover:text-danger transition-colors cursor-pointer">🗑️</button></td></tr>`).join('')}
    ${!window._aRoles.length?'<tr><td colspan="5" class="text-center py-8 text-base-400">No hay roles personalizados. Roles por defecto: USUARIO, STAFF, ADMIN, SUPER ADMIN</td></tr>':''}
    </tbody></table></div>
  `;
}

function showCreateRole(){
  const colors=['default','accent','success','warning','danger'];
  modalRoot.innerHTML=`<div class="modal-overlay" onclick="closeModal()"><div class="modal-box max-w-md" onclick="event.stopPropagation()">
    <div class="flex justify-between items-center mb-4"><span class="text-sm font-semibold text-base-100 uppercase tracking-wider">Crear Rol</span><button onclick="closeModal()" class="text-base-500 hover:text-base-200 cursor-pointer">✕</button></div>
    <input id="cr-nombre" placeholder="Nombre del rol" class="${inputCSS('mb-3')}">
    <input id="cr-desc" placeholder="Descripción" class="${inputCSS('mb-3')}">
    <label class="${labelCSS()}">Color</label>
    <div class="flex gap-2 mb-4">${colors.map(c=>`<button onclick="document.getElementById('cr-color').value='${c}';document.querySelectorAll('.cr-color-btn').forEach(b=>b.classList.remove('ring-2','ring-accent'));this.classList.add('ring-2','ring-accent')" class="cr-color-btn px-3 py-1 text-xs font-semibold uppercase rounded border cursor-pointer transition-colors ${c==='default'?'bg-base-600/30 text-base-300 border-base-600/40':c==='accent'?'bg-[rgba(201,162,39,.12)] text-accent border-[rgba(201,162,39,.25)]':c==='success'?'bg-[rgba(22,163,74,.12)] text-success border-[rgba(22,163,74,.2)]':c==='warning'?'bg-[rgba(217,119,6,.12)] text-warning border-[rgba(217,119,6,.2)]':'bg-[rgba(220,38,38,.12)] text-danger border-[rgba(220,38,38,.25)]'}">${c}</button>`).join('')}</div>
    <input id="cr-color" type="hidden" value="default">
    <button onclick="createRole()" class="${btnAccent()}">CREAR ROL</button>
  </div></div>`;
}

async function createRole(){
  const n=document.getElementById('cr-nombre').value;if(!n)return;
  await sb.from('roles').insert({nombre:n,descripcion:document.getElementById('cr-desc').value,color:document.getElementById('cr-color').value});
  closeModal();loadAdminData();
}

async function deleteRole(id,nombre){if(!confirm(`¿Eliminar el rol "${nombre}"?`))return;await sb.from('roles').delete().eq('id',id);loadAdminData();}

// ---- INIT ----
initAuth();
