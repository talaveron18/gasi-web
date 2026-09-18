import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Clock, BookOpen, ArrowLeft, CheckCircle, Users, Calendar, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CursoDetalle = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchCourse = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/courses/${courseId}`);
      setCourse(response.data);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('No se pudo cargar el curso');
      navigate('/formacion-sanitaria');
    } finally {
      setLoading(false);
    }
  }, [courseId, navigate]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const handleEnroll = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para inscribirte');
      return;
    }
    
    try {
      await axios.post(`${API}/courses/enroll`, { course_id: courseId }, {
        withCredentials: true
      });
      toast.success('¡Te has inscrito correctamente!');
      navigate('/dashboard');
    } catch (error) {
      if (error.response?.data?.detail === 'Already enrolled') {
        toast.info('Ya estás inscrito en este curso');
        navigate('/dashboard');
      } else {
        toast.error('Error al inscribirse');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005EB8]"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Curso no encontrado</p>
      </div>
    );
  }

  return (
    <div data-testid="curso-detalle-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-16">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <Link to="/formacion-sanitaria" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al catálogo
          </Link>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h1 className="text-3xl lg:text-4xl font-bold mb-4" data-testid="course-title">{course.title}</h1>
              <p className="text-lg text-white/90 mb-6">{course.description}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><Clock className="w-4 h-4" /><span>{course.duration}</span></div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><BookOpen className="w-4 h-4" /><span>{course.type}</span></div>
                {course.modules && course.modules.length > 0 && (
                  <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"><GraduationCap className="w-4 h-4" /><span>{course.modules.length} módulos</span></div>
                )}
              </div>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-white text-[#0F172A]">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    {course.is_free ? <div className="text-3xl font-bold text-green-600">Gratis</div> : <div><span className="text-4xl font-bold text-[#005EB8]">{course.price}€</span><span className="text-gray-500 ml-2">/ curso</span></div>}
                  </div>
                  <Button className="w-full bg-[#005EB8] hover:bg-[#004a92] text-white py-6 text-lg" onClick={handleEnroll} data-testid="enroll-button">
                    {user ? 'Inscribirme Ahora' : 'Iniciar Sesión para Inscribirme'}
                  </Button>
                  <div className="mt-6 space-y-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><span>Certificado de finalización</span></div>
                    <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><span>Material didáctico incluido</span></div>
                    <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><span>Formadores expertos</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-[#0F172A] mb-6">Contenido del Curso</h2>
              {course.modules && course.modules.length > 0 ? (
                <div className="space-y-4">
                  {course.modules.map((module, index) => (
                    <Card key={module.module_id || index} className="border-l-4 border-l-[#005EB8]">
                      <CardContent className="p-5"><div className="flex items-start gap-4"><div className="w-10 h-10 bg-[#005EB8] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{index + 1}</div><div><h3 className="font-semibold text-[#0F172A] text-lg">{module.title}</h3>{module.description && <p className="text-gray-600 mt-1">{module.description}</p>}</div></div></CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-gray-50"><CardContent className="p-8 text-center"><GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-600">El contenido detallado del curso se proporcionará durante la formación.</p><p className="text-gray-500 text-sm mt-2">Contacte con nosotros para más información sobre el programa.</p></CardContent></Card>
              )}
            </div>

            <div className="lg:col-span-1">
              <h2 className="text-2xl font-bold text-[#0F172A] mb-6">Información</h2>
              <Card className="bg-[#F8FAFC]">
                <CardContent className="p-6 space-y-6">
                  <div><div className="flex items-center gap-2 text-[#005EB8] mb-2"><Clock className="w-5 h-5" /><span className="font-semibold">Duración</span></div><p className="text-gray-700">{course.duration}</p></div>
                  <div><div className="flex items-center gap-2 text-[#005EB8] mb-2"><BookOpen className="w-5 h-5" /><span className="font-semibold">Modalidad</span></div><p className="text-gray-700">{course.type}</p></div>
                  <div><div className="flex items-center gap-2 text-[#005EB8] mb-2"><Users className="w-5 h-5" /><span className="font-semibold">Dirigido a</span></div><p className="text-gray-700">Personal de empresas, responsables de prevención, trabajadores designados</p></div>
                  <div><div className="flex items-center gap-2 text-[#005EB8] mb-2"><Award className="w-5 h-5" /><span className="font-semibold">Certificación</span></div><p className="text-gray-700">Diploma acreditativo de GASI</p></div>
                </CardContent>
              </Card>
              <div className="mt-6">
                <Card className="bg-[#005EB8] text-white"><CardContent className="p-6 text-center"><Calendar className="w-8 h-8 mx-auto mb-3" /><h3 className="font-semibold mb-2">¿Necesitas otra fecha?</h3><p className="text-sm text-white/80 mb-4">Organizamos formación a medida para tu empresa</p><Link to="/contacto"><Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-[#005EB8]">Contactar</Button></Link></CardContent></Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">¿Listo para empezar?</h2>
          <p className="text-gray-600 mb-8">Inscríbete ahora y mejora las capacidades de respuesta ante emergencias de tu equipo</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-[#005EB8] hover:bg-[#004a92] text-white" onClick={handleEnroll}>Inscribirme en este curso</Button>
            <Link to="/contacto"><Button size="lg" variant="outline">Solicitar información</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CursoDetalle;
