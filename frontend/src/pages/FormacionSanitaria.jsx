import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GraduationCap, Clock, BookOpen, LogIn, Plus, Edit, Trash2, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const OAUTH_LOGIN_URL = (process.env.REACT_APP_OAUTH_LOGIN_URL || '').trim();

const FormacionSanitaria = () => {
  const [courses, setCourses] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  
  // Admin states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseFormData, setCourseFormData] = useState({
    title: '',
    description: '',
    duration: '',
    type: 'Presencial',
    price: 0,
    is_free: true,
    modules: []
  });
  
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (location.state?.openAuth && !user) {
      setIsLogin(true);
      setShowAuthModal(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, user]);

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
    if (!OAUTH_LOGIN_URL) return;
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const separator = OAUTH_LOGIN_URL.includes('?') ? '&' : '?';
    window.location.href = `${OAUTH_LOGIN_URL}${separator}redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleCourseAccess = (course) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    navigate(`/curso/${course.course_id}`);
  };

  // ADMIN FUNCTIONS
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingCourse) {
        await axios.put(`${API}/admin/courses/${editingCourse.course_id}`, courseFormData, {
          withCredentials: true
        });
        toast.success('Curso actualizado');
      } else {
        await axios.post(`${API}/admin/courses`, courseFormData, {
          withCredentials: true
        });
        toast.success('Curso creado');
      }
      setShowCourseModal(false);
      setEditingCourse(null);
      resetCourseForm();
      fetchCourses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar curso');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setCourseFormData({
      title: course.title,
      description: course.description,
      duration: course.duration,
      type: course.type,
      price: course.price,
      is_free: course.is_free,
      modules: course.modules || []
    });
    setShowCourseModal(true);
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('¿Seguro que quieres eliminar este curso?')) return;
    
    try {
      await axios.delete(`${API}/admin/courses/${courseId}`, {
        withCredentials: true
      });
      toast.success('Curso eliminado');
      fetchCourses();
    } catch (error) {
      toast.error('Error al eliminar curso');
    }
  };

  const resetCourseForm = () => {
    setCourseFormData({
      title: '',
      description: '',
      duration: '',
      type: 'Presencial',
      price: 0,
      is_free: true,
      modules: []
    });
  };

  const openCreateModal = () => {
    resetCourseForm();
    setEditingCourse(null);
    setShowCourseModal(true);
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

      {/* ADMIN MODE INDICATOR */}
      {user && user.is_admin && (
        <div className="bg-[#0F172A] text-white py-4 border-b-2 border-[#005EB8]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#005EB8]" />
              <span className="font-semibold text-sm uppercase tracking-wide">Modo Administrador Activado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Vista:</span>
              <Button
                size="sm"
                variant={!adminMode ? "default" : "outline"}
                onClick={() => setAdminMode(false)}
                className={!adminMode ? "bg-[#005EB8]" : ""}
              >
                Alumno
              </Button>
              <Button
                size="sm"
                variant={adminMode ? "default" : "outline"}
                onClick={() => setAdminMode(true)}
                className={adminMode ? "bg-[#005EB8]" : ""}
              >
                Administrador
              </Button>
            </div>
          </div>
        </div>
      )}

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div className="text-center flex-1">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
                Catálogo de Cursos
              </h2>
              <p className="text-lg text-[#64748B]">
                Formación práctica y certificada para sus equipos
              </p>
            </div>
            
            {user && user.is_admin && adminMode && (
              <Button 
                onClick={openCreateModal}
                className="bg-[#005EB8] hover:bg-[#004a92] ml-4"
                data-testid="admin-create-course"
              >
                <Plus className="mr-2 w-5 h-5" /> Crear Curso
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.length > 0 ? courses.map((course, index) => (
              <Card key={course.course_id} className="hover-lift relative overflow-hidden" data-testid={`course-card-${index}`}>
                <div className="h-48 bg-gradient-to-br from-[#005EB8] to-[#327BBD] rounded-t-lg flex items-center justify-center relative">
                  <GraduationCap className="w-20 h-20 text-white/80" />
                  {course.modules && course.modules.length > 0 && (
                    <div className="absolute bottom-3 right-3 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-white text-xs font-medium">{course.modules.length} módulos</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-[#0F172A] flex-1 leading-tight">
                      {course.title}
                    </h3>
                    {course.is_free ? (
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded ml-2 whitespace-nowrap">Gratis</span>
                    ) : (
                      <span className="bg-[#005EB8] text-white text-xs font-semibold px-2 py-1 rounded ml-2 whitespace-nowrap">{course.price}€</span>
                    )}
                  </div>
                  <p className="text-[#64748B] mb-4 text-sm line-clamp-3">
                    {course.description}
                  </p>
                  
                  <div className="flex items-center gap-4 mb-4 text-sm text-[#64748B]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-[#005EB8]" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4 text-[#005EB8]" />
                      <span>{course.type}</span>
                    </div>
                  </div>
                  
                  {/* Mostrar módulos si existen */}
                  {course.modules && course.modules.length > 0 && (
                    <div className="mb-4 pt-3 border-t border-gray-100">
                      <p className="text-xs font-semibold text-[#0F172A] mb-2">Contenido del curso:</p>
                      <ul className="space-y-1">
                        {course.modules.slice(0, 3).map((mod, i) => (
                          <li key={mod.module_id || i} className="text-xs text-[#64748B] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#005EB8] rounded-full"></span>
                            {mod.title}
                          </li>
                        ))}
                        {course.modules.length > 3 && (
                          <li className="text-xs text-[#005EB8] font-medium">
                            +{course.modules.length - 3} módulos más
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {user && user.is_admin && adminMode ? (
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-[#005EB8] hover:bg-[#004a92] text-white"
                        onClick={() => handleEditCourse(course)}
                        data-testid={`admin-edit-${index}`}
                      >
                        <Edit className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleDeleteCourse(course.course_id)}
                        data-testid={`admin-delete-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className="w-full bg-[#005EB8] hover:bg-[#004a92] text-white"
                      onClick={() => handleCourseAccess(course)}
                      data-testid={`course-access-${index}`}
                    >
                      {user ? 'Ver Detalles del Curso' : 'Iniciar Sesión para Acceder'}
                    </Button>
                  )}
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

      {/* ADMIN COURSE MODAL */}
      {user && user.is_admin && (
        <Dialog open={showCourseModal} onOpenChange={(open) => {
          setShowCourseModal(open);
          if (!open) {
            setEditingCourse(null);
            resetCourseForm();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{editingCourse ? 'Editar Curso' : 'Crear Nuevo Curso'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <Label htmlFor="course-title">Título *</Label>
                <Input
                  id="course-title"
                  value={courseFormData.title}
                  onChange={(e) => setCourseFormData({...courseFormData, title: e.target.value})}
                  required
                  placeholder="Nombre del curso"
                />
              </div>
              <div>
                <Label htmlFor="course-description">Descripción *</Label>
                <Textarea
                  id="course-description"
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData({...courseFormData, description: e.target.value})}
                  required
                  rows={4}
                  placeholder="Descripción detallada del curso"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="course-duration">Duración *</Label>
                  <Input
                    id="course-duration"
                    value={courseFormData.duration}
                    onChange={(e) => setCourseFormData({...courseFormData, duration: e.target.value})}
                    placeholder="ej: 8 horas"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="course-type">Tipo *</Label>
                  <select
                    id="course-type"
                    value={courseFormData.type}
                    onChange={(e) => setCourseFormData({...courseFormData, type: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md bg-white"
                    required
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Online">Online</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="course-price">Precio (€)</Label>
                  <Input
                    id="course-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={courseFormData.price}
                    onChange={(e) => setCourseFormData({...courseFormData, price: parseFloat(e.target.value) || 0})}
                    disabled={courseFormData.is_free}
                  />
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    checked={courseFormData.is_free}
                    onChange={(e) => setCourseFormData({...courseFormData, is_free: e.target.checked, price: e.target.checked ? 0 : courseFormData.price})}
                    id="course-is-free"
                    className="w-4 h-4"
                  />
                  <Label htmlFor="course-is-free" className="cursor-pointer">Curso gratuito</Label>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <Button type="submit" className="flex-1 bg-[#005EB8] hover:bg-[#004a92]" disabled={loading}>
                  {loading ? 'Guardando...' : (editingCourse ? 'Actualizar Curso' : 'Crear Curso')}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowCourseModal(false);
                    setEditingCourse(null);
                    resetCourseForm();
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* AUTH MODAL */}
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

          {OAUTH_LOGIN_URL && (
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
          )}

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