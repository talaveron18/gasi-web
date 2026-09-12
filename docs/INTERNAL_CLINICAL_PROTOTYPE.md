# GASI — zona interna clínica y trabajadores (prototipo)

Estado: **PROTOTIPO · SOLO DATOS SINTÉTICOS · NO APTO PARA ASISTENCIA REAL**.

## Alcance implementado

- Identidades sintéticas individuales con roles Enfermería, Facultativo y Administración/Coordinación.
- Acceso diferenciado por rol y bloqueo de identidades revocadas.
- Gestión sintética de trabajadores: alta lógica, centro/contexto, rol, revocación/reactivación.
- Auditoría append-only en memoria para eventos de acceso/ciclo de vida; no registra secretos ni contenido clínico.
- Canal clínico sintético Enfermería → Facultativo con niveles N1/N2/N3.
- N1 exige llamada telefónica directa adicional y la web no sustituye ni retrasa esa llamada.
- Estados mínimos: ABIERTO → RESPONDIDO → CERRADO.
- Cambio de nivel trazable y adendas no destructivas.
- Administración/Coordinación no recibe contenido clínico en su vista operativa.

## Separación A/B

**Frente A — corporativo no clínico:** documentación/gestión/control horario/sistemas sin datos de salud.

**Frente B — clínico:** casos, historia/documentación clínica y comunicación Enfermería↔Facultativo. Todo fichero mixto se considera clínico.

No debe existir sincronización, persistencia, backup ni logging de contenido clínico hacia A.

## Gates antes de datos reales

No se activa uso real hasta aprobación expresa del alojamiento europeo y cierre/probado de los gates aplicables: DPA/encargado, ubicación UE aprobada, cifrado en reposo/tránsito, backup+restauración probada, autenticación fuerte, identidades individuales, RBAC/mínimo privilegio, sesiones seguras, auditoría persistente, aislamiento A/B, secretos fuera del código, continuidad/contingencia, integridad/reconciliación y privacidad/historia clínica.

DP-01 y MED-01 permanecen abiertos según las decisiones vigentes. La indicación médica remota, prescripción/receta externa y actuación enfermera derivada no se consideran autorizadas por este prototipo.

## Siguiente arquitectura técnica

La implementación real deberá separar al menos proveedor de identidad, backend/API clínico, almacenamiento/base clínica y auditoría del Frente B respecto de cualquier infraestructura corporativa del Frente A. La revocación real debe invalidar sesiones/tokens de forma centralizada. La auditoría clínica debe ser persistente y no destructiva, sin contenido clínico en logs técnicos generales.
