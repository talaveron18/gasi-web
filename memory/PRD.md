# GASI - Grupo de Asistencia Sanitaria Integral

## Product Requirements Document

### Original Problem Statement
Construir una web corporativa completa para GASI, un proveedor B2B de servicios sanitarios para empresas. La plataforma debe incluir:
- Sitio web corporativo con múltiples páginas
- Plataforma de formación sanitaria con cursos
- Chatbot inteligente para captura de leads
- Sistema de autenticación (JWT + Google OAuth)
- Panel de administración integrado

### Target Audience
Clientes B2B: centros logísticos, naves industriales, grandes superficies comerciales (GXO, Amazon, Leroy Merlin, etc.)

---

## What's Been Implemented (Marzo 2026)

### Completado
- [x] Sitio web completo con todas las páginas requeridas
- [x] Sistema de autenticación JWT + Google OAuth
- [x] Chatbot con flujo de cuestionario estructurado y **persistencia en MongoDB**
- [x] Panel de administración integrado en /formacion-sanitaria
- [x] Catálogo de cursos con 6 cursos basados en PDFs de formación sanitaria
- [x] **Página de detalle del curso** (`/curso/:courseId`) con toda la información
- [x] **Imagen de Salud Laboral** agregada (reconocimiento médico GASI)
- [x] Correcciones del chatbot:
  - [x] Email de destino: coordinacion@gasisalud.com
  - [x] Auto-focus en input después de enviar
  - [x] Gestión de estado al cerrar
  - [x] **Persistencia de sesiones** en MongoDB
  - [x] **Función de email con Resend** (preparada, requiere API key)

### Cursos Creados (basados en PDFs)
| Curso | Duración | Precio | Módulos |
|-------|----------|--------|---------|
| RCP y Uso del DEA en Adultos | 8h | 95€ | 3 |
| Primeros Auxilios en el Entorno Laboral | 12h | 120€ | 4 |
| Soporte Vital Básico Integral (SVB) | 10h | 110€ | 4 |
| Emergencias Médicas y Atención Inicial | 8h | 95€ | 4 |
| Atragantamiento y Maniobras de Desobstrucción | 4h | 55€ | 3 |
| Gestión de Heridas, Hemorragias y Traumatismos | 8h | 90€ | 4 |

---

## Prioritized Backlog

### P0 - COMPLETADO ✅
- [x] **Email real con Resend** - API key configurada, emails se envían a coordinacion@gasisalud.com

### P1 - Próximas tareas
- [ ] **Sistema avanzado de cursos**: 
  - Creación de cursos desde PDFs
  - Módulos con tests
  - Progresión bloqueada (>80% para desbloquear siguiente módulo)

### P2 - Mejoras importantes
- [ ] Validación de Google OAuth en producción
- [ ] Configuración de dominio personalizado (dondominio.com)
- [ ] Dashboard de analytics para leads

### P3 - Backlog futuro
- [ ] Sistema de pagos con Stripe
- [ ] Notificaciones push

---

## Technical Architecture

### Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + Resend (Email)
- **Database**: MongoDB (con persistencia de sesiones de chatbot)
- **Authentication**: JWT + Google OAuth (Emergent-managed)

### Key Files
- `/app/backend/routes/chatbot.py` - Endpoints del chatbot con persistencia
- `/app/backend/chatbot_engine.py` - Motor del chatbot
- `/app/frontend/src/components/Chatbot.jsx` - UI del chatbot
- `/app/frontend/src/pages/FormacionSanitaria.jsx` - Catálogo de cursos
- `/app/frontend/src/pages/CursoDetalle.jsx` - Página de detalle del curso
- `/app/frontend/src/pages/SaludLaboral.jsx` - Con imagen actualizada

### Credenciales de test
- Admin: admin@gasisalud.com / Admin2024!
