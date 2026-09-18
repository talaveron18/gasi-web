# GASI WEB_INFRA V1 — readiness 2026-09-18

## Estado general

Rama de trabajo: `work/web-infra-v1-hardening-20260918`

Producción actual: conserva el último deploy válido de Netlify. Los nuevos deploys están bloqueados temporalmente por agotamiento de créditos de la cuenta.

## Cerrado en código / CI

- [x] Build frontend.
- [x] Tests backend clínico heredado.
- [x] Typecheck Netlify Function clínica.
- [x] Build completo Netlify en CI local/offline.
- [x] Lockfile reproducible para Netlify.
- [x] Autenticación con sesión firmada y revocación por auth_version.
- [x] Cuenta maestra bootstrap.
- [x] Roles y privilegios delegados.
- [x] Separación administrativa / clínica.
- [x] Aislamiento de centros en consulta SQL de episodios.
- [x] Acceso clínico privilegiado de solo lectura con auditoría.
- [x] Adendas y correcciones no destructivas.
- [x] Estados de entrega/respuesta y cierre documental.
- [x] Cadena hash de auditoría.
- [x] Mutaciones principales + auditoría en una misma transacción.
- [x] Snapshot/restore transaccional.
- [x] Validación de cadena de auditoría antes de restore.
- [x] Recovery schema v2 incluye control horario.
- [x] Pruebas negativas Netlify para centro/rol/metadata/recovery.
- [x] Página pública de servicios rediseñada.
- [x] Cobertura sanitaria rediseñada con fotografía.
- [x] Servicios complementarios rediseñados con fotografía.
- [x] Formación sanitaria ya no depende del backend viejo.
- [x] Home alineada con oferta real.
- [x] Sectores sin nombres de clientes no acreditados ni promesa 24/7.
- [x] Chatbot informativo + consentimiento solo antes de capturar datos.
- [x] Chatbot usa el endpoint real de contacto.
- [x] Endpoint de contacto validado, honeypot y escape HTML.
- [x] Navegación y footer limpios.
- [x] Mejoras básicas de accesibilidad.
- [x] Zona profesional visible desde navegación.

## Control horario

- [x] Terminales vinculados a centro.
- [x] Código de activación de un solo uso.
- [x] Cookie de terminal HttpOnly/Secure/SameSite=Strict.
- [x] Login de trabajador por credenciales en el terminal.
- [x] Fichaje no disponible únicamente por tener sesión interna.
- [x] Bloqueo adicional de clientes móviles.
- [x] Hora tomada del servidor.
- [x] Secuencia Entrada → Salida → Entrada.
- [x] Eventos append-only.
- [x] Correcciones separadas y trazables.
- [x] Revocación de terminal.
- [x] Panel de coordinación.
- [x] Histórico propio y consulta de gestión.
- [x] Incluido en backup/restore.
- [x] Borrador de política de registro de jornada.
- [ ] Prueba física desde PC fijo del centro.
- [ ] Prueba negativa desde teléfono real.
- [ ] Definir canal de contingencia operativo antes del primer cliente.
- [ ] Exportación específica de registro horario para inspección/gestión laboral.

## Pendiente de desplegar / probar el día del reset de Netlify

- [ ] Confirmar créditos disponibles.
- [ ] Configurar secreto de sesión de producción.
- [ ] Configurar contraseña inicial de la cuenta maestra de producción.
- [ ] Ejecutar un único deploy de producción.
- [ ] Confirmar autoaprovisionado de Netlify Database.
- [ ] Confirmar aplicación de migraciones.
- [ ] GET /api/internal-clinical/health → 200 + netlify-database.
- [ ] Login GASI-MASTER-01.
- [ ] Crear dos centros sintéticos y varios perfiles.
- [ ] Probar acceso cruzado A → B = denegado.
- [ ] Probar administración = metadata sin narrativa clínica.
- [ ] Probar delegación y revocación.
- [ ] Probar sesión revocada y usuario desactivado.
- [ ] Probar acceso directo a recurso ajeno.
- [ ] Probar cierre/adenda/corrección.
- [ ] Probar auditoría y cadena hash.
- [ ] Exportar snapshot.
- [ ] Modificar/eliminar datos sintéticos.
- [ ] Restaurar snapshot.
- [ ] Comprobar clínica + usuarios + fichajes + contador + auditoría después del restore.
- [ ] Activar terminal de fichaje de prueba.
- [ ] Fichar entrada/salida desde terminal.
- [ ] Intentar fichar desde móvil y confirmar 403.
- [ ] Confirmar /dashboard y /interno/acceso.
- [ ] Confirmar formulario y chatbot con entrega real de correo.

## Pendiente antes de considerar V1 cerrada

- [ ] Revisión visual final en desktop y móvil.
- [ ] Revisión de contraste/foco/teclado de las páginas internas.
- [ ] Decidir si las fotografías externas de Pexels se descargan al repositorio para evitar dependencia de hotlink.
- [ ] Preparar exportación de registro horario.
- [ ] Confirmar procedimiento laboral de implantación/consulta que corresponda.
- [ ] Documentar recovery probado con evidencia reproducible.

## Regla de despliegue

Hasta el reset de créditos:
- no provocar builds de Netlify;
- no hacer deploy previews innecesarios;
- seguir trabajando únicamente en GitHub/CI.

En el siguiente ciclo:
- un único deploy;
- validar de extremo a extremo;
- no marcar PASS de producción sin evidencia.
