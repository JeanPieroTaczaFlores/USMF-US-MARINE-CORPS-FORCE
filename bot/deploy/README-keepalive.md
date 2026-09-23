# Mantener despierto a Kriss Kyle en Render Free

El bot expone `GET /health`. Responde 200 solo cuando tiene la configuración
necesaria, está conectado al Gateway de Discord y completó al menos una
consulta a Supabase. Por eso, la tarea programada también detecta un bot
arrancado pero desconectado.

1. Desplegar el bot como servicio web de Render y comprobar que `/health`
   responde 200. No guardar el token de Discord ni la clave de servicio de
   Supabase en GitHub; configurarlos como variables secretas en Render.
2. Subir `.github/workflows/kriss-kyle-keepalive.yml` a la rama principal.
3. En GitHub, abrir **Settings → Secrets and variables → Actions → Variables**
   y crear `KRISS_KYLE_HEALTH_URL` con el valor
   `https://NOMBRE-DEL-SERVICIO.onrender.com/health`.
4. Ejecutar **Actions → Kriss Kyle keepalive → Run workflow** y comprobar un
   resultado correcto. Después verificar periódicamente su historial.

GitHub enviará un GET cada cinco minutos. Una petición despierta
automáticamente un servicio dormido de Render; no hace falta pulsar ningún
botón manualmente. Este mecanismo **no garantiza 24/7**: GitHub puede retrasar
o descartar ejecuciones y desactiva trabajos programados de repositorios
públicos tras 60 días sin actividad. Render también puede reiniciar o suspender
un servicio gratuito por sus propios límites. Si la tarea falla, los eventos
de Discord sucedidos mientras el bot estuvo desconectado pueden perderse.

Los ejecutores estándar de GitHub Actions son gratuitos sin límite de minutos
en repositorios **públicos**. En repositorios privados consumen la cuota de
minutos del titular y pueden generar cargos; antes de activar esta frecuencia
hay que confirmar la visibilidad y la configuración de facturación.

Como segundo comprobador independiente, se puede crear un monitor HTTP(S)
gratuito en UptimeRobot para la misma URL `/health`, con intervalo de cinco
minutos y alertas por correo. No debe instalarse un segundo bot en Render:
dos servicios encendidos todo el mes superarían la bolsa compartida de 750
horas gratuitas. El monitor externo no consume horas de instancia de Render
por sí mismo; las horas se consumen mientras el bot está encendido.
