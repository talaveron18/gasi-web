# WEB_INFRA V1 — matriz técnica de readiness

**Estado de esta matriz:** REVALIDAR tras cambios posteriores a la evidencia histórica de septiembre de 2026.  
**Rama de trabajo:** `automation/public-reconcile-20261023`  
**Producción:** NO DESPLEGADA.  
**MediQuote/Medicult:** FUERA DE ALCANCE / NO TOCADO.

Esta matriz documenta capacidades técnicas y bloqueos conocidos. No declara cumplimiento jurídico, habilitación sanitaria ni autorización de uso clínico real. Un PASS histórico no se mantiene automáticamente después de cambios de código, permisos, tenant, recovery o configuración.

## Prioridad pública

| Capacidad | Estado actual | Evidencia reproducible | Criterio |
|---|---|---|---|
| Reconciliación de contenido público | PASS en código/pruebas | `netlify/tests/public-content-reconciliation-source.test.mjs` + CI de la rama | Inventario explícito de rutas/superficies públicas y regresión de copy |
| Reconocimientos médicos | BLOQUEADO como oferta pública | `public-content-reconciliation-source.test.mjs` | Solo puede aparecer como exclusión; no se anuncia como servicio |
| Servicios públicos | PASS en código/pruebas | páginas públicas + regresión de contenido | Enfermería presencial y formación sanitaria; formulaciones prudentes según alcance/requisitos |
| Catálogo público de cursos retirado | PASS en código/pruebas | router + `netlify.toml` + regresión pública | Rutas/API antiguas no mantienen una oferta pública paralela |
| Chatbot público | PASS en código/pruebas | `frontend/src/components/Chatbot.jsx`, `netlify/functions/chatbot.js`, regresión pública | No clínico/no urgencias; sin inventar prestaciones |
| Metadatos/SEO | PASS en código/pruebas | `frontend/public/index.html` + regresión pública | Identidad y oferta reconciliadas; términos obsoletos bloqueados |
| Despliegue a producción/preview | BLOQUEADO | Sin acción de despliegue | Requiere autorización expresa de Fernando |

## Acceso e identidad

| Capacidad | Estado actual | Evidencia reproducible | Alcance |
|---|---|---|---|
| Puerta de acceso separada | PASS en código/pruebas | `/acceso`, `/alumnado/acceso`, `/interno/acceso`, router y E2E de acceso | Alumnado y equipo GASI separados; sin registro público de personal |
| Identidad individual y cambio obligatorio de contraseña temporal | PASS técnico previo; REVALIDAR en cada cambio de auth | runtime PostgreSQL + `identity-first-login-source.test.mjs` | Sesiones individuales |
| RBAC y mínimo privilegio | PASS técnico previo; REVALIDAR | runtime PostgreSQL + `rbac-contract-source.test.mjs` | Roles y privilegios internos |
| Aislamiento explícito por tenant + centro | PASS técnico para superficies cubiertas; REVALIDAR auditoría | `runtime-postgres-tenant-isolation.test.mjs` + tests de tenant | No extender este PASS a la cadena de auditoría mientras siga el bloqueo descrito abajo |
| Buzón interno personal tenant/centro | PASS técnico en almacenamiento/runtime probado | migración `internal-personal-inbox-v1`, `runtime-personal-inbox-postgres.test.mjs` | Debe mantenerse fail-closed ante identidad/tenant ajenos |

## Auditoría y addenda

