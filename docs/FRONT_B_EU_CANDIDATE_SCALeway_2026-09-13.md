# Frente B clínico — precalificación técnica de Scaleway (2026-09-13)

Estado: **CANDIDATO / NO APROBADO / NO CONTRATADO / NO DESPLEGADO**.

Esta nota no autoriza datos reales ni sustituye la aprobación expresa de Fernando, la revisión jurídica, la evaluación de impacto ni los gates técnicos de producción. Se limita a comprobar si existe evidencia pública suficiente para mantener a Scaleway en la lista corta del futuro Frente B.

## Criterios obligatorios de esta precalificación

| Gate | Evidencia pública revisada | Estado de precalificación |
|---|---|---|
| Ubicación UE | Scaleway publica regiones europeas en París, Ámsterdam, Varsovia y Milán; para recursos sanitarios su documentación HDS exige mantener recursos, replicación y backups en el perímetro autorizado. | CUMPLE PARA SEGUIR EVALUANDO, sujeto a elegir/configurar exclusivamente región UE autorizada. |
| DPA / art. 28 | La documentación contractual ofrece un Data Processing Agreement que define el tratamiento realizado por Scaleway por cuenta del cliente. | CUMPLE PARA SEGUIR EVALUANDO; antes de producción debe revisarse y formalizarse el DPA aplicable al servicio exacto. |
| ISO/IEC 27001 vigente | Scaleway declara certificación ISO/IEC 27001:2022 en su documentación de seguridad/compliance. | CUMPLE PARA SEGUIR EVALUANDO; antes de aprobación final debe archivarse certificado vigente y alcance aplicable. |
| Cifrado en reposo | Managed PostgreSQL/MySQL soporta cifrado en reposo mediante LUKS; debe activarse explícitamente. La documentación HDS exige cifrado en reposo para volúmenes con datos sanitarios. | CUMPLE CON CONFIGURACIÓN OBLIGATORIA; no aceptar configuración sin cifrado. |
| Cifrado en tránsito / aislamiento | Managed DB soporta integración VPC y endpoints privados; para impedir exposición a Internet deben eliminarse endpoints públicos. TLS/cifrado en tránsito debe verificarse en el diseño final del servicio exacto. | PARCIAL: arquitectura viable, pero el gate de producción exige prueba/configuración explícita de TLS y ausencia de endpoints públicos. |
| Backup + restauración | Scaleway documenta estrategias de backup y snapshots; los snapshots de bases de datos permiten crear una instancia desde un estado anterior. La residencia de backups sanitarios debe mantenerse dentro del perímetro autorizado. | CUMPLE PARA DISEÑO, pero NO CERRADO: producción exige política concreta, backup cifrado y prueba real de restauración documentada. |
| Separación A/B | VPC, proyectos/IAM y almacenamiento pueden diseñarse separados; esta nota no propone compartir recursos con Frente A. | DISEÑO OBLIGATORIO: cuenta/proyecto lógico, red, credenciales, almacenamiento, backup y secretos exclusivos de B. |

## Configuración mínima propuesta para una futura prueba sintética

Si Fernando aprueba continuar con este candidato, la prueba técnica deberá crearse **sin datos reales** y en un proyecto exclusivo del Frente B. Base de datos gestionada PostgreSQL con cifrado en reposo activado; endpoint privado dentro de VPC; endpoint público eliminado; TLS verificado; identidades individuales y MFA en consola; secretos fuera del repositorio; backups/snapshots dentro de región UE autorizada; restauración probada sobre un entorno sintético separado; logs técnicos sin narrativa clínica ni secretos; y evidencias de cada gate archivadas antes de cualquier decisión de producción.

No se mezclará ningún backup, bucket, base, credencial, clave, proyecto o registro clínico con el Frente A. Cualquier artefacto mixto se tratará como Frente B.

## Riesgos y pendientes que impiden aprobarlo para datos reales

1. Fernando todavía no ha aprobado expresamente proveedor ni región de alojamiento clínico.
2. Falta revisar y formalizar el DPA aplicable al producto/configuración exactos.
3. Falta archivar certificado ISO/IEC 27001 vigente y comprobar su alcance sobre los servicios elegidos.
4. Falta demostrar cifrado en tránsito de extremo a extremo en la configuración concreta.
5. Falta ejecutar y documentar backup + restauración con datos inequívocamente sintéticos.
6. Falta cerrar autenticación fuerte, RBAC, sesiones, auditoría, continuidad, reconciliación e aislamiento A/B en una arquitectura desplegable.
7. Siguen abiertos los gates jurídicos/clínicos; esta infraestructura no autoriza indicación médica remota, prescripción, actuación enfermera derivada ni historia clínica real.

## Decisión de esta iteración

**Scaleway permanece como candidato técnicamente plausible para el Frente B, no como proveedor aprobado.** No se contrata, no se despliega y no se introduce dato real. La siguiente fase de infraestructura debe comparar esta precalificación con al menos otro candidato que satisfaga los mismos gates y después preparar una matriz de decisión para Fernando, sin tomar unilateralmente la decisión de proveedor.

## Fuentes oficiales consultadas (13/09/2026)

- Scaleway Security and compliance: https://www.scaleway.com/en/security-and-compliance/
- Scaleway Product availability: https://www.scaleway.com/en/docs/account/reference-content/products-availability/
- Scaleway contracts / DPA: https://www.scaleway.com/en/docs/account/how-to/download-scaleway-contracts/
- Managed Databases — encryption at rest: https://www.scaleway.com/en/docs/managed-databases-for-postgresql-and-mysql/api-cli/setting-up-encryption-at-rest/
- Managed Databases — concepts/snapshots: https://www.scaleway.com/en/docs/managed-databases-for-postgresql-and-mysql/concepts/
- Managed Databases — shared responsibility/VPC: https://www.scaleway.com/en/docs/managed-databases-for-postgresql-and-mysql/reference-content/shared-responsibility-model/
- Backup strategies: https://www.scaleway.com/en/docs/tutorials/backup-strategies/
- Storage shared responsibility for healthcare/HDS: https://www.scaleway.com/en/docs/object-storage/reference-content/storage-shared-responsibility-model/
