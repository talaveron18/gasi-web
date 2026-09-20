# WEB_INFRA V1 — matriz técnica de readiness

**Fecha de evidencia:** 2026-09-20  
**Rama:** `work/web-infra-v1-netlify-20260918`  
**SHA verificado:** `e68165bbd4705bce8a5e5acb8a71a92e6b2bfb06`  
**GitHub Actions:** Internal Clinical CI run **#760 / 35522224033**  
**Resultado:** **PASS — 5/5 jobs** (`frontend`, `backend-clinical`, `netlify-clinical`, `netlify-build`, `netlify-runtime-integration`).  
**Frontend:** 12 suites / 68 tests PASS + navegador Chrome real PASS.  
**Runtime PostgreSQL 17:** 2 pruebas de integración PASS, 0 FAIL.

Esta matriz demuestra capacidades técnicas con datos sintéticos. No declara cumplimiento jurídico ni habilita por sí sola uso clínico real. Cualquier gate jurídico, de autorización, privacidad, RC o configuración real sigue siendo competencia de la línea correspondiente y puede bloquear la activación aunque la capacidad técnica sea PASS.

## Capacidades técnicas

| Capacidad | Estado | Evidencia reproducible | Alcance |
|---|---|---|---|
| Identidad individual y cambio obligatorio de contraseña temporal | PASS | `runtime-postgres-integration.test.mjs`, `identity-first-login-source.test.mjs` | Usuarios sintéticos; sesiones individuales |
| RBAC y mínimo privilegio | PASS | runtime PostgreSQL + `rbac-contract-source.test.mjs` | Enfermería, facultativo, psicología, fisioterapia, administración y master |
| Aislamiento explícito por tenant + centro | PASS | `runtime-postgres-tenant-isolation.test.mjs` | Incluye dos tenants con el mismo centro `HQ` |
| Rol profesional + privilegio administrativo delegado | PASS | runtime PostgreSQL | Conserva rol clínico y limita gestión a tenant/centros propios |
| Delegación y revocación efectiva | PASS | runtime PostgreSQL | Rotación de `auth_version`; sesión anterior queda inválida |
| Usuario deshabilitado | PASS | runtime PostgreSQL | Login con contraseña correcta devuelve 401 hasta reactivación |
| Sesión expirada/revocada | PASS | runtime PostgreSQL | Token expirado y tokens invalidados por cambios de acceso |
| Acceso master excepcional a narrativa | PASS técnico | runtime PostgreSQL | Motivo allowlist, solo lectura, evento auditado antes de cargar narrativa |
| Administración separada de clínica | PASS | runtime PostgreSQL | Metadatos sí; narrativa/escritura clínica y acceso excepcional sin privilegio, no |
| Auditoría append-only | PASS | runtime PostgreSQL + tests de almacenamiento | UPDATE/DELETE directo rechazado |
| Correcciones clínicas no destructivas | PASS | runtime PostgreSQL | Original preservado; corrección 1 y 2 forman cadena trazable |
| Fichaje ligado a puesto fijo | PASS | runtime PostgreSQL | Binding de workstation, red, revocación/reset y rechazo móvil |
| Backup/restore | PASS sintético | Recovery V4 en runtime PostgreSQL | Firma, cifrado cliente, referencias, auditoría, fichaje, workstations y contingencia |
| Contingencia/canal alternativo | PASS sintético | runtime PostgreSQL + frontend tests | Canal por tenant+centro; master configura; fallo clínico no usa copia local |
| Cache de contingencia | PASS | `internalContingencyCache.test.js` | Allowlist; elimina campos clínicos, tokens y campos desconocidos antes de `sessionStorage` |
| Fallo de red de autenticación | PASS | Chrome/CDP E2E | Mensaje seguro; no filtra stack, URL ni error técnico |
| Acceso público genérico | PASS | Chrome/CDP E2E | “Acceder” → Alumnado / Equipo GASI |
| Accesibilidad de superficies probadas | PASS_CON_RESERVA | 68 tests + Chrome accessibility tree | Puerta pública, foco/teclado y componentes internos probados; no equivale a auditoría WCAG completa |
| Build Netlify de producción | PASS | job `netlify-build` run #760 | Build reproducible de la rama |
| Despliegue a producción | BLOQUEADO | Sin acción | Requiere autorización expresa; `main` y producción no se modifican desde esta rama |

## Negativos obligatorios

| Caso negativo | Estado | Evidencia |
|---|---|---|
| Usuario sin privilegio intenta lectura/escritura clínica ajena | PASS | NURSE-B: lectura directa 404 + escritura 403 |
| Profesional tenant A intenta acceder a tenant B | PASS | Test runtime con TENANT-A/TENANT-B y centro `HQ` idéntico |
| Administración intenta función clínica | PASS | Solo metadatos; addendum 403; acceso excepcional sin privilegio 403 |
| Rol combinado excede su contexto | PASS | Gestión delegada limitada a tenant/centros; sigue pudiendo usar su rol profesional |
| Privilegio delegado revocado | PASS | Sesión existente pasa a 401 inmediatamente |
| Master accede sin motivo válido | PASS | 422 y no se genera evento de acceso privilegiado |
| Master accede con motivo válido | PASS | Solo lectura + `PRIVILEGED_EPISODE_ACCESSED` con `episode_id` |
| Corrección posterior intenta destruir original | PASS | Cadena PostgreSQL original → corrección 1 → corrección 2 preserva `text` original |
| Sesión expirada | PASS | Token expirado → 401 |
| Usuario revocado intenta autenticarse otra vez | PASS | Credencial correcta → 401 hasta reactivación |
| URL/ID de episodio fuera de ámbito | PASS | Direct ID extranjero → 404 `episode_not_visible` |
| Fallo de red/sistema | PASS | Chrome offline + fallo DB sintético; errores minimizados |
| Backup manipulado o roto | PASS | Firma, referencias, procedencia y semántica inválidas → restore rechazado |
| Restore sintético | PASS | Snapshot V4 restaura workstation, fichaje y canal de contingencia |
| Canal alternativo cruza tenants | PASS | TENANT-A y TENANT-B con `HQ` reciben solo su propio canal |
| Canal alternativo no configurado | PASS fail-closed | UI bloquea continuidad y no inventa destino |
| URL insegura como canal alternativo | PASS | `http://` rechazado 422; URL admite solo HTTPS |

## Evidencia del navegador

Entrada observada en el run #760:

- `public_entry = Acceder`
- destino alumnado: `/formacion-sanitaria` + modal de login
- destino equipo: `/interno/acceso`
- navegación por teclado y foco visibles
- enlaces presentes en árbol de accesibilidad
- fallo de red: `role=alert` seguro sin detalles técnicos

## Estado de activación

**Rama técnica:** PASS sobre el SHA indicado.  
**Datos reales:** BLOQUEADO hasta que los gates aplicables estén cerrados para cliente + centro + configuración.  
**Producción:** NO DESPLEGADA.  
**Main:** SIN MERGE.  
**MediQuote:** FUERA DE ALCANCE / NO TOCADO.

Cualquier cambio posterior en código, permisos, roles, tenant/configuración, dependencias, recovery o criterio aplicable debe poner esta matriz en **REVALIDAR** y ejecutar de nuevo la regresión correspondiente.
