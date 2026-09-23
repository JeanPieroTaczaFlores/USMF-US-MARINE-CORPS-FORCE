// ============================================
// USMCF — CONFIGURACIÓN
// Usa Supabase cuando está configurado. La simulación local sólo se permite
// en localhost para no publicar cuentas de demostración como acceso real.
// ============================================

const SUPABASE_URL = (window.USMCF_CONFIG && window.USMCF_CONFIG.supabaseUrl) || "https://mbwgkjwyjgzbxvaryibg.supabase.co";
const SUPABASE_ANON_KEY = (window.USMCF_CONFIG && window.USMCF_CONFIG.supabaseKey) || "sb_publishable_jZtwGcP_Km7mbjJSv9T1wg_vJCW_nRN";

// Detectar si Supabase está configurado
var isSupabaseConfigured =
  SUPABASE_URL.indexOf("TU-PROYECTO") === -1 &&
  SUPABASE_ANON_KEY.indexOf("TU-PUBLISHABLE-KEY") === -1;
var isLocalPreview = ["localhost", "127.0.0.1"].indexOf(window.location.hostname) !== -1;

// Inicializar cliente (Supabase o localStorage)
var supabase;
if (isSupabaseConfigured && window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("[USMCF] Modo: Supabase remoto");
} else if (isLocalPreview) {
  // Se espera que local-auth.js ya haya expuesto LocalSupabase
  supabase = window.LocalSupabase || null;
  console.log("[USMCF] Modo: localStorage (pruebas locales)");
} else {
  supabase = null;
  console.warn("[USMCF] Acceso deshabilitado: Supabase no está configurado.");
}

// Rangos del sistema
const RANGOS = [
  { rango: 'Recluta', salario: 0, categoria: 'enlistado' },
  { rango: 'Soldado', salario: 80, categoria: 'enlistado' },
  { rango: 'Soldado de Primera', salario: 120, categoria: 'enlistado' },
  { rango: 'Cabo de Lanza', salario: 160, categoria: 'enlistado' },
  { rango: 'Cabo', salario: 200, categoria: 'enlistado' },
  { rango: 'Cabo de Lanza (Avanzado)', salario: 250, categoria: 'enlistado' },
  { rango: 'Sargento', salario: 300, categoria: 'suboficial' },
  { rango: 'Sargento del Estado Mayor', salario: 360, categoria: 'suboficial' },
  { rango: 'Sargento de Artillería', salario: 420, categoria: 'suboficial' },
  { rango: 'Sargento Mayor de 2da Clase', salario: 480, categoria: 'suboficial' },
  { rango: 'Sargento Primero', salario: 550, categoria: 'suboficial' },
  { rango: 'Sargento Mayor de Artillería', salario: 620, categoria: 'suboficial' },
  { rango: 'Sargento Mayor de 1ra Clase', salario: 700, categoria: 'suboficial' },
  { rango: 'Sargento Mayor de la Infantería', salario: 800, categoria: 'suboficial' },
  { rango: 'Teniente Segundo', salario: 900, categoria: 'oficial' },
  { rango: 'Teniente Primero', salario: 1000, categoria: 'oficial' },
  { rango: 'Capitán', salario: 1200, categoria: 'oficial' },
  { rango: 'Mayor', salario: 1400, categoria: 'oficial' },
  { rango: 'Teniente Coronel', salario: 1600, categoria: 'oficial' },
  { rango: 'Coronel', salario: 1800, categoria: 'oficial' },
  { rango: 'General de Brigada', salario: 2000, categoria: 'oficial' },
  { rango: 'General Mayor', salario: 2200, categoria: 'oficial' },
  { rango: 'General', salario: 2400, categoria: 'oficial' },
  { rango: 'General de la Infantería', salario: 2600, categoria: 'oficial' }
];

const RANGO_DEFAULT = 'Soldado';
const DINERO_INICIAL = 500;
const PUNTOS_INICIALES = 100;

// Escala verificada en el canal oficial de rangos de Discord.
// Los oficiales requieren guerras/capacitación y permanecen bajo confirmación de mando.
const RANK_THRESHOLDS = [
  { rango: 'Soldado', puntos: 100 },
  { rango: 'Soldado de Primera', puntos: 150 },
  { rango: 'Cabo de Lanza', puntos: 250 },
  { rango: 'Cabo', puntos: 350 },
  { rango: 'Cabo de Lanza (Avanzado)', puntos: 500 },
  { rango: 'Sargento', puntos: 700 },
  { rango: 'Sargento del Estado Mayor', puntos: 900 },
  { rango: 'Sargento de Artillería', puntos: 1200 },
  { rango: 'Sargento Mayor de 2da Clase', puntos: 1250 },
  { rango: 'Sargento Primero', puntos: 1300 },
  { rango: 'Sargento Mayor de Artillería', puntos: 1400 },
  { rango: 'Sargento Mayor de 1ra Clase', puntos: 1450 },
  { rango: 'Sargento Mayor de la Infantería', puntos: 1500 }
];

window.RANGOS = RANGOS;
window.RANK_THRESHOLDS = RANK_THRESHOLDS;
