# Frente B clínico — matriz comparativa de candidatos UE

Fecha: 2026-09-13
Estado: **PRECALIFICACIÓN / NO DECISIÓN / NO CONTRATACIÓN / NO DESPLIEGUE**

Esta matriz compara únicamente evidencia ya archivada en el repositorio para Scaleway y OVHcloud. No convierte ningún candidato en proveedor aprobado y no autoriza datos reales. El Frente B continúa separado del Frente A en cuentas/proyectos, almacenamiento, bases, credenciales, roles, secretos, logs y backups.

## Comparación homogénea

| Gate obligatorio | Scaleway | OVHcloud | Resultado actual |
|---|---|---|---|
| Ubicación UE | Regiones europeas publicadas; configuración final debe quedar exclusivamente en perímetro UE aprobado. | Regiones Public Cloud europeas publicadas; configuración final debe fijar y verificar región para cada componente. | **AMBOS PRECALIFICAN**. Residencia integral real sigue PENDIENTE. |
| DPA / art. 28 | DPA contractual disponible; revisión del documento y servicio exactos pendiente. | DPA contractual anunciado; revisión del documento europeo y servicio exactos pendiente. | **AMBOS PRECALIFICAN**. Gate jurídico NO CERRADO. |
| ISO/IEC 27001 | ISO/IEC 27001:2022 publicada; alcance concreto pendiente de archivo/verificación. | ISO/IEC 27001 publicada; alcance concreto de servicios pendiente de archivo/verificación. | **AMBOS PRECALIFICAN**. Certificado/alcance real PENDIENTE. |
| Cifrado en reposo | Managed DB soporta cifrado LUKS configurable; debe activarse. | Managed PostgreSQL/Public Cloud Databases documenta cifrado en reposo. | **AMBOS PRECALIFICAN**. Configuración efectiva PENDIENTE. |
| Cifrado en tránsito | Arquitectura con VPC/endpoints privados; TLS debe verificarse explícitamente. | Managed PostgreSQL documenta TLS/SSL; debe verificarse extremo a extremo. | **AMBOS PRECALIFICAN**. Prueba efectiva PENDIENTE. |
| Red privada / aislamiento | VPC y endpoints privados disponibles; endpoint público debe eliminarse en diseño B. | Private Network/vRack disponible; diseño final debe probar aislamiento. | **AMBOS PRECALIFICAN**. Aislamiento GASI no probado. |
| Backup | Backups/snapshots documentados; residencia sanitaria debe permanecer en perímetro autorizado. | Backups automáticos documentados. | **AMBOS PRECALIFICAN**. Política GASI no desplegada. |
| Restauración | Snapshot permite reconstruir instancia; ensayo GASI pendiente. | PITR/restauración documentada; ensayo GASI pendiente. | **AMBOS PRECALIFICAN**. Restore test sigue gate obligatorio. |
| Secretos | Deben quedar fuera de repositorio y separados de A; servicio/configuración concreta por cerrar. | Key Management/Secret Manager publicados en regiones europeas; configuración concreta por cerrar. | **SIN GANADOR**. Capacidad no equivale a configuración segura. |
| MFA / identidades / RBAC | Pendiente de diseño y prueba GASI. | Pendiente de diseño y prueba GASI. | **PENDIENTE EN AMBOS**. |
| Auditoría/logs sin payload clínico | Pendiente de diseño y prueba GASI. | Pendiente de diseño y prueba GASI. | **PENDIENTE EN AMBOS**. |
| Separación Frente A/B | Arquitectura posible; obligación GASI expresa de proyecto/cuenta/credenciales/backups exclusivos. | Arquitectura posible; obligación GASI expresa de proyecto/cuenta/credenciales/backups exclusivos. | **OBLIGATORIO EN AMBOS**; aún no probado. |

## Conclusión de esta iteración

Con la evidencia disponible **no existe base suficiente para elegir entre Scaleway y OVHcloud**. Ambos superan la precalificación documental mínima y ambos mantienen abiertos los mismos gates que importan para producción: DPA art. 28 revisado y firmable para la configuración real; residencia integral UE de cómputo/base/objetos/logs/réplicas/backups; alcance vigente de ISO/IEC 27001; TLS y cifrado en reposo verificados; restauración ensayada; MFA/RBAC/revocación; secretos; auditoría; continuidad; reconciliación; aislamiento A/B; y gates de privacidad y Legal/Clínica.

No se usará precio como desempate mientras falten estos controles. Tampoco se contratará una prueba de concepto por iniciativa propia.

## Próxima evidencia necesaria antes de elevar decisión a Fernando

1. Obtener y archivar para cada candidato el DPA contractual aplicable y lista de subencargados/transferencias.
2. Archivar certificado ISO/IEC 27001 vigente y mapear alcance contra los servicios concretos propuestos.
3. Definir una arquitectura mínima equivalente en ambos candidatos: región UE, cómputo/API, PostgreSQL, almacenamiento, red privada, secretos, logs y backup.
4. Preparar un plan de prueba sintética idéntico: creación, acceso por identidad/rol, revocación, TLS, ausencia de endpoint público innecesario, backup, restauración, reconciliación y verificación de logs sin narrativa clínica.
5. Solo después comparar coste/configuración y elevar una decisión. Hasta entonces: **NO-GO PARA DATOS REALES**.

## Evidencia base

- `docs/FRONT_B_EU_CANDIDATE_SCALeway_2026-09-13.md`
- `docs/FRONT_B_EU_CANDIDATE_OVHCLOUD_2026-09-13.md`
- DEC-82 y DEC-85 del centro de coordinación: separación A/B y alcance de selección/diseño B sin contratación ni despliegue.
- Gates vigentes de Legal/Clínica: AUTH-01, AUTH-REMOTE-LOC-01, RC-01, DP-01 y MED-01 permanecen abiertos donde corresponda.
