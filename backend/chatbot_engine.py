import random
from datetime import datetime
from typing import Dict, Any, List, Optional

class ChatbotEngine:
    def __init__(self):
        self.context = self._init_context()
        self.state = "inicio"
        self.last_messages = []
        
    def _init_context(self) -> Dict[str, Any]:
        """Inicializa 60+ variables dinámicas"""
        return {
            # Servicio principal
            "servicio_principal": None,
            "subservicio": None,
            "categoria": None,
            "intencion_usuario": None,
            
            # Ubicación
            "ciudad": None,
            "provincia": None,
            "pais": "España",
            "centro_trabajo": None,
            
            # Empresa
            "nombre_empresa": None,
            "sector_empresa": None,
            "tipo_cliente": None,
            "tipo_instalacion": None,
            
            # Formación específica
            "tipo_evento": None,
            "tipo_formacion": None,
            "modalidad_formacion": None,
            "nivel_formacion": None,
            "inicial_o_reciclaje": None,
            "duracion_deseada": None,
            "idioma_formacion": "español",
            
            # Números
            "numero_personas": None,
            "numero_trabajadores": None,
            "numero_turnos": None,
            "puestos_afectados": None,
            
            # Fechas y tiempos
            "fecha_solicitada": None,
            "fecha_inicio": None,
            "fecha_fin": None,
            "urgencia": None,
            "disponibilidad": None,
            "horario_preferido": None,
            "turno_preferido": None,
            
            # Necesidades documentales
            "presupuesto_orientativo": None,
            "necesita_certificado": None,
            "necesita_registro_asistencia": None,
            "necesita_doc_auditoria": None,
            "necesita_spa": None,
            "spa_actual": None,
            
            # Espacios
            "tiene_espacio_propio": None,
            "necesita_espacio": None,
            "formato_entrega": None,
            
            # Contacto
            "canal_contacto_preferido": None,
            "nombre_contacto": None,
            "telefono_contacto": None,
            "email_contacto": None,
            "cargo_contacto": None,
            "observaciones": None,
            
            # Control de flujo
            "ultimo_mensaje_usuario": None,
            "ultimo_estado": None,
            "siguiente_estado": None,
            "confianza_intencion": 0.0,
            "necesita_aclaracion": False,
            "modulo_detectado": None,
            "origen_entrada": None,
            
            # Confirmaciones
            "servicio_confirmado": False,
            "ubicacion_confirmada": False,
            "personas_confirmadas": False,
            "fecha_confirmada": False,
            "formacion_confirmada": False,
            "empresa_confirmada": False,
            "cierre_preparado": False,
            "contacto_preparado": False,
            
            # Extras
            "requiere_desplazamiento": None,
            "preferencia_instructor": None,
            "materiales_requeridos": None,
            "nivel_experiencia": None,
            "certificacion_vigente": None
        }
    
    def process_message(self, user_message: str) -> str:
        """Procesa mensaje y devuelve respuesta basada en estados"""
        self.context["ultimo_mensaje_usuario"] = user_message
        self.context["ultimo_estado"] = self.state
        
        # Extraer información del mensaje
        self._extract_entities(user_message)
        
        # Detectar intención
        self._detect_intent(user_message)
        
        # Transición de estado
        self._transition_state()
        
        # Generar respuesta
        response = self._generate_response()
        
        # Guardar para evitar repeticiones
        self._track_message(response)
        
        return response
    
    def _extract_entities(self, message: str):
        """Extrae entidades del mensaje del usuario"""
        msg_lower = message.lower()
        
        # Números
        import re
        numbers = re.findall(r'\d+', message)
        if numbers and not self.context["numero_personas"]:
            self.context["numero_personas"] = int(numbers[0])
            self.context["personas_confirmadas"] = True
        
        # Ciudades comunes
        ciudades = ["madrid", "barcelona", "valencia", "sevilla", "zaragoza", "málaga", 
                   "murcia", "palma", "bilbao", "valladolid", "alicante", "córdoba"]
        for ciudad in ciudades:
            if ciudad in msg_lower:
                self.context["ciudad"] = ciudad.capitalize()
                self.context["ubicacion_confirmada"] = True
                break
        
        # Servicios y cursos
        if any(word in msg_lower for word in ["rcp", "reanimación"]):
            self.context["subservicio"] = "RCP"
            self.context["tipo_formacion"] = "RCP"
            self.context["formacion_confirmada"] = True
            
        if any(word in msg_lower for word in ["svb", "soporte vital"]):
            self.context["subservicio"] = "SVB y DEA"
            self.context["tipo_formacion"] = "SVB"
            self.context["formacion_confirmada"] = True
            
        if any(word in msg_lower for word in ["primeros auxilios", "primeros aux"]):
            self.context["subservicio"] = "Primeros Auxilios"
            self.context["tipo_formacion"] = "Primeros Auxilios"
            self.context["formacion_confirmada"] = True
            
        if any(word in msg_lower for word in ["prl", "prevención", "riesgos laborales"]):
            self.context["subservicio"] = "PRL"
            self.context["tipo_formacion"] = "Prevención de Riesgos"
            self.context["formacion_confirmada"] = True
        
        # Temporalidad
        if any(word in msg_lower for word in ["este mes", "próximo mes", "urgente", "pronto"]):
            self.context["fecha_solicitada"] = "próximas semanas"
            self.context["urgencia"] = "alta"
            self.context["fecha_confirmada"] = True
        
        # Modalidad
        if "online" in msg_lower:
            self.context["modalidad_formacion"] = "Online"
        elif "presencial" in msg_lower:
            self.context["modalidad_formacion"] = "Presencial"
            
        # Tipo de empresa
        if any(word in msg_lower for word in ["logística", "almacén", "distribución"]):
            self.context["sector_empresa"] = "Logística"
            self.context["empresa_confirmada"] = True
        elif any(word in msg_lower for word in ["industria", "fábrica", "planta"]):
            self.context["sector_empresa"] = "Industria"
            self.context["empresa_confirmada"] = True
    
    def _detect_intent(self, message: str):
        """Detecta la intención del usuario"""
        msg_lower = message.lower()
        
        if self.state == "inicio":
            if any(word in msg_lower for word in ["formación", "curso", "rcp", "svb", "primeros auxilios", "prl"]):
                self.context["servicio_principal"] = "formacion"
                self.context["intencion_usuario"] = "solicitar_formacion"
                self.context["confianza_intencion"] = 0.9
            elif any(word in msg_lower for word in ["cobertura", "personal sanitario", "enfermería"]):
                self.context["servicio_principal"] = "cobertura"
                self.context["intencion_usuario"] = "solicitar_cobertura"
                self.context["confianza_intencion"] = 0.9
            elif any(word in msg_lower for word in ["reconocimiento", "salud laboral", "chequeo"]):
                self.context["servicio_principal"] = "salud_laboral"
                self.context["intencion_usuario"] = "solicitar_salud_laboral"
                self.context["confianza_intencion"] = 0.9
    
    def _transition_state(self):
        """Gestiona transiciones entre estados"""
        if self.state == "inicio":
            if self.context["servicio_principal"] == "formacion":
                self.state = "formacion_inicio"
            elif self.context["servicio_principal"] == "cobertura":
                self.state = "cobertura_inicio"
            elif self.context["servicio_principal"] == "salud_laboral":
                self.state = "salud_inicio"
            else:
                self.state = "seleccion_servicio"
        
        elif self.state == "formacion_inicio":
            if self.context["formacion_confirmada"] and not self.context["numero_personas"]:
                self.state = "formacion_personas"
            elif self.context["formacion_confirmada"] and self.context["numero_personas"] and not self.context["ciudad"]:
                self.state = "formacion_ubicacion"
            elif self.context["formacion_confirmada"] and self.context["numero_personas"] and self.context["ciudad"] and not self.context["fecha_solicitada"]:
                self.state = "formacion_fecha"
            elif self.context["formacion_confirmada"] and self.context["numero_personas"] and self.context["ciudad"] and self.context["fecha_solicitada"]:
                self.state = "formacion_cierre"
            elif not self.context["formacion_confirmada"]:
                self.state = "formacion_tipo"
        
        elif self.state == "formacion_tipo":
            if self.context["formacion_confirmada"]:
                self.state = "formacion_personas"
        
        elif self.state == "formacion_personas":
            if self.context["numero_personas"]:
                self.state = "formacion_ubicacion"
        
        elif self.state == "formacion_ubicacion":
            if self.context["ciudad"]:
                self.state = "formacion_fecha"
        
        elif self.state == "formacion_fecha":
            if self.context["fecha_solicitada"]:
                self.state = "formacion_cierre"
        
        # Estados de cobertura
        elif self.state == "cobertura_inicio":
            if not self.context["ciudad"]:
                self.state = "cobertura_ciudad"
            elif not self.context["tipo_instalacion"]:
                self.state = "cobertura_instalacion"
            elif not self.context["numero_trabajadores"]:
                self.state = "cobertura_personas"
            else:
                self.state = "cobertura_cierre"
        
        elif self.state == "cobertura_ciudad":
            if self.context["ciudad"]:
                self.state = "cobertura_instalacion"
        
        elif self.state == "cobertura_instalacion":
            if self.context["tipo_instalacion"]:
                self.state = "cobertura_personas"
        
        elif self.state == "cobertura_personas":
            if self.context["numero_trabajadores"]:
                self.state = "cobertura_cierre"
        
        # Estados de salud laboral
        elif self.state == "salud_inicio":
            if not self.context["subservicio"]:
                self.state = "salud_tipo"
            elif not self.context["numero_personas"]:
                self.state = "salud_personas"
            elif not self.context["ciudad"]:
                self.state = "salud_ubicacion"
            else:
                self.state = "salud_cierre"
    
    def _generate_response(self) -> str:
        """Genera respuesta basada en estado actual"""
        templates = self._get_templates_for_state()
        
        if not templates:
            return "Entendido. ¿En qué más puedo ayudarte?"
        
        # Seleccionar plantilla no usada recientemente
        available = [t for t in templates if t not in self.last_messages[-3:]]
        if not available:
            available = templates
        
        template = random.choice(available)
        
        # Parametrizar con variables del contexto
        response = template.format(**self._get_safe_context())
        
        return response
    
    def _get_safe_context(self) -> Dict[str, str]:
        """Devuelve contexto con valores seguros para format"""
        safe = {}
        for key, value in self.context.items():
            safe[key] = str(value) if value is not None else ""
        return safe
    
    def _get_templates_for_state(self) -> List[str]:
        """Devuelve plantillas para el estado actual"""
        
        # INICIO Y CONFIRMACIONES
        confirmaciones = ["Perfecto.", "Genial.", "De acuerdo.", "Entendido.", 
                         "Estupendo.", "Bien.", "Gracias, lo tengo."]
        
        templates = {
            "formacion_tipo": [
                "¿Qué tipo de formación necesitas exactamente?",
                "¿De qué curso estaríamos hablando?",
                "¿Qué formación concreta os interesa?"
            ],
            
            "formacion_personas": [
                f"{random.choice(confirmaciones)}\n\n¿Cuántas personas aproximadamente participarían?",
                f"{random.choice(confirmaciones)}\n\n¿De cuántos trabajadores estaríamos hablando?",
                f"{random.choice(confirmaciones)}\n\n¿Qué número de personas debemos tomar como referencia?"
            ],
            
            "formacion_ubicacion": [
                f"{random.choice(confirmaciones)}\n\nFormación de {self.context.get('tipo_formacion', 'este tipo')} para {self.context.get('numero_personas', 'vuestro equipo')} personas.\n\n¿En qué ciudad se realizaría?",
                f"{random.choice(confirmaciones)}\n\n¿Dónde se realizaría exactamente la formación?",
                f"{random.choice(confirmaciones)}\n\n¿En qué ubicación tendría lugar el curso?"
            ],
            
            "formacion_fecha": [
                f"{random.choice(confirmaciones)}\n\n¿En qué fecha os vendría mejor?",
                f"{random.choice(confirmaciones)}\n\n¿Cuándo os interesaría realizarla?",
                f"{random.choice(confirmaciones)}\n\n¿Qué plazo manejáis?"
            ],
            
            "formacion_cierre": [
                f"{random.choice(confirmaciones)}\n\nCon esto ya tengo lo necesario para prepararte una propuesta ajustada.\n\n¿Te viene mejor que te contactemos por teléfono o email?",
                f"{random.choice(confirmaciones)}\n\nYa podemos dejarlo encarrilado.\n\n¿Cuál es el mejor correo para enviarte la propuesta?",
                f"Genial.\n\nYa tengo todo lo que necesito.\n\n¿Me dejas un teléfono de contacto y lo movemos?"
            ],
            
            "cobertura_ciudad": [
                "¿En qué ciudad necesitarías la cobertura?",
                "¿Dónde se necesitaría exactamente el servicio?",
                "¿En qué ciudad o zona habría que cubrir?"
            ],
            
            "cobertura_instalacion": [
                f"{random.choice(confirmaciones)}\n\n¿Qué tipo de instalación es?\n\n(Ej: almacén, fábrica, centro logístico, oficinas...)",
                f"{random.choice(confirmaciones)}\n\n¿De qué tipo de centro estamos hablando?",
            ],
            
            "cobertura_personas": [
                f"{random.choice(confirmaciones)}\n\n¿Cuántos trabajadores hay aproximadamente en ese centro?",
                f"{random.choice(confirmaciones)}\n\n¿Qué volumen de personal habría que cubrir?",
            ],
            
            "cobertura_cierre": [
                f"{random.choice(confirmaciones)}\n\nCon esto ya podemos prepararte una propuesta ajustada.\n\n¿Te viene mejor contacto por teléfono o email?",
            ],
            
            "salud_tipo": [
                "¿Qué tipo de servicio de salud laboral necesitas?\n\n(Ej: reconocimientos médicos, chequeos, campañas...)",
            ],
            
            "salud_personas": [
                f"{random.choice(confirmaciones)}\n\n¿Para cuántas personas aproximadamente?",
            ],
            
            "salud_ubicacion": [
                f"{random.choice(confirmaciones)}\n\n¿En qué ciudad se realizarían?",
            ],
            
            "salud_cierre": [
                f"{random.choice(confirmaciones)}\n\nYa tengo lo necesario.\n\n¿Cuál es el mejor correo para enviarte la propuesta?",
            ]
        }
        
        return templates.get(self.state, [])
    
    def _track_message(self, message: str):
        """Registra mensaje para evitar repeticiones"""
        self.last_messages.append(message)
        if len(self.last_messages) > 5:
            self.last_messages.pop(0)
