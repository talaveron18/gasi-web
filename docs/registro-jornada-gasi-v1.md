# GASI — Política operativa de registro diario de jornada (borrador V1)

## 1. Objeto

Establecer un sistema de registro diario de jornada para las personas trabajadoras de GASI que presten servicios en centros propios o de clientes, con registro verificable de la hora concreta de inicio y finalización de la jornada.

Base normativa principal: artículo 34.9 del Estatuto de los Trabajadores, introducido por el Real Decreto-ley 8/2019. El registro debe conservarse durante cuatro años y permanecer a disposición de la persona trabajadora, de su representación legal y de la Inspección de Trabajo y Seguridad Social.

Fuentes oficiales:
- https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430
- https://www.boe.es/buscar/act.php?id=BOE-A-2019-3481

## 2. Principio del sistema

El fichaje ordinario se realiza exclusivamente desde un único PC fijo GASI previamente registrado y vinculado al centro de trabajo.

No se habilita el fichaje ordinario desde:
- teléfono móvil personal;
- navegador personal;
- aplicación móvil;
- geolocalización del teléfono;
- enlace remoto fuera del terminal del centro.

La posibilidad de acceder desde móvil a otras funciones de la zona interna no concede capacidad de fichaje. Como defensa adicional, el backend rechaza clientes identificados como móviles tanto en la activación del terminal como en el registro de entrada/salida. Esta comprobación complementa, pero no sustituye, la credencial de terminal.

## 3. Identificación

Cada persona trabajadora utiliza su identificador profesional y credencial individual.

Queda prohibido:
- compartir credenciales;
- fichar por otra persona;
- dejar una sesión de fichaje preparada para un tercero;
- utilizar credenciales de coordinación para simular un fichaje.

El terminal aporta una segunda condición técnica: una credencial de dispositivo vinculada al centro. Sin esa credencial el servidor rechaza el fichaje aunque el identificador y contraseña del trabajador sean correctos.

## 4. Registro de entrada y salida

La hora registrada es la hora del servidor, no la hora del dispositivo.

Cada evento conserva:
- persona trabajadora;
- centro;
- terminal;
- tipo de evento: entrada o salida;
- fecha y hora del servidor;
- identificador inmutable del evento.

El sistema impide secuencias incoherentes: después de una entrada corresponde una salida y después de una salida corresponde una entrada.

## 5. PC fijo del centro

Cada centro dispone de un único PC fijo activo:
- tiene identificador propio;
- está vinculado a un único centro;
- se activa mediante un código de un solo uso;
- recibe una credencial técnica no accesible por JavaScript;
- puede ser revocado inmediatamente por coordinación;
- conserva fecha de creación y último uso.

Si un terminal se pierde, cambia de ubicación o se sospecha manipulación, debe revocarse y activarse uno nuevo.

## 6. Correcciones

Nunca se modifica ni elimina el fichaje original.

Una corrección crea un registro adicional que debe indicar:
- evento original;
- dato corregido;
- motivo;
- persona que realiza la corrección;
- fecha y hora de la corrección.

La consulta histórica debe permitir reconstruir el dato original y todas sus correcciones.

## 7. Incidencias y contingencia

Si el terminal no funciona, la persona trabajadora comunica la incidencia a coordinación por el canal operativo definido.

Coordinación registra posteriormente la incidencia como corrección o regularización trazable, indicando el motivo y conservando evidencia suficiente de la hora comunicada.

La contingencia no habilita el fichaje desde el teléfono personal.

## 8. Consulta y conservación

La persona trabajadora podrá consultar su propio histórico.

Los perfiles autorizados de coordinación podrán consultar los registros necesarios para gestión laboral.

Los registros se conservarán durante al menos cuatro años, conforme al artículo 34.9 del Estatuto de los Trabajadores.

## 9. Privacidad y minimización

La V1 no utiliza:
- reconocimiento facial;
- huella dactilar;
- GPS continuo;
- seguimiento de ubicación del trabajador.

La finalidad es acreditar el inicio y final de jornada desde un terminal asociado al centro, evitando una vigilancia de ubicación más amplia de la necesaria.

## 10. Organización laboral

Antes de implantación definitiva, la organización y documentación del registro deberá ajustarse al convenio colectivo aplicable y, cuando corresponda, al procedimiento de negociación, acuerdo o consulta con la representación legal de las personas trabajadoras previsto en el artículo 34.9 del Estatuto de los Trabajadores.

## 11. Separación de sistemas

El registro horario es un sistema laboral y administrativo.

No forma parte de la historia clínica ni debe incorporar:
- diagnósticos;
- motivos asistenciales;
- datos de salud;
- narrativa clínica.

## 12. Estado V1

Implementado en código:
- terminales vinculados a centro;
- activación de un solo uso;
- bloqueo de fichaje sin terminal;
- entrada/salida con hora del servidor;
- registro append-only;
- revocación de terminal;
- consulta de eventos;
- correcciones no destructivas;
- panel de coordinación.

Pendiente de validación de despliegue:
- migración real en Netlify Database;
- prueba desde terminal físico;
- prueba negativa desde móvil sin credencial de terminal;
- exportación de evidencias para Inspección/gestión laboral;
- validación final de conservación y recuperación.


### Regla operativa por turnos

Al inicio de cada turno, el profesional se identifica en el PC fijo del centro con su usuario y contraseña. Una vez autenticado, la pantalla muestra:
- profesional conectado;
- centro asignado;
- hora oficial del servidor GASI;
- último fichaje;
- acción disponible: entrada o salida.

Cerrar la sesión en ese PC elimina la sesión local del profesional, pero no revoca sus credenciales ni afecta a otros usos legítimos de su cuenta.


## 13. Requisito del PC fijo: sin acceso remoto

Para que el PC fijo funcione como evidencia de presencia en el centro, debe impedirse el acceso remoto al equipo.

El PC de fichaje no debe permitir:
- Escritorio remoto de Windows o equivalente;
- AnyDesk, TeamViewer u otras herramientas de control remoto;
- túneles o VPN utilizados para simular la red del centro;
- tethering o cambio deliberado de red para el proceso de fichaje;
- perfiles de navegador sincronizados que permitan trasladar credenciales del fichador.

El navegador del PC conserva una credencial HttpOnly vinculada al equipo y el servidor comprueba además la red de activación del centro. Estas medidas reducen el riesgo de fichaje remoto, pero la prohibición técnica de acceso remoto al PC forma parte del control completo.
