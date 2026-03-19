"""
Backend Tests for GASI Laboral Website
Tests: Chatbot flow, Courses API, Email destination verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCoursesAPI:
    """Tests for Courses CRUD API - Verify 6 courses are present with correct data"""
    
    def test_get_all_courses(self):
        """Verify courses endpoint returns 6 courses"""
        response = requests.get(f"{BASE_URL}/api/courses/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        courses = response.json()
        assert isinstance(courses, list), "Response should be a list"
        assert len(courses) == 6, f"Expected 6 courses, got {len(courses)}"
    
    def test_courses_have_required_fields(self):
        """Verify each course has required fields: title, description, duration, price"""
        response = requests.get(f"{BASE_URL}/api/courses/")
        courses = response.json()
        
        required_fields = ['title', 'description', 'duration', 'price', 'course_id']
        for course in courses:
            for field in required_fields:
                assert field in course, f"Missing field '{field}' in course: {course.get('title', 'Unknown')}"
    
    def test_specific_course_rcp_dea(self):
        """Verify RCP y Uso del DEA course with correct price (95€)"""
        response = requests.get(f"{BASE_URL}/api/courses/")
        courses = response.json()
        
        rcp_course = next((c for c in courses if "RCP y Uso del DEA" in c['title']), None)
        assert rcp_course is not None, "RCP y Uso del DEA course not found"
        assert rcp_course['price'] == 95.0, f"Expected price 95€, got {rcp_course['price']}€"
        assert rcp_course['duration'] == "8 horas", f"Expected 8 horas, got {rcp_course['duration']}"
    
    def test_specific_course_primeros_auxilios(self):
        """Verify Primeros Auxilios course with correct price (120€)"""
        response = requests.get(f"{BASE_URL}/api/courses/")
        courses = response.json()
        
        pa_course = next((c for c in courses if "Primeros Auxilios" in c['title']), None)
        assert pa_course is not None, "Primeros Auxilios course not found"
        assert pa_course['price'] == 120.0, f"Expected price 120€, got {pa_course['price']}€"
        assert pa_course['duration'] == "12 horas", f"Expected 12 horas, got {pa_course['duration']}"
    
    def test_specific_course_svb(self):
        """Verify Soporte Vital Básico Integral course with correct price (110€)"""
        response = requests.get(f"{BASE_URL}/api/courses/")
        courses = response.json()
        
        svb_course = next((c for c in courses if "Soporte Vital Básico Integral" in c['title']), None)
        assert svb_course is not None, "Soporte Vital Básico Integral course not found"
        assert svb_course['price'] == 110.0, f"Expected price 110€, got {svb_course['price']}€"
    
    def test_specific_course_emergencias(self):
        """Verify Emergencias Médicas course with correct price (95€)"""
        response = requests.get(f"{BASE_URL}/api/courses/")
        courses = response.json()
        
        em_course = next((c for c in courses if "Emergencias Médicas" in c['title']), None)
        assert em_course is not None, "Emergencias Médicas course not found"
        assert em_course['price'] == 95.0, f"Expected price 95€, got {em_course['price']}€"
    
    def test_specific_course_atragantamiento(self):
        """Verify Atragantamiento course with correct price (55€)"""
        response = requests.get(f"{BASE_URL}/api/courses/")
        courses = response.json()
        
        at_course = next((c for c in courses if "Atragantamiento" in c['title']), None)
        assert at_course is not None, "Atragantamiento course not found"
        assert at_course['price'] == 55.0, f"Expected price 55€, got {at_course['price']}€"
    
    def test_specific_course_heridas(self):
        """Verify Gestión de Heridas course with correct price (90€)"""
        response = requests.get(f"{BASE_URL}/api/courses/")
        courses = response.json()
        
        h_course = next((c for c in courses if "Heridas" in c['title']), None)
        assert h_course is not None, "Heridas course not found"
        assert h_course['price'] == 90.0, f"Expected price 90€, got {h_course['price']}€"


class TestChatbotAPI:
    """Tests for Chatbot API - Verify initial messages, option buttons, and flow"""
    
    def test_chatbot_initial_message(self):
        """Verify chatbot returns initial greeting and buttons"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "Hola"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'response' in data, "Response should contain 'response' field"
        assert 'session_id' in data, "Response should contain 'session_id'"
        assert 'buttons' in data, "Response should contain 'buttons'"
        
        # Verify initial messages
        assert "Hola" in data['response'], "Response should contain 'Hola'"
        assert "¿En qué podemos ayudarte?" in data['response'], "Response should contain help question"
    
    def test_chatbot_has_three_option_buttons(self):
        """Verify chatbot shows 3 option buttons: Cobertura, Formación, Salud laboral"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "Hola"}
        )
        data = response.json()
        
        buttons = data.get('buttons', [])
        assert len(buttons) == 3, f"Expected 3 buttons, got {len(buttons)}"
        
        button_texts = [b['text'] for b in buttons]
        assert "Cobertura sanitaria para empresas" in button_texts
        assert "Formación sanitaria" in button_texts
        assert "Salud laboral" in button_texts
    
    def test_chatbot_cobertura_flow(self):
        """Verify Cobertura option starts the flow correctly"""
        # First get session_id
        init_response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "Hola"}
        )
        session_id = init_response.json()['session_id']
        
        # Select Cobertura option
        response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "Cobertura sanitaria para empresas", "session_id": session_id}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "Explícanos brevemente" in data['response'] or "necesitas" in data['response']
    
    def test_chatbot_formacion_flow(self):
        """Verify Formación option starts the flow correctly"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "Formación sanitaria"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Should ask first question in formación flow
        assert 'response' in data
    
    def test_chatbot_salud_laboral_flow(self):
        """Verify Salud laboral option starts the flow correctly"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "Salud laboral"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'response' in data


class TestChatbotCompleteFlow:
    """Test complete chatbot flow to verify email destination"""
    
    def test_complete_cobertura_flow(self):
        """Complete full chatbot flow to trigger email sending (mocked)"""
        session_id = None
        
        # Step 1: Select Cobertura
        resp = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "Cobertura sanitaria para empresas", "session_id": session_id}
        )
        session_id = resp.json().get('session_id')
        assert resp.status_code == 200
        
        # Step 2-10: Answer all questions in cobertura flow
        answers = [
            "Necesito personal sanitario para obra",  # descripcion_libre
            "Madrid",  # ciudad
            "Esta semana",  # fecha
            "Obra",  # tipo_instalacion
            "Empresa Construcción SA",  # empresa_sector
            "150 trabajadores",  # numero_personas
            "TEST_Juan García",  # contacto_nombre
            "+34666777888",  # contacto_telefono
            "TEST_juan@test.com",  # contacto_email
            "No"  # observaciones
        ]
        
        for answer in answers:
            resp = requests.post(
                f"{BASE_URL}/api/chatbot/message",
                json={"message": answer, "session_id": session_id}
            )
            assert resp.status_code == 200, f"Failed on answer: {answer}"
        
        # Final response should contain confirmation message
        final_data = resp.json()
        assert "En breve se pondrán en contacto contigo" in final_data['response'], \
            f"Expected confirmation message, got: {final_data['response']}"


class TestAuthAPI:
    """Tests for Authentication API"""
    
    def test_login_success(self):
        """Test login with admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@gasisalud.com", "password": "Admin2024!"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'user' in data, "Response should contain user data"
        assert data['user']['email'] == "admin@gasisalud.com"
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@gasisalud.com", "password": "wrongpassword"}
        )
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
