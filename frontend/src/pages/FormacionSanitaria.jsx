import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Clock, Euro, BookOpen, Lock, LogIn } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FormacionSanitaria = () => {
  const [courses, setCourses] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API}/courses/`);
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData.name, formData.email, formData.password);
      }

      if (result.success) {
        toast.success(isLogin ? '¡Sesión iniciada!' : '¡Registro exitoso!');
        setShowAuthModal(false);
        navigate('/dashboard');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleCourseAccess = (course) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    navigate(`/curso/${course.course_id}`);
  };

  return (
    <div data-testid="formacion-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">
            Formación Sanitaria para Empresas
          </h1>
          <p className="text-xl opacity-90 mb-8">
            Cursos especializados en primeros auxilios, RCP y prevención en el entorno laboral
          </p>
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-[#005EB8] hover:bg-gray-100"
                onClick={() => { setIsLogin(true); setShowAuthModal(true); }}
                data-testid="login-button-hero"
              >
                <LogIn className="mr-2 w-5 h-5" />
                Iniciar Sesión
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#005EB8]"
                onClick={() => { setIsLogin(false); setShowAuthModal(true); }}
                data-testid="register-button-hero"
              >
                Registrarse
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
              Catálogo de Cursos
            </h2>
            <p className="text-lg text-[#64748B]">
              Formación práctica y certificada para sus equipos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.length > 0 ? courses.map((course, index) => (
              <Card key={course.course_id} className="hover-lift" data-testid={`course-card-${index}`}>
                <div className="h-48 bg-gradient-to-br from-[#005EB8] to-[#327BBD] rounded-t-lg flex items-center justify-center">
                  <GraduationCap className="w-20 h-20 text-white" />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-[#0F172A] flex-1">
                      {course.title}
                    </h3>
                    {course.is_free ? (
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">Gratis</span>
                    ) : (
                      <span className="bg-[#005EB8] text-white text-xs font-semibold px-2 py-1 rounded">{course.price}€</span>
                    )}
                  </div>
                  <p className="text-[#64748B] mb-4 text-sm line-clamp-3">
                    {course.description}
                  </p>
                  <div className="flex items-center gap-4 mb-4 text-sm text-[#64748B]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{course.type}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-[#005EB8] hover:bg-[#004a92] text-white"
                    onClick={() => handleCourseAccess(course)}
                    data-testid={`course-access-${index}`}
                  >
                    {user ? 'Acceder al Curso' : 'Iniciar Sesión para Acceder'}
                  </Button>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full text-center py-12">
                <GraduationCap className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
                <p className="text-[#64748B] text-lg">Próximamente dispondremos de cursos. Contáctenos para más información.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">
            Formación Personalizada para su Empresa
          </h2>
          <p className="text-lg text-[#64748B] mb-8">
            ¿Necesita un curso específico o formación in-company? Contáctenos y diseñaremos un programa a medida.
          </p>
          <Link to="/contacto">
            <Button size="lg" className="bg-[#005EB8] hover:bg-[#004a92] text-white" data-testid="cta-contact">
              Solicitar Formación Personalizada
            </Button>
          </Link>
        </div>
      </section>

      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md" data-testid="auth-modal">
          <DialogHeader>
            <DialogTitle>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required={!isLogin}
                  data-testid="auth-name-input"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                data-testid="auth-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                minLength={6}
                data-testid="auth-password-input"
              />
            </div>
            <Button type="submit" className="w-full bg-[#005EB8] hover:bg-[#004a92]" disabled={loading} data-testid="auth-submit-button">
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
            </Button>
          </form>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">O</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleLogin}
            type="button"
            data-testid="google-login-button"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </Button>

          <div className="text-center text-sm mt-4">
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#005EB8] hover:underline"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormacionSanitaria;