// ============================================
// USMCF — CONFIGURACIÓN DE SUPABASE
// Reemplaza这些 valores con los de tu proyecto
// ============================================

const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU-ANON-KEY-AQUI";

// Inicializar cliente Supabase
const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Rangos del sistema
const RANGOS = [
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
