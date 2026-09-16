# USMCF — US Marine Corps Force

Sitio público y plataforma de miembros unificados en un solo repositorio.

## Plataforma

`plataforma.html` reúne:

- inicio de sesión por correo y Discord;
- correo institucional obligatorio `@usmcf.com` para acceso por contraseña;
- vinculación manual de una cuenta existente con Discord;
- directorio completo de la facción sincronizado desde Discord;
- perfil, rango, puntos y saldo;
- salario semanal automático para miembros; Administración usa fondos de mando ilimitados y no cobra salario;
- Store con carrito y checkout atómico;
- facturas descargables e inventario;
- biblioteca de reglas, armas, loadouts, equipamiento oficial con imágenes de Discord y manuales;
- misiones con inscripción, estado en misión, equipamiento obligatorio, enlace privado de Roblox y bitácora de alertas Discord;
- cierre bloqueado hasta que Staff/Admin confirme o marque ausente a cada participante;
- recompensas de misión y ajustes auditados de puntos/dinero;
- ascensos automáticos por puntos desde Soldado hasta Sargento Mayor de la Infantería;
- convocatorias de Raider y especialidades con beneficios, requisitos y aprobación de Staff/Admin;
- administración integral para crear cuentas, editar perfiles, permisos, estados y rangos;
- asignación automática del Entrenamiento Básico TRS para cada cuenta nueva;
- graduación por Staff/Admin que activa la cuenta y asigna automáticamente el rango Soldado;
- publicación automática de cada misión en Discord con fecha, recompensas, equipamiento y enlace del servidor privado;
- panel de anuncios de Administración con entrega al canal oficial de Discord;
- publicación u ocultamiento de artículos de la Store.

Sin credenciales remotas, el sitio conserva únicamente el acceso local de mando `admin@usmcf.com` / `Admin123!`. Los antiguos miembros ficticios se eliminan automáticamente del almacenamiento local. Los perfiles reales aparecen cuando el bot sincroniza el servidor.

## Conectar Supabase

1. Crea un proyecto de Supabase.
2. Ejecuta, en orden, las migraciones de `supabase/migrations/`.
3. En `js/config.js`, reemplaza la URL y la clave publicable de ejemplo. Nunca coloques una clave secreta o `service_role` en el navegador.
4. En Supabase Auth, habilita Discord, registra la URL pública de `plataforma.html` como redirect URL y activa **Manual Identity Linking**.
5. En **Authentication → Hooks**, configura **Before User Created** con `pg-functions://postgres/private/hook_usmcf_before_user_created`. El hook rechaza correos que no terminen en `@usmcf.com`; los accesos de Discord se validan contra el directorio oficial.
6. En el servidor `1016036020875165797`, crea webhooks para `🚨╙Misiones` (`1254309543828262923`), `🚨╙Entrenamientos` (`1259971958708240507`), `💵╙Puntos` (`1254309496268918804`), `📢╙Anuncio` (`1549116084714737755`) y un canal privado de accesos para el bot.
7. Guarda las URLs fuera del repositorio: `supabase secrets set DISCORD_MISSIONS_WEBHOOK_URL=... DISCORD_TRAINING_WEBHOOK_URL=... DISCORD_POINTS_WEBHOOK_URL=... DISCORD_ANNOUNCEMENTS_WEBHOOK_URL=... DISCORD_ACCESS_WEBHOOK_URL=...`.
8. Crea un bot de Discord, activa **Server Members Intent**, invítalo al servidor con **Ver canales**, **Enviar mensajes** y **Gestionar roles**, y coloca su rol por encima de los roles que administrará.
9. Guarda también la configuración privada del bot: `supabase secrets set DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=1016036020875165797 DISCORD_ROLE_RECRUIT_ID=... DISCORD_ROLE_SOLDIER_ID=... DISCORD_ROLE_STAFF_ID=... DISCORD_ROLE_ADMIN_ID=...`.
10. Despliega las funciones con `supabase functions deploy discord-mission-alert`, `supabase functions deploy discord-role-sync` y `supabase functions deploy admin-users`.
11. La migración `20260915143000_mission_equipment_and_private_server.sql` añade los datos operativos de misión y la cola automática de anuncios.

La migración activa RLS, limita cada miembro a sus propios datos, procesa el carrito dentro de una transacción y programa el pago semanal los lunes a las 00:00 (UTC-5).
Las URLs de webhook, el token del bot y la clave `service_role` permanecen exclusivamente en Supabase; nunca se publican en el JavaScript del navegador. El bot publica una alerta en cada ingreso, inscripción, inicio de misión, entrenamiento y ajuste económico. Al vincular Discord asigna el rol Recluta; cuando Staff o Admin confirma el TRS, cambia automáticamente a Soldado. Los cambios de permiso hechos por Administración también sincronizan Staff o Admin si el usuario tiene Discord vinculado.

## Bot Discord 24/7

El directorio `bot/` contiene el servicio permanente que procesa eventos pendientes, publica anuncios, tickets y respuestas, anuncia graduaciones y ascensos, sincroniza rangos y especialidades y actualiza cada diez minutos el directorio completo de miembros de la facción. También recuerda al Staff los tickets o cursos que superen tres días sin resolverse y crea una invitación de Discord renovada antes de cumplir 24 horas. No necesita librerías externas: usa Node 22, la API REST de Discord y Supabase. El archivo `render.yaml` permite desplegarlo como servicio Docker con comprobación `/health`.

1. Aplica todas las migraciones, incluida `20260915051050_discord_roster_and_official_email.sql`.
2. Copia las variables de `bot/.env.example` en el proveedor donde funcionará el bot.
3. Completa `DISCORD_RANK_ROLE_MAP` y `DISCORD_SPECIALTY_ROLE_MAP` con los IDs reales de los roles.
4. Mantén el token del bot y la `service_role` únicamente como secretos del proveedor.
5. Usa un servicio que permanezca activo continuamente; `/health` confirma si faltan credenciales o si el procesador está conectado.

Los rangos de oficial no se asignan automáticamente: desde Teniente Segundo el Discord exige guerras y capacitación, por lo que el ascenso continúa bajo confirmación manual de Administración.
