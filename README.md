# USMCF — US Marine Corps Force

Sitio público y plataforma de miembros unificados en un solo repositorio.

## Plataforma

`plataforma.html` reúne:

- inicio de sesión por correo y Discord;
- perfil, rango, puntos y saldo;
- salario semanal automático;
- Store con carrito y checkout atómico;
- facturas descargables e inventario;
- biblioteca de reglas, armas, loadouts y manuales.
- administración integrada para aprobar miembros, asignar rangos y publicar u ocultar artículos.

Sin credenciales remotas, el sitio entra en modo demostración con `localStorage`. Hay dos accesos de prueba:

- Miembro: `cliente@usmcf.com` / `Cliente123!`
- Mando: `admin@usmcf.com` / `Admin123!`

## Conectar Supabase

1. Crea un proyecto de Supabase.
2. Ejecuta `supabase/migrations/20260914030000_unified_member_platform.sql` en el proyecto.
3. En `js/config.js`, reemplaza la URL y la clave publicable de ejemplo. Nunca coloques una clave secreta o `service_role` en el navegador.
4. En Supabase Auth, habilita Discord y registra la URL pública de `plataforma.html` como redirect URL.

La migración activa RLS, limita cada miembro a sus propios datos, procesa el carrito dentro de una transacción y programa el pago semanal los lunes a las 00:00 (UTC-5).
