# GASI — zona interna clínica y trabajadores (prototipo)

Estado: **PROTOTIPO · SOLO DATOS SINTÉTICOS · NO APTO PARA ASISTENCIA REAL**.

## Alcance implementado

- Identidades sintéticas individuales con roles Enfermería, Facultativo y Administración/Coordinación.
- Acceso diferenciado por rol y bloqueo de identidades revocadas.
- Gestión sintética de trabajadores: alta lógica, centro/contexto, rol, revocación/reactivación.
- Perfil profesional mínimo: identidad, rol, centro/centros asignados y estado operativo; sin titulaciones, colegiaciones ni disponibilidad inventadas.
- Auditoría append-only en memoria para eventos de acceso/ciclo de vida; no registra secretos ni contenido clínico en logs técnicos generales.
- Canal clínico sintético Enfermería → Facultativo con niveles N1/N2/N3.
- N1 exige llamada telefónica directa adicional y la web no sustituye ni retrasa esa llamada.
- Estados mínimos: ABIERTO → RESPONDIDO → CERRADO.
- Cambio de nivel trazable y adendas no destructivas.
- Administración/Coordinación no recibe contenido clínico en su vista operativa.

## Separación A/B

**Frente A — corporativo no clínico:** documentación, gestión, control horario y sistemas sin datos de salud.

**Frente B — clínico/datos de salud:** casos, historia/documentación clínica y comunicación Enfermería ↔ Facultativo. Todo fichero mixto se considera clínico.

No debe existir sincronización, persistencia, backup ni logging de contenido clínico hacia A. La arquitectura real debe usar cuentas/proyectos, almacenamiento/base de datos, credenciales, roles, backups y auditoría independientes entre A y B.

## Gate técnico para datos reales

**Estado actual: NO-GO.** El prototipo puede desarrollarse y probarse únicamente con datos inequívocamente ficticios.

No se activa uso real hasta aprobación expresa de Fernando del alojamiento europeo y cierre/probado de los gates aplicables:

- DPA/encargado conforme al artículo 28 cuando corresponda.
- Ubicación UE aprobada para cómputo, base de datos, almacenamiento, logs y backups aplicables.
- Cifrado en tránsito y en reposo configurado y verificado.
- Backup y restauración realmente probada.
- Autenticación fuerte e identidades individuales.
- RBAC y mínimo privilegio.
- Sesiones seguras, revocación y baja efectiva de acceso.
- Auditoría persistente y trazable.
- Aislamiento técnico del Frente A.
- Secretos fuera del código y de logs.
- Continuidad y contingencia probadas.
- Integridad y reconciliación.
- Privacidad, historia/documentación clínica y gates de Legal y Clínica cerrados cuando correspondan.

La existencia de documentación o capacidades del proveedor no equivale a gate probado en GASI.

## Límites jurídicos y clínicos de activación

El prototipo distingue las capacidades siguientes y no las da por autorizadas por inferencia:

| Capacidad | Estado de prototipo | Activación real |
| --- | --- | --- |
| Clasificación/priorización de Enfermería N1/N2/N3 | Implementada con datos sintéticos | Sujeta a los gates vigentes de Legal/Clínica y al gate técnico general |
| Respuesta/criterio médico remoto por escrito | Implementada con datos sintéticos | Sujeta a los gates vigentes de Legal/Clínica y al gate técnico general |
| Indicación médica remota | No se considera autorizada | **BLOQUEADA PARA ACTIVACIÓN REAL** hasta cierre jurídico/clínico expreso |
| Prescripción/receta externa | No se implementa como plataforma de receta | **BLOQUEADA PARA ACTIVACIÓN REAL** hasta cierre jurídico/clínico expreso |
| Actuación enfermera derivada de indicación | No se considera autorizada | **BLOQUEADA PARA ACTIVACIÓN REAL** hasta cierre jurídico/clínico expreso |
| Documentación/informe/cierre | Prototipada de forma trazable | Sujeta a los gates vigentes de Legal/Clínica y al gate técnico general |

DP-01 y MED-01 permanecen abiertos según las decisiones vigentes disponibles. Ninguna interfaz, prueba o estado sintético convierte esos gates en cerrados.

## Contingencia

- **Nivel 1:** la indicación visible es realizar llamada telefónica directa al facultativo; la web no sustituye ni debe retrasar esa llamada.
- **Caída o indisponibilidad de plataforma/canal:** el entorno clínico debe mostrar estado de indisponibilidad y aplicar el procedimiento de contingencia aprobado; no debe recurrir al Frente A ni copiar contenido clínico a correo, logs o almacenamiento corporativo como fallback.
- La continuidad real deberá probarse antes del GO, incluida recuperación/restauración y el mecanismo operativo de contingencia que aprueben Legal/Clínica y operación.

## Siguiente arquitectura técnica

La implementación real deberá separar al menos proveedor de identidad, backend/API clínico, almacenamiento/base clínica y auditoría del Frente B respecto de cualquier infraestructura corporativa del Frente A. La revocación real debe invalidar sesiones/tokens de forma centralizada. La auditoría clínica debe ser persistente y no destructiva, sin contenido clínico en logs técnicos generales.

Los candidatos europeos de infraestructura permanecen en precalificación documental. No se contratará, desplegará ni elegirá proveedor como apto para datos reales hasta verificar el DPA concreto, residencia integral aplicable, alcance de certificación, configuración de cifrado, backup/restauración, MFA/RBAC, auditoría, secretos, continuidad y aislamiento A/B.