| Capacidad | Estado actual | Evidencia reproducible | Bloqueo / criterio de cierre |
|---|---|---|---|
| Auditoría append-only | PASS técnico | migración append-only + tests de almacenamiento | UPDATE/DELETE directo rechazado |
| Minimización de metadatos | PASS técnico previo; REVALIDAR | `auditMetadata` + tests de auditoría | No introducir narrativa clínica, credenciales o campos prohibidos |
| Tenant persistido en auditoría | PASS técnico | migración `20261029080000_internal-audit-tenant-scope` + tests de storage | `tenant_id` derivado de identidad autenticada |
| Primitivas de cadena por tenant | PASS en código/pruebas | `netlify/functions/internal-audit-tenant-chain.mts` + `audit-tenant-chain-primitives.test.mjs` | Lock, lookup de cabeza, append y validación independientes por tenant |
| Integración runtime de cadena por tenant | **BLOQUEADO / NO PASS** | `netlify/functions/internal-clinical.mts` | El runtime todavía usa lock global `74627411`, lookup global del último `event_hash` y `validAuditSnapshot` como cadena única. Cierre: sustituir conjuntamente escritura y validación por primitivas tenant-scoped, preservar histórico `GASI-LEGACY`, añadir guard anti-regresión y obtener CI verde |
| Correcciones clínicas no destructivas | PASS técnico previo; REVALIDAR tras integración de auditoría | runtime PostgreSQL + tests de addenda | Original preservado y correcciones trazables |

## Recuperación, contingencia y seguridad operativa

| Capacidad | Estado actual | Evidencia reproducible | Alcance |
|---|---|---|---|
| Backup/restore | PASS sintético previo; REVALIDAR antes de activación | recovery runtime PostgreSQL + release rehearsal | Firma, referencias y restauración sintética; no equivale a backup real de producción |
| Contingencia/canal alternativo | PASS sintético previo; REVALIDAR | runtime PostgreSQL + frontend tests | Canal por tenant+centro; fallo clínico no debe usar copia clínica local |
| Cache de contingencia | PASS técnico | `internalContingencyCache.test.js` | Allowlist; sin campos clínicos ni tokens |
| Fichaje ligado a puesto | PASS técnico previo; REVALIDAR | runtime PostgreSQL | Binding de workstation/red y rechazo móvil |
| Headers de seguridad | PASS técnico previo; REVALIDAR con build final | `security-headers-source.test.mjs`, `static-site-security-source.test.mjs` | Revalidar sobre artefacto final antes de cualquier despliegue |
| Secret scan / artefacto sin backend | PASS técnico previo; REVALIDAR con build final | `scripts/secret-scan.mjs`, release rehearsal | Debe ejecutarse de nuevo sobre SHA candidato |
| Accesibilidad | PASS_CON_RESERVA | tests frontend + navegador | No equivale a auditoría WCAG completa |

## Negativos obligatorios que deben permanecer verdes

- Profesional de tenant A no puede leer ni escribir recursos de tenant B, incluso si comparten nombre de centro.
- Administración sin privilegio clínico no obtiene narrativa ni puede mutarla.
- Sesión expirada, revocada o de usuario deshabilitado falla cerrada.
- Acceso master excepcional requiere motivo permitido, es de solo lectura cuando corresponda y queda auditado.
- Correcciones/addenda no destruyen el original.
- Backup manipulado, con referencias rotas o procedencia inválida se rechaza.
- Canal alternativo no cruza tenants y una URL insegura se rechaza.
- Identidad de auditoría sin tenant falla antes de consultar/escribir la cadena.
- La primera entrada de un tenant no puede enlazar con el hash final de otro tenant.

## Criterio de cierre WEB_INFRA antes de candidato a despliegue

1. Mantener verde la reconciliación pública completa y su inventario automático.
2. Integrar la cadena de auditoría tenant-scoped en `internal-clinical.mts` sin conservar el lock/lookup globales.
3. Preservar compatibilidad controlada con el histórico `GASI-LEGACY` y demostrar cadenas independientes por tenant.
4. Ejecutar regresión completa, integración PostgreSQL, build, secret scan y release/restore rehearsal sobre el mismo SHA candidato.
5. Revisar que no existan P0/P1 abiertos de identidad/RBAC, aislamiento, buzón, auditoría/addenda, recuperación, backup/restore, contingencia, accesibilidad o chatbot seguro.
6. Mantener producción y previews sin despliegue hasta autorización expresa de Fernando.

**Regla:** ningún commit, documento o test aislado cuenta como PASS funcional. El estado solo se eleva a PASS cuando existe evidencia reproducible sobre el código realmente integrado.