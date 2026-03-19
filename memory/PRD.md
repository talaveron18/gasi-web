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

### Core Requirements
1. **Páginas del sitio**: Home, Quiénes Somos, Servicios, Cobertura Sanitaria, Formación Sanitaria, Salud Laboral, Sectores, Contacto, Política de Privacidad
2. **Formación sanitaria**: Catálogo de cursos, registro de usuarios, inscripción a cursos
3. **Chatbot**: Cuestionario estructurado para captura de leads (Cobertura, Formación, Salud laboral)
4. **Autenticación**: Login tradicional (email/password) + Google OAuth
5. **Admin**: Panel integrado en /formacion-sanitaria para gestión de cursos (solo visible para admin)

### Brand Colors
- Primario: #005EB8 (azul corporativo)
- Secundario: Blanco

---

## What's Been Implemented (Marzo 2026)

### Completado
- [x] Sitio web completo con todas las páginas requeridas
- [x] Sistema de autenticación JWT + Google OAuth
- [x] Chatbot con flujo de cuestionario estructurado en 3 fases
- [x] Panel de administración integrado en /formacion-sanitaria
- [x] Catálogo de cursos con 6 cursos basados en PDFs de formación sanitaria
- [x] Correcciones del chatbot:
  - [x] Email de destino cambiado a coordinacion@gasisalud.com
  - [x] Auto-focus en input después de enviar mensaje
  - [x] Gestión de estado al cerrar (reset si terminó, mantener si en progreso)

### Cursos Creados (basados en PDFs)
1. RCP y Uso del DEA en Adultos (8h - 95€)
2. Primeros Auxilios en el Entorno Laboral (12h - 120€)
3. Soporte Vital Básico Integral SVB (10h - 110€)
4. Emergencias Médicas y Atención Inicial (8h - 95€)
5. Atragantamiento y Maniobras de Desobstrucción (4h - 55€)
6. Gestión de Heridas, Hemorragias y Traumatismos (8h - 90€)

---

## Prioritized Backlog

### P1 - Próximas tareas
- [ ] **Integración real de WhatsApp**: Conectar send_whatsapp_alert con Twilio para enviar alertas al +34 634 02 98 65
- [ ] **Servicio de email real**: Integrar Resend/SendGrid para enviar emails desde coordinacion@gasisalud.com
- [ ] **Sistema avanzado de cursos**: 
  - Creación de cursos desde PDFs
  - Módulos con tests
  - Progresión bloqueada (>80% para desbloquear siguiente módulo)

### P2 - Mejoras importantes
- [ ] Validación de Google OAuth en producción
- [ ] Configuración de dominio personalizado (dondominio.com)

### P3 - Backlog futuro
- [ ] Dashboard de analytics para leads
- [ ] Sistema de pagos con Stripe (parcialmente implementado)
- [ ] Notificaciones push para nuevos leads

---

## Technical Architecture

### Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT + Google OAuth (Emergent-managed)

### Key Files
- `/app/backend/routes/chatbot.py` - Endpoints del chatbot
- `/app/backend/chatbot_engine.py` - Motor del chatbot
- `/app/frontend/src/components/Chatbot.jsx` - UI del chatbot
- `/app/frontend/src/pages/FormacionSanitaria.jsx` - Página de cursos con admin panel

### API Endpoints
- `POST /api/chatbot/message` - Procesar mensaje del chatbot
- `GET /api/courses` - Listar cursos
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro

### Credenciales de test
- Admin: admin@gasisalud.com / Admin2024!

---

## Known Mocked Features
⚠️ Las siguientes funciones están MOCKED (solo imprimen en consola):
- `send_lead_email()` - No envía emails reales
- `send_whatsapp_alert()` - No envía WhatsApp real
