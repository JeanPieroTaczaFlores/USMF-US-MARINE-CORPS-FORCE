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
- misiones con inscripción, estado en misión y bitácora de alertas Discord;
- cierre bloqueado hasta que Staff/Admin confirme o marque ausente a cada participante;
- recompensas de misión y ajustes auditados de puntos/dinero;
- administración integrada para aprobar miembros, asignar rangos y publicar u ocultar artículos.

Sin credenciales remotas, el sitio entra en modo demostración con `localStorage`. Hay dos accesos de prueba:

- Miembro: `cliente@usmcf.com` / `Cliente123!`
- Staff: `staff@usmcf.com` / `Staff123!`
- Mando: `admin@usmcf.com` / `Admin123!`

## Conectar Supabase

1. Crea un proyecto de Supabase.
2. Ejecuta, en orden, las migraciones de `supabase/migrations/`.
3. En `js/config.js`, reemplaza la URL y la clave publicable de ejemplo. Nunca coloques una clave secreta o `service_role` en el navegador.
4. En Supabase Auth, habilita Discord y registra la URL pública de `plataforma.html` como redirect URL.
5. Crea un webhook en el canal de misiones `1360827424018923530` del servidor `1016036020875165797` y guárdalo como secreto de la Edge Function: `supabase secrets set DISCORD_MISSIONS_WEBHOOK_URL=...`.
6. Despliega la función con `supabase functions deploy discord-mission-alert`.

La migración activa RLS, limita cada miembro a sus propios datos, procesa el carrito dentro de una transacción y programa el pago semanal los lunes a las 00:00 (UTC-5).
La URL del webhook y la clave `service_role` permanecen exclusivamente en Supabase; nunca se publican en el JavaScript del navegador.
