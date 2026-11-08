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
   \`aula-site/netlify.toml\`. Establecer secretos con **ámbitos explícitos en Netlify Free**
   (`Builds`, `Functions`, `Runtime`), únicamente en este sitio, para
   Production y Deploy Previews (véase explicación de riesgo más abajo):
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

El CI incorpora además una **compilación independiente del Aula** con
`REACT_APP_AULA_ENABLED=true` y una inspección de los archivos JS finales
para verificar rutas de autenticación y ausencia de identificadores de
secretos en el navegador. Ese ensayo no despliega ningún sitio ni crea una
base de datos real del cliente.

## Estado de infraestructura (08/11/2026)

**Sin contratar ningún plan de pago.** El sitio privado de Netlify y Neon
son proyectos separados del entorno comercial y clínico.

- **Netlify:** proyecto [`gasi-aula-privada`](https://app.netlify.com/projects/gasi-aula-privada),
  ID `620b3f03-68b4-4f2d-b79a-80e04eec3281`; protección temporal
  mediante inicio de sesión del equipo; **sin despliegue ni repositorio
  asociado**. En un futuro deberá autorizarse el acceso del alumnado
  manteniendo siempre la autenticación del propio LMS.
- **Neon PostgreSQL 17:** proyecto **`gasi-aula-privada`**
  (`purple-shadow-12770287`), región de Frankfurt (`aws-eu-central-1`),
  base de datos `gasi_aula`, organización de plan Free. Aplicadas de forma
  transaccional las migraciones **001–006** a una base inicialmente vacía:
  **22 tablas**, seis versiones registradas con checksum SHA-256. Se ha
  verificado la lista de tablas y migraciones después. **Sin alumnos reales**.
  El mantenimiento, copias de seguridad y política de restauración deben
  revisarse antes de admitir usuarios; no asumir que el nivel gratuito
  incluye los respaldos que exigirá el servicio.
- **Secretos del aula en Netlify:** `GASI_AULA_DB_URL` (con
  `sslmode=require`) y `GASI_AULA_RESEND_API_KEY`: ambos establecidos
  y verificados con `is_secret=true`, **ámbitos explícitos**
  `Builds + Functions + Runtime`, contextos **Production + Deploy Previews**,
  únicamente en el sitio privado. `GASI_AULA_SENDER_EMAIL` está configurado
  con `coordinacion@gasisalud.com`, no secreto, en ambos contextos.
  La clave de correo está limitada a `sending_access` del dominio
  `gasisalud.com`, ya verificado en Resend.
- **Por qué este ámbito en Netlify Free:** la opción de seleccionar
  exclusivamente `Functions` está bloqueada en el plan gratuito y devuelve
  403; `All scopes` combinado con la marca `Secret` devolvía 422.
  Se verificó una alternativa **gratuita y funcional** con los tres ámbitos
  explícitos anteriores: creación de un secreto sintético, comprobación de
  `is_secret=true` y eliminación inmediata. La compilación de React solo
  inserta variables con prefijo `REACT_APP_` y nunca debe recibir nombres o
  valores de secretos mediante este prefijo, scripts, logs o plantillas.
  El ámbito `Builds` **amplía el acceso** frente al objetivo Functions-only:
  no se debe permitir código de compilación no revisado ni builds de PRs
  externos con acceso a secretos. Revisar esta decisión antes de abrir
  contribuciones externas o publicar.
- **Web comercial correcta:** Netlify `voluble-kataifi-9b8274`, que sirve
  `gasisalud.com`. Se ha guardado `RESEND_API_KEY` como secreto **independiente**
  con los mismos ámbitos explícitos y contextos; su remitente y destinatario
  de Production se han fijado en `coordinacion@gasisalud.com`.
  **No se ha probado aún el envío end-to-end del chatbot ni desplegado el PR.**
- **Administrador inicial pendiente:** la operación directa de creación
  quedó bloqueada por el sistema de seguridad y la lectura posterior de
  PostgreSQL confirma **cero administradores**. Ejecutar desde un entorno
  seguro el script `netlify/aula/bootstrap-admin.mjs`, nunca por un
  endpoint público ni dentro de un build; usar las variables temporales
  indicadas anteriormente y destruirlas después.
- **Integración Git/Netlify aún pendiente:** en el proyecto privado,
  conectar GitHub a la rama aprobada y fijar **Package directory =
  `aula-site`**, **Base directory vacío**. La configuración exclusiva
  `aula-site/netlify.toml` incluye un control que impide compilar el aula
  desde un `SITE_ID` distinto al de `gasi-aula-privada`.
  No publicar ni fusionar con `main` sin autorización explícita.
- **Pruebas de código:** CI con seis comprobaciones principales verdes en
  commit `1ab16cb`, incluida navegación aislada del aula con Chrome,
  CI de Postgres 17, compilación privada y vídeos HTTPS bajo CSP.
  **No equivale a una prueba real del servicio desplegado.**


## Copias cifradas y recuperación (Neon Free)

En el proyecto Neon Free del aula se ha comprobado que **no hay snapshots
ni copias automáticas programadas**. Antes de dar acceso a alumnado real,
configurar copias independientes y probar su restauración.

Se incluye `scripts/backup-private-aula.sh`, que utiliza `pg_dump` y
`age` para generar un respaldo PostgreSQL **cifrado directamente en flujo**,
sin dejar el volcado en claro almacenado en disco. Requiere la URL privada
de Neon con `sslmode=require` y una **clave pública** de cifrado age
(`GASI_AULA_BACKUP_RECIPIENT`). Ejecutar exclusivamente desde una
consola segura y con `pg_dump` compatible con PostgreSQL 17:

```bash
bash scripts/backup-private-aula.sh /ruta/privada/copias
```

El script no publica las credenciales ni las incluye en argumentos de
comandos; deben facilitarse mediante variables de entorno privadas.
La **clave privada** age debe guardarse aparte del backup. Prueba a
descifrar y restaurar una copia **en una base de datos aislada** antes
de admitir alumnos. Nunca ejecutes una restauración sobre la base activa
sin un procedimiento validado y autorización expresa.

## PENDIENTE DE FERNANDO / CIERRE OPERATIVO

1. **Autorizar un despliegue de pruebas** únicamente del sitio separado
   `gasi-aula-privada` (sin tocar `main` ni `gasisalud.com`) cuando
   proceda. Tras vincular la rama, verificar el build y el endpoint de salud.
2. **Administrador:** ejecutar el bootstrap seguro con `AULA_BOOTSTRAP_CONFIRM`,
   `AULA_BOOTSTRAP_EMAIL`, `AULA_BOOTSTRAP_NAME`,
   `AULA_BOOTSTRAP_PASSWORD` y `GASI_AULA_DB_URL` temporales. Se debe
   generar una contraseña fuerte no registrada en Git ni en logs, verificar
   el alta una sola vez y forzar el cambio al entrar.
3. **Pruebas reales privadas:** iniciar sesión, cambiar la contraseña,
   probar recuperación por correo, matricular alumno de prueba, comprobar
   roles, límites por día, foros, tutorías, tests, encuestas y certificados,
   y verificar la ausencia de cruces con la web pública.
4. **Chatbot comercial:** hacer un despliegue aprobado del código de la rama
   comercial correspondiente, comprobar que el formulario envía por Resend
   y verificar la recepción en el buzón de coordinación.
5. **Decisiones de GASI:** dominio final del aula, revisión jurídica y de
   protección de datos, alcance de los certificados privados y aprobación
   diferenciada de despliegue/fusión.
6. **Higiene de credenciales:** existe una primera clave de Resend de aula
   creada durante la puesta en marcha y **no utilizada**, cuya revocación
   debe autorizar expresamente el titular antes de ejecutar el borrado.
   No reutilizar la clave de notificaciones de MediQuote.
