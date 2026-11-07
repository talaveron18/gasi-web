# Aula Virtual GASI — fases 1 y 2

Sistema propio inspirado funcionalmente en el flujo descrito de eLysa/ADR, sin utilizar su código ni contenido. Se ha desarrollado en la rama de F1/F2; la web comercial mantiene las APIs privadas cerradas.

## Funciones implementadas

- Cuatro roles: administrador, autor, tutor y alumno. Sin registro público, altas desde administración.
- PostgreSQL: usuarios, contraseñas bcrypt, sesiones HttpOnly, revocación, limitación de intentos, recuperación mediante enlace de un solo uso por correo, auditoría, cursos, unidades, matrículas y progreso.
- Cursos con objetivos, destinatarios, requisitos, presentación, duración, plazo configurable (90 días por defecto), límite de unidades nuevas al día y Unidad 0.
- Resultados de aprendizaje por unidad, bloques de texto/títulos/cajas y medios con texto alternativo.
- Lector con índice, estados completado/pendiente/bloqueado y navegación anterior/siguiente.
- El servidor comprueba las unidades anteriores y los requisitos de evaluación. Los tests y prácticas con corrección se desarrollarán en F3; no se simulan aprobados.
- Registro de tiempo de estudio mediante heartbeat, limitado por intervalos del servidor.
- Los cursos activos quedan congelados; las ediciones de autor solo se permiten en borradores.

## Dos entornos independientes

### Vista previa del PR (datos exclusivamente ficticios)

Ruta **/aula/vista-previa**: prueba visual con selector de rol, sin contraseña, sin conexión a PostgreSQL y sin datos de alumnado.

Ruta **/aula/acceso**: requiere cuatro cuentas ficticias y dos secretos definidos por el propietario en **Netlify > Proyecto lucent-beijinho-d67388 > Environment variables**, con contexto **Deploy Previews** y ámbito **Functions**. No se guarda ninguna contraseña o clave en el repositorio.

- GASI_AULA_DEMO_ACCOUNTS: cadena JSON con cuatro objetos de la forma
  `{"role":"student","email":"<correo de prueba>","name":"<nombre ficticio>","password":"<contraseña generada fuera de Git>"}`.
  Roles permitidos: admin, author, tutor, student. Las cuentas concretas y sus contraseñas se comunican exclusivamente en el chat, nunca en README.
- GASI_AULA_DEMO_SESSION_SECRET: cadena aleatoria de al menos 32 caracteres.

El endpoint sintético solo funciona con URL de Deploy Preview, firma las sesiones con HMAC y solo muestra un curso ficticio. El autor puede consultar la interfaz, pero las modificaciones están desactivadas. Nunca se utiliza como backend operativo.

Para cargar las variables se requiere acceso de edición en Netlify. Un intento de configuración con el conector devolvió **HTTP 403**, por lo que el propietario debe hacerlo desde su cuenta. Tras configurarlas deberá solicitar un nuevo build de preview. No es necesario configurar secretos reales de alumnado en esa demo.

### Aula privada real, sin publicar

Crear un proyecto Netlify separado con la carpeta de paquete **aula-site**. No utilizar el proyecto público ni gasi-clinical.

1. Configurar una instancia PostgreSQL dedicada; ejecutar el fichero `netlify/aula/schema.sql` y comprobar los permisos y las copias de seguridad.
2. En Functions, guardar GASI_AULA_DB_URL como variable secreta (cadena de conexión de la base de datos privada).
3. Para recuperación por correo, configurar GASI_AULA_RESEND_API_KEY y GASI_AULA_SENDER_EMAIL (remitente verificado). No reutilizar ni revelar credenciales comerciales.
4. Ejecutar de forma segura y una sola vez `node netlify/aula/bootstrap-admin.mjs` con AULA_BOOTSTRAP_CONFIRM=CREATE_FIRST_ADMIN, AULA_BOOTSTRAP_EMAIL, AULA_BOOTSTRAP_NAME, AULA_BOOTSTRAP_PASSWORD y GASI_AULA_DB_URL; configurar esas variables solo durante el bootstrap y retirarlas después.
5. Comprobar que se publica exactamente la función `aula`, sin `aula-demo` ni funciones clínicas, y que la aplicación solo se abre desde el dominio privado.
6. Probar con usuarios de prueba sin datos reales: inicio y cierre de sesión, cambio obligatorio de contraseña, recuperación, permisos, alta de cursos y alumnos, límite diario, tiempo y unidades bloqueadas.
7. Antes del uso real: protección de datos, contratos con proveedores, avisos de privacidad, retención de logs, MFA para administradores, respaldo y procedimientos ante incidencias.

**No fusionar con main ni publicar hasta que Fernando autorice el despliegue.**

## Pruebas

- `node --test netlify/aula/access-policy.test.mjs netlify/aula/aula-demo.test.mjs`
- `node --test scripts/aula-package.test.cjs`
- En PostgreSQL aislado: `psql ... -v ON_ERROR_STOP=1 -f netlify/aula/schema.sql` y `GASI_INTEGRATION_DB_URL=... node --test netlify/aula/persistence-postgres.test.mjs`.

El CI usa PostgreSQL de prueba con datos generados en ejecución, sin nombres ni contraseñas de alumnos reales.

## Fases siguientes

- F3: banco de preguntas, intentos, prácticas y cola de corrección del tutor.
- F4: foros, tutorías, seguimiento y expediente.
- F5: editor avanzado, matriz de resultados de aprendizaje y chequeo de curso.
- F6: certificados, diplomas y encuestas.
