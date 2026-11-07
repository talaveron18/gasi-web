# Aula Virtual GASI — instalación privada (sin despliegue autorizado)

El aula se ejecuta en **un sitio Netlify privado e independiente**. El sitio comercial
\`gasisalud.com\` y el sitio clínico no exponen su API. No hay registro público.
**No fusionar a main ni publicar sin orden explícita de Fernando.**

## Instalación: orden obligatorio

1. **Base de datos:** crear una instancia PostgreSQL privada y exclusiva del aula,
   habilitar TLS, restringir accesos, establecer copias de seguridad y conservar
   la URL completa en \`GASI_AULA_DB_URL\`. No compartir esta base con la aplicación clínica.
2. **Migraciones:** con Node 24 y dependencias de \`netlify\` instaladas:
   \`cd netlify && GASI_AULA_DB_URL="<URL_PRIVADA>" node aula/migrate.mjs\`.
   El programa aplica \`migrations/001_core.sql\`, \`002_assessment.sql\` y futuras
   migraciones en orden, dentro de transacciones; guarda versión y suma SHA-256.
   Una segunda ejecución debe ser inocua; nunca modificar una migración aplicada.
   El contenido heredado de \`schema.sql\` y \`f3.sql\` **no** se ejecuta por separado.
3. **Primer administrador:** ejecutar **una sola vez**, desde un equipo protegido:
   \`AULA_BOOTSTRAP_CONFIRM=CREATE_FIRST_ADMIN\` y \`AULA_BOOTSTRAP_EMAIL\`,
   \`AULA_BOOTSTRAP_NAME\`, \`AULA_BOOTSTRAP_PASSWORD\`, \`GASI_AULA_DB_URL\` en
   variables de entorno temporales; ejecutar \`cd netlify && node aula/bootstrap-admin.mjs\`.
   Generar la contraseña fuera del repositorio; no incluirla en comandos registrados,
   chats públicos, scripts versionados ni logs. El script rechaza una segunda alta,
   incluso ante ejecuciones concurrentes. Borrar variables temporales tras utilizarlo.
4. **Configuración privada Netlify:** crear un **nuevo sitio**, con el archivo
   \`aula-site/netlify.toml\`, nunca reutilizar los sitios comerciales. Definir:
   - \`GASI_AULA_DB_URL\`: **Functions**, secreto, Production/Deploy Previews del sitio privado.
   - \`GASI_AULA_RESEND_API_KEY\`: **Functions**, secreto, solo cuando se habilite recuperación.
   - \`GASI_AULA_SENDER_EMAIL\`: **Functions**, correo remitente verificado en Resend.
   Las sesiones usan tokens aleatorios de 256 bits, almacenados exclusivamente como
   hash SHA-256 en PostgreSQL; **no necesitan secreto de firma adicional**.
   \`REACT_APP_AULA_ENABLED=true\` y \`REACT_APP_AULA_PREVIEW_DEMO=false\` se fijan
   en el build privado. Ninguna credencial de alumno se integra en el frontend.
5. **Pruebas antes de autorizar:** verificar en la URL privada el acceso inicial,
   cambio obligatorio de contraseña, recuperación, cierre de sesión y roles
   administrador/autor/tutor/alumno; prohibición de leer o modificar cursos de otro
   autor, tutor sin asignar y alumno sin matrícula; paso secuencial, tope diario,
   tiempo, test y práctica con rúbrica.
6. **Publicación:** solo Fernando decide si se despliega el sitio privado,
   cuándo y con qué dominio. Un PR y un CI verde no autorizan producción.

## CI (PostgreSQL real)

El workflow de GitHub Actions levanta PostgreSQL 17 como *service container* y
aplica las migraciones dos veces, comprueba el bootstrap irrepetible con un
administrador generado para pruebas, y ejecuta:
- \`netlify/aula/persistence-postgres.test.mjs\` (auth, roles, cursos y unidades).
- \`netlify/aula/persistence-f3.test.mjs\` (tests, prácticas, rúbrica y permisos).
- Pruebas de políticas y de aislamiento de empaquetado.

Las credenciales de CI se generan durante la ejecución; no son cuentas reales.

## PENDIENTE DE FERNANDO

- Crear PostgreSQL privado, copia de seguridad, permisos y TLS.
- Preparar sitio Netlify privado y definir \`GASI_AULA_DB_URL\` (Functions, secreto).
- Verificar remitente de correo; definir \`GASI_AULA_RESEND_API_KEY\` y
  \`GASI_AULA_SENDER_EMAIL\` (Functions, exclusivamente sitio privado).
- Facilitar correo y nombre del primer administrador por canal autorizado;
  generar y usar una contraseña temporal fuera de Git; ejecutar el bootstrap.
- Autorizar **expresamente**, cuando corresponda, cualquier despliegue o fusión.

La versión aún no está lista para puesta en servicio: faltan las fases F4–F6,
auditoría funcional de navegación, seguridad y accesibilidad, y aceptación final.
