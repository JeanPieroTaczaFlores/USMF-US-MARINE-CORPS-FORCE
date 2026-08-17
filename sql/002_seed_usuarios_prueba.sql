-- ============================================
-- USMCF — USUARIOS DE PRUEBA
-- Ejecutar DESPUÉS de 001_schema.sql
-- ============================================
-- IMPORTANTE: Primero crea estos usuarios desde la UI de Supabase
-- Authentication > Users > Add User, o ejecuta este SQL después
-- de que los usuarios se registren manualmente.
--
-- Estos inserts solo funcionan si los UUIDs coinciden con
-- los auth.users existentes. Es más fácil hacerlo desde Supabase Dashboard:
--
-- 1. Ve a Authentication > Users > Add User
-- 2. Crea estos 3 usuarios:
--
-- USUARIO ADMIN:
--   Email: admin@usmcf.com
--   Password: Admin123!
--   User Metadata: { "nombre": "Comandante USMCF", "usuario_roblox": "AdminUSMCF" }
--
-- USUARIO STAFF:
--   Email: staff@usmcf.com
--   Password: Staff123!
--   User Metadata: { "nombre": "Sargento Mayor", "usuario_roblox": "StaffUSMCF" }
--
-- USUARIO CLIENTE:
--   Email: cliente@usmcf.com
--   Password: Cliente123!
--   User Metadata: { "nombre": "Recluta Test", "usuario_roblox": "ClienteTest" }
--
-- 3. Después de crearlos, ejecuta esto en el SQL Editor para
--    asignarles los roles correctos:

-- ASIGNAR ROL ADMIN
UPDATE profiles SET
  rol = 'super_admin',
  estado = 'activo',
  rango = 'General',
  puntos = 10000,
  dinero = 50000
WHERE email = 'admin@usmcf.com';

-- ASIGNAR ROL STAFF
UPDATE profiles SET
  rol = 'staff',
  estado = 'activo',
  rango = 'Sargento Mayor de 1ra Clase',
  puntos = 5000,
  dinero = 15000
WHERE email = 'staff@usmcf.com';

-- ASIGNAR ROL CLIENTE (se queda como usuario normal)
UPDATE profiles SET
  rol = 'usuario',
  estado = 'activo',
  rango = 'Soldado',
  puntos = 100,
  dinero = 500
WHERE email = 'cliente@usmcf.com';

-- ============================================
-- INSERTAR ALGUNAS MISIONES DE PRUEBA
-- ============================================
INSERT INTO missions (titulo, descripcion, fecha, recompensa_puntos, recompensa_dinero, estado, created_by)
VALUES
  ('Patrulla Fronteriza Norte', 'Operación de patrullaje en la zona norte. Requiere equipo completo.', NOW() + INTERVAL '2 days', 150, 300, 'programada', NULL),
  ('Entrenamiento Básico TRS', 'Sesión de entrenamiento para nuevos reclutas.', NOW() + INTERVAL '1 day', 80, 120, 'activa', NULL),
  ('Asalto a Base Enemiga', 'Operación ofensiva de alto riesgo. Solo personal experimentado.', NOW() + INTERVAL '5 days', 300, 500, 'programada', NULL);
