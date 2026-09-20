# Backend Python: harness interno legacy

Este directorio **no es un backend de producción** de GASI Web V1.

La aplicación desplegable vive en Netlify:

- API pública/alumnos: `netlify/functions/public-api.mts`
- API interna/clínica: `netlify/functions/internal-clinical.mts`
- Persistencia productiva: migraciones PostgreSQL en `netlify/database/migrations/`

El código Python que permanece aquí existe únicamente como **policy/test harness**
para regresiones internas históricas que todavía aportan evidencia sobre RBAC,
sesiones, auditoría, recovery y otras invariantes clínicas.

`backend/server.py` requiere explícitamente
`GASI_ENABLE_LEGACY_INTERNAL_HARNESS=1` y no debe configurarse como servicio
de producción, staging ni preview.

No añadir nuevas rutas públicas, pagos, alumnos, cursos, materiales o
autenticación pública a este directorio. Cualquier funcionalidad web productiva
debe implementarse y probarse en la arquitectura Netlify/PostgreSQL.
