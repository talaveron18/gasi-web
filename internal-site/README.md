# Plataforma interna de GASI — preparación del despliegue privado

Esta carpeta contiene una configuración separada de la web comercial. Este cambio no autoriza fusionar a main, publicar ni introducir datos clínicos reales.

## Infraestructura existente

La interfaz, el inicio de sesión de trabajadores, las sesiones, contraseñas con bcrypt, bloqueo de intentos, roles por empresa y centro, auditoría, fichajes, trabajadores y episodios ya tienen implementación en el repositorio. Están respaldados por PostgreSQL mediante Netlify Database. Falta desplegar y validar el entorno privado: el proyecto gasi-clinical observado todavía desplegaba solo funciones comerciales.

## Configuración que debe realizar el propietario en Netlify

1. Seleccionar el proyecto gasi-clinical y ajustar Package directory a **internal-site**, con Base directory igual a la raíz del repositorio. Comprobar en el log de preview que Netlify utiliza la configuración de esta carpeta y no el netlify.toml comercial.
2. Confirmar/provisionar PostgreSQL privado y aplicar las migraciones internas. Usar exclusivamente datos sintéticos durante las pruebas. Si la integración Netlify Database está vinculada al proyecto, getDatabase() puede obtener la conexión automáticamente; para una conexión explícita, definir NETLIFY_DB_URL como variable secreta, nunca en Git.
3. Configurar en el entorno privado, con alcance Functions:
   - GASI_INTERNAL_SESSION_SECRET: valor criptográfico aleatorio, mínimo 32 bytes.
   - GASI_MASTER_PASSWORD_HASH (bcrypt) o, solo para el alta inicial, GASI_MASTER_PASSWORD de 12 a 128 caracteres.
   - GASI_MASTER_RECOVERY_SECRET: secreto independiente para recuperación controlada.
   - GASI_RECOVERY_SIGNING_SECRET: secreto independiente para las copias de recuperación.
   - Opcionales: GASI_MASTER_ACTOR_ID, GASI_MASTER_DISPLAY_NAME y GASI_INTERNAL_SESSION_TTL_MINUTES.
4. No comunicar credenciales, contraseñas ni claves por chat, GitHub, capturas o URL. Configurarlas directamente en Netlify.
5. Ejecutar un preview privado, sin publicar. Verificar que solo se despliega la función internal-clinical-guarded. El módulo clínico interno debe quedar como dependencia en el directorio _shared.
6. Comprobar con cuentas sintéticas: acceso y cambio de contraseña, caducidad y revocación de sesión, permisos por rol, separación estricta entre empresas y centros, lectura de usuarios y fichajes desde PostgreSQL, registro de auditoría y respuestas 401 JSON sin sesión.
7. Revisar protección de datos, permisos sanitarios cuando proceda, copias restaurables, monitorización y doble factor para perfiles administrativos antes de introducir datos reales.
8. El propietario decide el dominio y autoriza cualquier despliegue de producción. Los endpoints de la web comercial permanecen cerrados.

## Aislamiento

El script scripts/prepare-private-clinical-functions.cjs construye exclusivamente el gateway protegido, y mueve el handler y las funciones de auditoría a _shared para impedir su publicación directa. La configuración internal-site/netlify.toml crea las rutas privadas y deja el resto de las API cerrado.

Validación del empaquetado: node --test scripts/private-clinical-build.test.cjs.

## Condición de terminado

No se considerará terminado el sistema hasta validar con navegador el login real, administración de usuarios, datos persistentes y aislamiento por tenant; comprobar las restauraciones y obtener la aprobación del propietario.