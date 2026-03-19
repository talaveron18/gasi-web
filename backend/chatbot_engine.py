from typing import Dict, Any, List, Optional

class SimpleChatbot:
    def __init__(self):
        self.data = {}
        self.current_step = 0
        self.servicio = None
        self.completed = False
        
    def get_initial_messages(self) -> List[Dict]:
        """Mensajes iniciales del chatbot"""
        return [
            {"type": "text", "content": "Hola 👋"},
            {"type": "text", "content": "¿En qué podemos ayudarte?"},
            {"type": "buttons", "buttons": [
                {"id": "cobertura", "text": "Cobertura sanitaria para empresas"},
                {"id": "formacion", "text": "Formación sanitaria"},
                {"id": "salud_laboral", "text": "Salud laboral"}
            ]}
        ]
    
    def select_service(self, service_id: str) -> List[Dict]:
        """Selecciona el servicio y devuelve primera pregunta"""
        self.servicio = service_id
        self.data["servicio"] = service_id
        self.current_step = 0
        
        return [
            {"type": "text", "content": "Explícanos brevemente qué necesitas (opcional)"}
        ]
    
    def process_answer(self, answer: str) -> List[Dict]:
        """Procesa respuesta y devuelve siguiente pregunta"""
        if self.completed:
            return []
        
        flow = self._get_flow()
        if self.current_step >= len(flow):
            return self._complete_flow()
        
        # Guardar respuesta
        field = flow[self.current_step]["field"]
        self.data[field] = answer
        
        # Avanzar
        self.current_step += 1
        
        # Devolver siguiente pregunta
        if self.current_step < len(flow):
            return [self._format_question(flow[self.current_step])]
        else:
            return self._complete_flow()
    
    def _get_flow(self) -> List[Dict]:
        """Devuelve el flujo de preguntas según servicio"""
        flows = {
            "cobertura": [
                {"field": "descripcion_libre", "question": "Explícanos brevemente qué necesitas (opcional)", "buttons": None},
                {"field": "ciudad", "question": "¿En qué ciudad se necesita el personal sanitario?", "buttons": None},
                {"field": "fecha", "question": "¿Para cuándo lo necesitáis?", "buttons": ["Hoy", "Mañana", "Esta semana", "Fecha concreta"]},
                {"field": "tipo_instalacion", "question": "¿En qué tipo de instalación sería?", "buttons": ["Obra", "Nave / logística", "Fábrica", "Evento", "Oficina", "Otro"]},
                {"field": "empresa_sector", "question": "Indícame el nombre de la empresa o el sector.", "buttons": None},
                {"field": "numero_personas", "question": "¿Qué volumen aproximado de personal hay o qué cobertura necesitáis?", "buttons": None},
                {"field": "contacto_nombre", "question": "Nombre de contacto", "buttons": None},
                {"field": "contacto_telefono", "question": "Teléfono de contacto", "buttons": None},
                {"field": "contacto_email", "question": "Correo electrónico", "buttons": None},
                {"field": "observaciones", "question": "¿Quieres añadir alguna observación?", "buttons": ["Sí", "No"]}
            ],
            "formacion": [
                {"field": "descripcion_libre", "question": "Explícanos brevemente qué necesitas (opcional)", "buttons": None},
                {"field": "curso", "question": "¿Qué curso necesitas?", "buttons": [
                    "Soporte Vital Básico (SVB) y DEA",
                    "Primeros Auxilios en Empresa",
                    "Manejo de Emergencias en el Trabajo",
                    "Movilización de Pacientes",
                    "Prevención de Riesgos Sanitarios",
                    "Salud Laboral"
                ]},
                {"field": "empresa_sector", "question": "¿Para qué tipo de empresa o sector es?", "buttons": None},
                {"field": "ciudad", "question": "¿En qué ciudad se realizaría?", "buttons": None},
                {"field": "modalidad", "question": "¿Qué modalidad prefieres?", "buttons": ["Presencial", "Online", "Aún por definir"]},
                {"field": "numero_personas", "question": "¿Cuántas personas necesitas formar?", "buttons": None},
                {"field": "fecha", "question": "¿Para cuándo lo necesitáis?", "buttons": ["Urgente", "Esta semana", "Este mes", "Fecha concreta"]},
                {"field": "contacto_nombre", "question": "Nombre de contacto", "buttons": None},
                {"field": "contacto_telefono", "question": "Teléfono de contacto", "buttons": None},
                {"field": "contacto_email", "question": "Correo electrónico", "buttons": None},
                {"field": "observaciones", "question": "¿Quieres añadir alguna observación?", "buttons": ["Sí", "No"]}
            ],
            "salud_laboral": [
                {"field": "descripcion_libre", "question": "Explícanos brevemente qué necesitas (opcional)", "buttons": None},
                {"field": "tipo_servicio", "question": "¿Qué necesitas exactamente?", "buttons": [
                    "Reconocimientos médicos",
                    "Chequeos",
                    "Campañas de salud",
                    "Vigilancia de la salud",
                    "Otro"
                ]},
                {"field": "empresa_sector", "question": "Indícame el nombre de la empresa o el sector.", "buttons": None},
                {"field": "ciudad", "question": "¿En qué ciudad se realizaría?", "buttons": None},
                {"field": "numero_trabajadores", "question": "¿Cuántos trabajadores aproximadamente?", "buttons": None},
                {"field": "fecha", "question": "¿Para cuándo lo necesitáis?", "buttons": ["Urgente", "Esta semana", "Este mes", "Fecha concreta"]},
                {"field": "contacto_nombre", "question": "Nombre de contacto", "buttons": None},
                {"field": "contacto_telefono", "question": "Teléfono de contacto", "buttons": None},
                {"field": "contacto_email", "question": "Correo electrónico", "buttons": None},
                {"field": "observaciones", "question": "¿Quieres añadir alguna observación?", "buttons": ["Sí", "No"]}
            ]
        }
        return flows.get(self.servicio, [])
    
    def _format_question(self, question_data: Dict) -> Dict:
        """Formatea pregunta con o sin botones"""
        if question_data["buttons"]:
            return {
                "type": "buttons",
                "content": question_data["question"],
                "buttons": [{"id": btn, "text": btn} for btn in question_data["buttons"]]
            }
        else:
            return {
                "type": "text",
                "content": question_data["question"]
            }
    
    def _complete_flow(self) -> List[Dict]:
        """Completa el flujo"""
        self.completed = True
        return [
            {"type": "text", "content": "En breve se pondrán en contacto contigo."}
        ]
    
    def is_ready_to_send(self) -> bool:
        """Verifica si tiene datos mínimos para enviar"""
        required = ["contacto_nombre", "contacto_telefono", "contacto_email"]
        return all(field in self.data for field in required)
    
    def get_lead_data(self) -> Dict:
        """Devuelve datos del lead para envío"""
        return {
            **self.data,
            "servicio_nombre": self._get_service_name(),
            "timestamp": None  # Se añadirá en el backend
        }
    
    def _get_service_name(self) -> str:
        """Devuelve nombre legible del servicio"""
        names = {
            "cobertura": "Cobertura sanitaria para empresas",
            "formacion": "Formación sanitaria",
            "salud_laboral": "Salud laboral"
        }
        return names.get(self.servicio, self.servicio)
