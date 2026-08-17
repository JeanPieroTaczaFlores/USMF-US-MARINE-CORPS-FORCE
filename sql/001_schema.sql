-- ============================================
-- USMCF — ESQUEMA DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de perfiles (vinculada a auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  usuario_roblox TEXT NOT NULL,
  email TEXT,
  rango TEXT NOT NULL DEFAULT 'Soldado',
  puntos INTEGER NOT NULL DEFAULT 0,
  dinero INTEGER NOT NULL DEFAULT 500,
  rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario', 'staff', 'admin', 'super_admin')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de salarios por rango
CREATE TABLE IF NOT EXISTS salaries (
  id SERIAL PRIMARY KEY,
  rango TEXT NOT NULL UNIQUE,
  salario_semanal INTEGER NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('enlistado', 'suboficial', 'oficial'))
);

-- Tabla de misiones
CREATE TABLE IF NOT EXISTS missions (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL,
  recompensa_puntos INTEGER NOT NULL DEFAULT 0,
  recompensa_dinero INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada', 'activa', 'terminada', 'cancelada')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de participantes de misiones
CREATE TABLE IF NOT EXISTS mission_participants (
  id SERIAL PRIMARY KEY,
  mission_id INTEGER NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asistio BOOLEAN NOT NULL DEFAULT FALSE,
  puntos_entregados INTEGER NOT NULL DEFAULT 0,
  dinero_entregado INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mission_id, user_id)
);

-- Tabla de transacciones económicas
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('salario', 'mision', 'compra', 'manual', 'bono')),
  descripcion TEXT NOT NULL,
  monto_puntos INTEGER NOT NULL DEFAULT 0,
  monto_dinero INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de tienda
CREATE TABLE IF NOT EXISTS shop_items (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  precio INTEGER NOT NULL,
  imagen_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de inventario de usuarios
CREATE TABLE IF NOT EXISTS user_inventory (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  comprado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- Tabla de opiniones anónimas
CREATE TABLE IF NOT EXISTS opinions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- DATOS BASE: Salarios por rango
-- ============================================
INSERT INTO salaries (rango, salario_semanal, categoria) VALUES
  ('Soldado', 80, 'enlistado'),
  ('Soldado de Primera', 120, 'enlistado'),
  ('Cabo de Lanza', 160, 'enlistado'),
  ('Cabo', 200, 'enlistado'),
  ('Cabo de Lanza (Avanzado)', 250, 'enlistado'),
  ('Sargento', 300, 'suboficial'),
  ('Sargento del Estado Mayor', 360, 'suboficial'),
  ('Sargento de Artillería', 420, 'suboficial'),
  ('Sargento Mayor de 2da Clase', 480, 'suboficial'),
  ('Sargento Primero', 550, 'suboficial'),
  ('Sargento Mayor de Artillería', 620, 'suboficial'),
  ('Sargento Mayor de 1ra Clase', 700, 'suboficial'),
  ('Sargento Mayor de la Infantería', 800, 'suboficial'),
  ('Teniente Segundo', 900, 'oficial'),
  ('Teniente Primero', 1000, 'oficial'),
  ('Capitán', 1200, 'oficial'),
  ('Mayor', 1400, 'oficial'),
  ('Teniente Coronel', 1600, 'oficial'),
  ('Coronel', 1800, 'oficial'),
  ('General de Brigada', 2000, 'oficial'),
  ('General Mayor', 2200, 'oficial'),
  ('General', 2400, 'oficial'),
  ('General de la Infantería', 2600, 'oficial')
ON CONFLICT (rango) DO NOTHING;

-- ============================================
-- FUNCIONES
-- ============================================

-- Función para crear perfil al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nombre, usuario_roblox, email, rango, rol, estado, dinero)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Sin nombre'),
    COALESCE(NEW.raw_user_meta_data->>'usuario_roblox', 'sin_usuario'),
    NEW.email,
    'Soldado',
    'usuario',
    'pendiente',
    500
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: crear perfil al registrarse
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Función para asignar salario semanal
CREATE OR REPLACE FUNCTION pay_weekly_salary()
RETURNS void AS $$
BEGIN
  INSERT INTO transactions (user_id, tipo, descripcion, monto_dinero)
  SELECT
    p.id,
    'salario',
    'Salario semanal - ' || p.rango,
    s.salario_semanal
  FROM profiles p
  JOIN salaries s ON s.rango = p.rango
  WHERE p.estado = 'activo';

  UPDATE profiles
  SET dinero = dinero + s.salario_semanal,
      updated_at = NOW()
  FROM salaries s
  WHERE profiles.rango = s.rango
    AND profiles.estado = 'activo';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para notificar nueva misión
CREATE OR REPLACE FUNCTION notify_new_mission(mission_title TEXT, mission_desc TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, titulo, mensaje)
  SELECT
    id,
    'Nueva Misión',
    mission_title || ': ' || mission_desc
  FROM profiles
  WHERE estado = 'activo';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: cada usuario ve su propio perfil, admin/staff ven todos
CREATE POLICY "usuarios_ven_su_perfil" ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );

CREATE POLICY "admin_actualiza_perfiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );

-- Salarios: todos los ven
CREATE POLICY "salarios_visibles" ON salaries FOR SELECT USING (true);

-- Misiones: todos las ven, admin/staff crean
CREATE POLICY "misiones_visibles" ON missions FOR SELECT USING (true);
CREATE POLICY "admin_crea_misiones" ON missions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );
CREATE POLICY "admin_actualiza_misiones" ON missions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );

-- Participantes: admin/staff registran, usuario ve los suyos
CREATE POLICY "admin_ven_participantes" ON mission_participants
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );
CREATE POLICY "admin_registra_asistencia" ON mission_participants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );
CREATE POLICY "admin_actualiza_asistencia" ON mission_participants
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );

-- Transacciones: usuario ve las suyas, admin/staff ven todas
CREATE POLICY "transacciones_visibles" ON transactions
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );
CREATE POLICY "admin_crea_transacciones" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );

-- Tienda: todos ven ítems activos, admin gestiona
CREATE POLICY "tienda_visible" ON shop_items
  FOR SELECT USING (activo = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'super_admin')
  ));
CREATE POLICY "admin_gestiona_tienda" ON shop_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'super_admin'))
  );

-- Inventario: usuario ve el suyo, admin ve todos
CREATE POLICY "inventario_visible" ON user_inventory
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );
CREATE POLICY "usuario_compra" ON user_inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Opiniones: admin/staff ven todas, usuario crea
CREATE POLICY "admin_ven_opiniones" ON opinions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );
CREATE POLICY "usuario_crea_opinion" ON opinions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notificaciones: usuario ve las suyas
CREATE POLICY "notificaciones_visibles" ON notifications
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );
CREATE POLICY "admin_crea_notificaciones" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin', 'staff', 'super_admin'))
  );
CREATE POLICY "usuario_marca_leida" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
