# Frente B UE — precalificación técnica de OVHcloud

Fecha de revisión: 2026-09-13
Estado: CANDIDATO / NO APROBADO / NO CONTRATADO / NO DESPLEGADO
Alcance: futuro entorno clínico GASI (Frente B, datos de salud).

## Regla de uso

Este documento no autoriza producción ni datos reales. OVHcloud se mantiene únicamente como candidato hasta que Fernando apruebe expresamente el alojamiento y se cierren/proben todos los gates técnicos, de privacidad, continuidad y Legal/Clínica aplicables. No se mezcla con Frente A.

## Evidencia oficial localizada

### 1. Ubicación UE configurable
OVHcloud publica regiones Public Cloud europeas, entre ellas Francia, Italia, Alemania y Polonia. La ubicación concreta debe fijarse explícitamente en la configuración final y verificarse para cada servicio, réplica y backup.

Fuente: https://www.ovhcloud.com/es-es/public-cloud/regions-availability/

Estado del gate: PRECALIFICA; pendiente elegir región/configuración exacta y comprobar que todos los componentes del tratamiento permanecen en el perímetro aprobado.

### 2. DPA / tratamiento por cuenta del cliente
OVHcloud declara que sus compromisos de protección de datos se integran contractualmente en un Data Processing Agreement y que, al seleccionar una región de almacenamiento UE, ofrece compromisos sobre localización/procesamiento descritos en su documentación de protección de datos.

Fuente: https://www.ovhcloud.com/en-ie/personal-data-protection/faq/

Estado del gate: PRECALIFICA; pendiente obtener y revisar el DPA contractual aplicable a la entidad/servicios europeos concretos contra art. 28 RGPD, subencargados, asistencia, auditoría, devolución/supresión y transferencias. No se da por cerrado con una FAQ.

### 3. ISO/IEC 27001
OVHcloud publica certificación ISO/IEC 27001 y enumera dentro del perímetro servicios como Public Cloud Compute y Public Cloud Storage, además de otros servicios. La certificación de un proveedor no implica automáticamente que cualquier producto/configuración elegida esté dentro del alcance.

Fuente: https://www.ovhcloud.com/en/compliance/iso-27001-27017-27018/

Estado del gate: PRECALIFICA; pendiente revisar certificado vigente y alcance exacto de los servicios que formen la arquitectura final.

### 4. Cifrado de bases de datos y backups
La documentación de seguridad de Public Cloud Databases indica cifrado del tráfico de la infraestructura y cifrado en reposo de volúmenes; para PostgreSQL y otros motores describe cifrado de nodos y de backups en object storage. La página de Managed PostgreSQL declara cifrado en reposo y en tránsito TLS/SSL.

Fuentes:
- https://docs.ovhcloud.com/en/guides/public-cloud/databases/concepts-security-overview
- https://us.ovhcloud.com/public-cloud/postgresql/

Estado del gate: PRECALIFICA; pendiente validar configuración efectiva, certificados/TLS extremo a extremo, gestión de claves y ausencia de rutas no cifradas en la arquitectura GASI.

### 5. Backup y restauración
OVHcloud documenta backups automáticos para Public Cloud Databases y recuperación a un punto en el tiempo para PostgreSQL dentro de la retención del plan. Esto acredita capacidad técnica documentada, no una restauración GASI probada.

Fuente: https://docs.ovhcloud.com/en/guides/public-cloud/databases/backups

Estado del gate: PRECALIFICA; restauración GASI sigue ABIERTA y deberá ensayarse con datos sintéticos antes de cualquier GO real, documentando RPO/RTO y reconciliación.

### 6. Segmentación/red privada y secretos
La matriz de disponibilidad de Public Cloud publica Private Network/vRack y servicios de Key Management/Secret Manager en regiones europeas. Son capacidades candidatas para aislamiento y gestión de secretos, no una prueba de que GASI las tenga configuradas correctamente.

Fuente: https://www.ovhcloud.com/en/public-cloud/regions-availability/

Estado del gate: PRECALIFICA; pendiente diseño y prueba de red privada, identidades, MFA, mínimo privilegio, secretos, auditoría y separación efectiva A/B.

## Resultado de precalificación

OVHcloud permanece en la lista corta porque existe evidencia oficial suficiente para seguir evaluando: regiones UE, DPA contractual anunciado, ISO/IEC 27001 publicada, cifrado de Managed Databases, backups/restauración documentados y capacidades de red privada/secretos.

No se emite GO. Antes de elevarlo como proveedor seleccionable deben cerrarse, como mínimo:

- DPA europeo concreto revisado contra art. 28 RGPD y arquitectura real.
- Lista y régimen de subencargados/transferencias aplicables.
- Región UE elegida y residencia comprobada de cómputo, base, objetos, réplicas, logs y backups.
- Alcance vigente del certificado ISO/IEC 27001 para cada servicio seleccionado.
- TLS y cifrado en reposo verificados en configuración real.
- Backup cifrado y restauración GASI ensayada con datos sintéticos.
- MFA, identidades individuales, RBAC/mínimo privilegio y revocación probados.
- Logs/auditoría sin contenido clínico en logs técnicos generales.
- Secretos fuera del código.
- Aislamiento técnico y operativo completo del Frente A.
- Continuidad/contingencia y reconciliación probadas.
- EIPD/RAT/DPD y demás gates de privacidad que correspondan a la configuración final.
- Gates de Legal y Clínica vigentes.

## Comparación futura

Comparar OVHcloud y Scaleway con la misma matriz de gates, sin decidir por precio o marketing y sin contratar. Cualquier diferencia que dependa de una configuración comercial concreta se mantiene como PENDIENTE hasta disponer de evidencia contractual/técnica verificable.
