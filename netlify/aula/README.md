# Aula Virtual GASI — instalación real privada

Sistema LMS con acceso exclusivo mediante cuentas creadas por GASI.
**No existe registro público ni endpoint sintético.** Nunca publicar el backend
del aula en el proyecto comercial de \`gasisalud.com\` ni en el clínico.

## Orden exacto de puesta en marcha

1. **Crear PostgreSQL privado:** instancia exclusiva, TLS, credenciales de
   privilegio mínimo, copias de seguridad y restauración probada.
2. **Aplicar las migraciones:** instalar dependencias con
   \`npm --prefix netlify ci --ignore-scripts\`. Ejecutar desde la carpeta
   \`netlify\`: \`GASI_AULA_DB_URL=<URL_PRIVADA> node aula/migrate.mjs\`.
   Ejecuta de forma transaccional y versionada \`001_core.sql\` hasta
   \`006_voluntary_practice_random_options.sql\`, registra SHA-256 y
   rechaza cambios en migraciones ya aplicadas. Repetir el comando para
   comprobar que no reaplica versiones. No usar los SQL heredados a mano.
3. **Crear el primer administrador una sola vez:** desde una consola segura,
   sin guardar credenciales en Git, configurar temporalmente
   \`GASI_AULA_DB_URL\`, \`AULA_BOOTSTRAP_CONFIRM=CREATE_FIRST_ADMIN\`,
   \`AULA_BOOTSTRAP_EMAIL\`, \`AULA_BOOTSTRAP_NAME\` y
   \`AULA_BOOTSTRAP_PASSWORD\`. Ejecutar
   \`cd netlify && node aula/bootstrap-admin.mjs\`. Contraseña de al menos
   12 caracteres. El script protege contra altas simultáneas y rechaza
   otro bootstrap si ya existe un administrador. **Borrar las variables
   temporales** y cambiar contraseña tras el primer acceso.
4. **Configurar un Netlify separado para el aula:** usar
   \`aula-site/netlify.toml\`. Establecer secretos en **Functions**,
   exclusivamente en este sitio, en los contextos privado que se vayan a
   usar (Deploy Previews y Production):
   - \`GASI_AULA_DB_URL\`: conexión TLS a PostgreSQL privado.
   - \`GASI_AULA_RESEND_API_KEY\`: clave de recuperación de contraseñas.
   - \`GASI_AULA_SENDER_EMAIL\`: remitente verificado en Resend.
   El backend utiliza tokens aleatorios criptográficos de sesión,
   almacenados solo por su hash en PostgreSQL: **no se utiliza
   \`GASI_AULA_SESSION_SECRET\`** ni es necesario configurarlo.
   El build privado fija \`REACT_APP_AULA_ENABLED=true\`.
5. **Probar acceso real:** abrir \`/aula/acceso\` en el sitio privado,
   iniciar sesión con el administrador, forzar cambio de contraseña,
   dar de alta un autor, tutor y alumno de prueba, y comprobar roles
   y cursos asignados. Verificar la recuperación de contraseña con
   un remitente autorizado.
6. **Probar la formación y sus límites:** curso con unidad 0,
   competencias, RA/H2, límite diario (día de calendario de
   **Europa/Madrid**), plazo 90 días, tiempo, test de 10 preguntas de 15
   con tres opciones barajadas, práctica obligatoria y voluntaria,
   corrección por rúbrica, tutorías, foros, expediente, encuesta y
   certificado privado.
7. **Despliegue:** sólo Fernando puede autorizar fusión con \`main\`,
   publicación, dominio definitivo y comunicación al alumnado.
   Un CI en verde no es una orden de despliegue.

## Verificación automatizada

GitHub Actions utiliza **PostgreSQL 17 real**, no un mock, en un service
container temporal. Ejecuta dos veces las migraciones versionadas,
prueba que no puede repetirse el bootstrap y verifica autenticación,
matrículas, permisos entre roles, entre cursos y entre estudiantes,
preguntas barajadas, prácticas con rúbrica, foros, tutorías, expediente,
mapa de RA, análisis de tiempos, encuestas y certificados. Son datos
sintéticos exclusivamente en CI.

Los certificados de finalización no se presentan como título oficial
ni acreditación sanitaria sin la habilitación correspondiente.

## Estado de infraestructura (07/11/2026)

- **Creado** en Netlify el proyecto independiente `gasi-aula-privada`
  (sitio ID `620b3f03-68b4-4f2d-b79a-80e04eec3281`).
  Proyecto: https://app.netlify.com/projects/gasi-aula-privada
- **Activada** la protección de visitantes por inicio de sesión del equipo
  Netlify, para todos los despliegues. Es una barrera **temporal** de
  preproducción: el acceso normal de alumnos externos necesitará revisar
  esta protección al publicar, manteniendo la autenticación propia del LMS.
- **Sin despliegue ni repositorio asociado** en el nuevo sitio. La configuración
  de compilación prevista sigue siendo `aula-site/netlify.toml`.
- **Resend verificado:** el dominio `gasisalud.com` está autorizado para el
  envío. No reutilizar la clave existente de notificaciones MediQuote.
- **Bloqueo real de permisos:** el conector Netlify devuelve HTTP 403 al
  escribir variables de entorno del nuevo sitio. Las variables del aula
  siguen **sin configurar**; no se han creado ni expuesto credenciales.
- **Sitio comercial canónico** con dominio `gasisalud.com`:
  `voluble-kataifi-9b8274`; no confundir con el proyecto distinto
  `lucent-beijinho-d67388`. Falta `RESEND_API_KEY` en el sitio canónico.

## PENDIENTE DE FERNANDO / CONFIGURACIÓN PRIVADA

- Crear PostgreSQL exclusivo con TLS, backups y acceso restringido; obtener
  `GASI_AULA_DB_URL` **sin publicar la URL en Git, chats ni logs**.
- Resolver el acceso de escritura a Netlify (HTTP 403). En el proyecto
  `gasi-aula-privada`, configurar con ámbito **Functions**:
  - `GASI_AULA_DB_URL`: secreto (Deploy Previews/Production autorizados).
  - `GASI_AULA_RESEND_API_KEY`: secreto, clave de Resend nueva con permiso
    **sending_access** restringido al dominio verificado.
  - `GASI_AULA_SENDER_EMAIL`: remitente del dominio verificado; propuesta
    `coordinacion@gasisalud.com` (texto, no secreto).
- Asociar **solo el sitio privado** al repositorio y a la rama aprobada con
  la configuración `aula-site/netlify.toml`, cuando Fernando autorice
  expresamente el despliegue. Nunca usar el proyecto comercial para Aula.
- Sitio comercial `voluble-kataifi-9b8274`: configurar `RESEND_API_KEY`
  como secreto Functions, usando una **clave distinta** de la del aula y
  de MediQuote; verificar envío real del chatbot tras el despliegue aprobado.
- Migrar PostgreSQL con `netlify/aula/migrate.mjs` y ejecutar desde entorno
  seguro `netlify/aula/bootstrap-admin.mjs` una sola vez, pasando
  `AULA_BOOTSTRAP_CONFIRM=CREATE_FIRST_ADMIN`, `AULA_BOOTSTRAP_EMAIL`,
  `AULA_BOOTSTRAP_NAME` y `AULA_BOOTSTRAP_PASSWORD` temporalmente.
  Eliminar las variables de bootstrap al terminar. No necesita secreto de
  firma adicional para las sesiones.
- Fernando decide dominio final, revisión de textos legales y alcance de
  certificados, fusión y despliegue. No confundir un sitio vacío o un CI
  en verde con un LMS operativo.
