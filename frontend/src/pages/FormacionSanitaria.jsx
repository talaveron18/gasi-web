import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { BookOpen, Clock, GraduationCap, LogIn, Settings } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { PUBLIC_API_BASE as API } from '@/lib/publicApi';

const OAUTH_LOGIN_URL = (process.env.REACT_APP_OAUTH_LOGIN_URL || '').trim();

const FormacionSanitaria = () => {
  const [courses, setCourses] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    axios.get(`${API}/courses/`)
      .then(response => { if (active) setCourses(Array.isArray(response.data) ? response.data : []); })
      .catch(() => { if (active) setCourses([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (location.state?.openAuth && !user) {
      setIsLogin(true);
      setShowAuthModal(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, user]);

  const handleAuth = async event => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = isLogin
        ? await login(formData.email, formData.password)
        : await register(formData.name, formData.email, formData.password);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isLogin ? '¡Sesión iniciada!' : '¡Registro exitoso!');
      setShowAuthModal(false);
      navigate('/dashboard');
    } catch {
      toast.error('Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!OAUTH_LOGIN_URL) return;
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const separator = OAUTH_LOGIN_URL.includes('?') ? '&' : '?';
    window.location.href = `${OAUTH_LOGIN_URL}${separator}redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleCourseAccess = course => {
    if (!user) {
      setIsLogin(true);
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!user ? (
              <>
                <Button
                  size="lg"
                  className="bg-white text-[#005EB8] hover:bg-gray-100"
                  onClick={() => { setIsLogin(true); setShowAuthModal(true); }}
                  data-testid="login-button-hero"
                >
                  <LogIn className="mr-2 w-5 h-5" aria-hidden="true" /> Iniciar Sesión
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
              </>
            ) : (
              <Link to="/dashboard">
                <Button size="lg" className="bg-white text-[#005EB8] hover:bg-gray-100">
                  Ir a mi panel
                </Button>
              </Link>
            )}
            {user?.is_admin && (
              <Link to="/dashboard/admin/cursos">
                <Button size="lg" variant="outline" className="border-white text-white bg-transparent hover:bg-white hover:text-[#005EB8]" data-testid="catalog-admin-link">
                  <Settings className="mr-2 w-5 h-5" aria-hidden="true" /> Administrar aula
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">Catálogo de Cursos</h2>
            <p className="text-lg text-[#64748B]">Formación práctica y certificada para sus equipos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.length > 0 ? courses.map((course, index) => (
              <Card key={course.course_id} className="hover-lift overflow-hidden" data-testid={`course-card-${index}`}>
                <div className="h-48 bg-gradient-to-br from-[#005EB8] to-[#327BBD] rounded-t-lg flex items-center justify-center relative">
                  <GraduationCap className="w-20 h-20 text-white/80" aria-hidden="true" />
                  {course.modules?.length > 0 && (
                    <div className="absolute bottom-3 right-3 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-white text-xs font-medium">{course.modules.length} módulos</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-[#0F172A] flex-1 leading-tight">{course.title}</h3>
                    <span className={course.is_free
                      ? 'bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded ml-2 whitespace-nowrap'
                      : 'bg-[#005EB8] text-white text-xs font-semibold px-2 py-1 rounded ml-2 whitespace-nowrap'}>
                      {course.is_free ? 'Gratis' : `${course.price}€`}
                    </span>
                  </div>
                  <p className="text-[#64748B] mb-4 text-sm line-clamp-3">{course.description}</p>
                  <div className="flex items-center gap-4 mb-4 text-sm text-[#64748B]">
                    <div className="flex items-center gap-1"><Clock className="w-4 h-4 text-[#005EB8]" aria-hidden="true" /><span>{course.duration}</span></div>
                    <div className="flex items-center gap-1"><BookOpen className="w-4 h-4 text-[#005EB8]" aria-hidden="true" /><span>{course.type}</span></div>
                  </div>
                  {course.modules?.length > 0 && (
                    <div className="mb-4 pt-3 border-t border-gray-100">
                      <p className="text-xs font-semibold text-[#0F172A] mb-2">Contenido del curso:</p>
                      <ul className="space-y-1">
                        {course.modules.slice(0, 3).map((module, moduleIndex) => (
                          <li key={module.module_id || moduleIndex} className="text-xs text-[#64748B] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#005EB8] rounded-full" aria-hidden="true" /> {module.title}
                          </li>
                        ))}
                        {course.modules.length > 3 && <li className="text-xs text-[#005EB8] font-medium">+{course.modules.length - 3} módulos más</li>}
                      </ul>
                    </div>
                  )}
                  <Button
                    className="w-full bg-[#005EB8] hover:bg-[#004a92] text-white"
                    onClick={() => handleCourseAccess(course)}
                    data-testid={`course-access-${index}`}
                  >
                    {user ? 'Ver Detalles del Curso' : 'Iniciar Sesión para Acceder'}
                  </Button>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full text-center py-12">
                <GraduationCap className="w-16 h-16 text-[#64748B] mx-auto mb-4" aria-hidden="true" />
                <p className="text-[#64748B] text-lg">Próximamente dispondremos de cursos. Contáctenos para más información.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Formación Personalizada para su Empresa</h2>
          <p className="text-lg text-[#64748B] mb-8">¿Necesita un curso específico o formación in-company? Contáctenos y diseñaremos un programa a medida.</p>
          <Link to="/contacto">
            <Button size="lg" className="bg-[#005EB8] hover:bg-[#004a92] text-white" data-testid="cta-contact">
              Solicitar Formación Personalizada
            </Button>
          </Link>
        </div>
      </section>

      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md" data-testid="auth-modal">
          <DialogHeader><DialogTitle>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</DialogTitle></DialogHeader>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} minLength={2} maxLength={80} required data-testid="auth-name-input" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required data-testid="auth-email-input" />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required minLength={isLogin ? 1 : 12} maxLength={128} autoComplete={isLogin ? 'current-password' : 'new-password'} data-testid="auth-password-input" />
            </div>
            <Button type="submit" className="w-full bg-[#005EB8] hover:bg-[#004a92]" disabled={loading} data-testid="auth-submit-button">
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
            </Button>
          </form>

          {OAUTH_LOGIN_URL && (
            <>
              <div className="relative my-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">O</span></div></div>
              <Button variant="outline" className="w-full" onClick={handleGoogleLogin} type="button" data-testid="google-login-button">
                Continuar con Google
              </Button>
            </>
          )}

          <div className="text-center text-sm mt-4">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-[#005EB8] hover:underline" data-testid="toggle-auth-mode">
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormacionSanitaria;
