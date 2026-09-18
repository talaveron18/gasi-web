# Frente B — shortlist verificable de proveedores UE

Fecha de revisión: 2026-09-14
Estado: DOCUMENTAL / NO CONTRATADO / NO DESPLEGADO / NO-GO DATOS REALES

## Filtro obligatorio

Un candidato solo permanece en esta lista si existe evidencia documental suficiente para diseñar una arquitectura que cumpla simultáneamente:

1. alojamiento de datos en la UE mediante región elegible;
2. DPA / acuerdo de encargado aplicable a tratamiento RGPD;
3. cifrado en reposo y en tránsito;
4. backup y restauración documentados;
5. ISO/IEC 27001 vigente o ENS aplicable.

La presencia en esta lista NO significa que el gate de producción esté cerrado. Antes de datos reales deben verificarse contrato/DPA concretos, subencargados y transferencias, configuración efectiva, restauración ensayada, MFA/RBAC, sesiones, auditoría, secretos, continuidad, aislamiento A/B y gates de Legal y Clínica.

## 1. OVHcloud — candidato recomendado para piloto técnico

### Evidencia

- Managed PostgreSQL dispone de cifrado de datos en reposo y en tránsito TLS/SSL, backups automáticos, recuperación point-in-time y redes privadas.
- La documentación de seguridad indica cifrado de nodos mediante LUKS y cifrado de backups mediante clave aleatoria por fichero protegida mediante RSA.
- Backups PostgreSQL: copias remotas, PITR y restauración documentada; en Production la retención publicada es de 14 días.
- OVHcloud declara que el DPA forma parte de sus compromisos contractuales y está disponible para clientes.
- OVHcloud publica certificaciones ISO 27001 en su entorno y opciones de Zona de Confianza UE con compromisos reforzados de tratamiento en territorio UE. Debe verificarse que el servicio/región concretos contratados para GASI queden dentro del alcance aplicable.

### Arquitectura comparable propuesta

- Región UE aprobada.
- Proyecto/cuenta exclusiva Frente B.
- Managed PostgreSQL Production, red privada, sin endpoint público salvo necesidad excepcional.
- Aplicación/API clínica en cómputo del mismo perímetro UE.
- Secretos fuera del código.
- Logs técnicos separados y sin narrativa clínica.
- Backup gestionado + restauración GASI periódicamente ensayada con datos sintéticos.

### Coste de referencia actual

OVHcloud España publica para Managed PostgreSQL:

- Discovery: desde 54,458 EUR/mes por nodo, 1 nodo, retención 48 h, sin SLA.
- Production: desde 69,277 EUR/mes por nodo, 2 nodos incluidos en la topología publicada, retención 14 días y SLA 99,95%.

Para comparar sin infradimensionar un entorno clínico inicial, se toma Production y se presupuestan dos nodos: aproximadamente 138,554 EUR/mes o 1.662,65 EUR/año de nodos, antes de IVA y sin añadir aplicación, balanceo, observabilidad ni otros recursos. Confirmar factura/configuración exacta antes de contratar.

### Riesgos/gates pendientes

- confirmar DPA concreto y artículo 28 con Legal/privacidad;
- confirmar región UE y alcance ISO del servicio exacto;
- confirmar residencia de logs, backups, soporte y subencargados;
- verificar TLS efectivo extremo a extremo;
- ensayar restore GASI;
- verificar MFA/RBAC/revocación/auditoría y aislamiento A/B.

Resultado: CANDIDATO. NO-GO REAL.

## 2. Scaleway — candidato europeo competitivo

### Evidencia

- Scaleway declara infraestructura europea y regiones Paris, Amsterdam, Warsaw y Milan.
- Publica certificación ISO/IEC 27001:2022 y DPA propio.
- Managed PostgreSQL/MySQL soporta SSL end-to-end y certificados TLS.
- El cifrado en reposo puede habilitarse con LUKS; al estar activo, bases, datos, logs y snapshots quedan cifrados.
- Backups y snapshots son configurables y restaurables; la documentación describe restore a base original o nueva.
- Para instancias con Block Storage, los autobackups pueden materializarse como snapshots; esto es relevante porque Scaleway advierte que el backup lógico no dispone actualmente de cifrado nativo.

### Arquitectura comparable propuesta

- Región Paris o Amsterdam, pendiente de elección formal.
- Organización/proyecto exclusivo Frente B.
- Managed PostgreSQL con cifrado en reposo activado desde creación.
- Private endpoint VPC y eliminación del endpoint público.
- TLS verify-full desde la aplicación.
- Backups/snapshots cifrados y política explícita de retención; no usar backup lógico no cifrado como copia clínica ordinaria.
- Restauración ensayada con datos sintéticos.

### Coste de referencia actual

Precios oficiales Scaleway, Paris, antes de impuestos:

- DB-PRO2-XXS Cost Optimized: nodo principal 0,11 EUR/h; nodo adicional 0,0583 EUR/h.
- Dos nodos: 0,1683 EUR/h, aproximadamente 1.474,31 EUR/año de cómputo.
- Block Storage 5K: 0,0993 EUR/GB/mes.
- Backups/Snapshots: 0,03 EUR/GB/mes.

Ejemplo meramente presupuestario con 50 GB de almacenamiento y 50 GB medios de backup: ~1.551,89 EUR/año antes de impuestos, red/observabilidad y resto de cómputo. La cifra debe recalcularse con la arquitectura final.

### Riesgos/gates pendientes

- el backup lógico no está cifrado de forma nativa: la arquitectura clínica debe evitarlo o envolverlo con cifrado controlado y demostrarlo;
- confirmar DPA concreto y alcance ISO/región;
- residencia integral de logs/backups/soporte;
- MFA/RBAC/revocación/auditoría;
- restore GASI ensayado;
- aislamiento A/B.

Resultado: CANDIDATO CON CONDICIÓN TÉCNICA SOBRE BACKUPS. NO-GO REAL.

## 3. AWS — candidato de mayor madurez de controles, mayor complejidad

### Evidencia

- AWS permite seleccionar regiones UE, incluidas Francia, Alemania, Irlanda, Italia, España y Suecia, y documenta controles de residencia regional.
- El AWS GDPR DPA se incorpora a los Service Terms y aplica automáticamente cuando se tratan datos personales bajo RGPD.
- AWS declara ISO 27001 y ENS High entre sus marcos/certificaciones aplicables.
- Amazon RDS cifra almacenamiento, logs, backups y snapshots con AES-256/KMS cuando la instancia está cifrada.
- RDS soporta TLS para conexiones a base de datos.
- AWS Backup/RDS documentan planes de backup, snapshots, PITR/restauración y cifrado de snapshots con las claves de la base origen.

### Arquitectura comparable propuesta

- Región UE aprobada; para España, eu-south-2 es candidata si todos los servicios necesarios están disponibles y dentro del alcance acordado.
- Cuenta AWS exclusiva Frente B, separada de cualquier corporativo A.
- RDS PostgreSQL cifrado con KMS, Multi-AZ para producción si el presupuesto lo permite.
- Subredes privadas y Security Groups restrictivos.
- Aplicación clínica en VPC del Frente B.
- IAM Identity Center/MFA, roles de mínimo privilegio, CloudTrail/auditoría, Secrets Manager.
- AWS Backup/RDS con retención definida y restauraciones periódicas probadas.

### Coste de referencia actual

AWS publica precios variables por región, clase, despliegue, almacenamiento y backup; su página oficial obliga a parametrizar la configuración mediante Pricing Calculator para una cifra exacta.

Como referencia externa de mercado actualizada desde la API de AWS (12-09-2026), RDS PostgreSQL db.t4g.small Single-AZ en Frankfurt figura en torno a 0,037 USD/h (~324 USD/año de instancia) antes de almacenamiento, backups, transferencia y alta disponibilidad. Esta cifra NO se adopta como presupuesto GASI ni sustituye la calculadora oficial. Multi-AZ y controles adicionales elevarán el coste.

### Riesgos/gates pendientes

- arquitectura y facturación más complejas;
- revisar Privacy Features y transferencias para cada servicio usado, no solo RDS;
- DPA/subencargados/transferencias con Legal;
- confirmar región UE de todos los componentes, incluidos logs/backups;
- restauración GASI ensayada;
- evitar habilitar servicios globales innecesarios para contenido clínico;
- aislamiento A/B y política de organizaciones/cuentas.

Resultado: CANDIDATO. NO-GO REAL.

## Comparación resumida

| Criterio | OVHcloud | Scaleway | AWS |
|---|---|---|---|
| Región UE seleccionable | Sí, sujeto a servicio/región | Sí | Sí |
| DPA disponible | Sí | Sí | Sí, integrado en Service Terms |
| Cifrado reposo | Sí | Sí, activar | Sí, activar RDS/KMS |
| Cifrado tránsito | TLS/SSL | SSL/TLS end-to-end | TLS |
| Backup/restauración | Sí + PITR | Sí; snapshots preferidos para cifrado | Sí + PITR/AWS Backup |
| Backup cifrado | Sí documentado | Snapshots cifrados si cifrado activo; backup lógico nativo no | Sí si origen RDS cifrado |
| ISO 27001 / ENS | ISO 27001; verificar alcance | ISO 27001:2022; verificar alcance | ISO 27001 + ENS High; verificar servicios |
| Complejidad operativa | Media | Media-baja | Alta |
| Coste inicial orientativo de DB | ~1,66 kEUR/año, Production 2 nodos | ~1,47 kEUR/año 2 nodos + storage/backup | variable; calcular arquitectura exacta |
| Estado | Candidato | Candidato condicionado | Candidato |

## Recomendación provisional

Para el primer piloto técnico sintético, OVHcloud es el candidato que ofrece el equilibrio más sencillo entre DB gestionada, backups cifrados/PITR documentados, precio transparente y operación europea. Scaleway queda muy cerca y puede resultar más barato, pero la ausencia de cifrado nativo en backup lógico obliga a fijar cuidadosamente la estrategia de backup antes del GO. AWS ofrece los controles más maduros y ENS High, pero añade complejidad de arquitectura, residencia por servicio y coste operativo que probablemente no se justifican todavía para el primer cliente.

Esta recomendación NO autoriza contratación ni datos reales.

## Condiciones de GO que siguen abiertas para los tres

- aprobación expresa de Fernando del proveedor y región;
- validación Legal/privacidad del DPA y cadena de subencargados/transferencias;
- residencia UE aprobada de aplicación, DB, logs, backups y observabilidad;
- cifrado en reposo y tránsito comprobado en configuración real;
- autenticación fuerte, MFA, identidades individuales y RBAC;
- sesiones seguras y revocación probada;
- secretos fuera de código;
- auditoría clínica/técnica separada y sin narrativa clínica en logs generales;
- backup y restauración probados con datos sintéticos;
- continuidad y contingencia probadas;
- aislamiento completo respecto a Frente A;
- cierre de gates de privacidad/historia clínica y Legal y Clínica.
