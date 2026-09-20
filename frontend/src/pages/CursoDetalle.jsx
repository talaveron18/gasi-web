import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Clock, BookOpen, ArrowLeft, CheckCircle, Users, Calendar, Award, FileText, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { PUBLIC_API_BASE as API } from '@/lib/publicApi';

const CursoDetalle = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [progressState, setProgressState] = useState(null);
  const [hasCourseAccess, setHasCourseAccess] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedMaterialUrl, setSelectedMaterialUrl] = useState('');
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

  const fetchMaterials = useCallback(async () => {
    if (!user) {
      setMaterials([]);
      setHasCourseAccess(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/courses/${courseId}/materials`, {
        withCredentials: true
      });
      setMaterials(response.data);
      setHasCourseAccess(true);
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        setMaterials([]);
        setHasCourseAccess(false);
        return;
      }
      toast.error('No se pudieron cargar los materiales del curso');
    }
  }, [courseId, user]);

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setProgressState(null);
      return;
    }
    try {
      const response = await axios.get(`${API}/courses/${courseId}/progress`, {
        withCredentials: true
      });
      setProgressState(response.data);
      setHasCourseAccess(true);
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        setProgressState(null);
        setHasCourseAccess(false);
        return;
      }
      toast.error('No se pudo cargar tu progreso');
    }
  }, [courseId, user]);

  useEffect(() => {
    fetchMaterials();
    fetchProgress();
  }, [fetchMaterials, fetchProgress]);

  useEffect(() => {
    return () => {
      if (selectedMaterialUrl) URL.revokeObjectURL(selectedMaterialUrl);
    };
  }, [selectedMaterialUrl]);

  const closeMaterial = () => {
    if (selectedMaterialUrl) URL.revokeObjectURL(selectedMaterialUrl);
    setSelectedMaterialUrl('');
    setSelectedMaterial(null);
  };

  const openMaterial = async (material) => {
    try {
      setLoadingAction(true);
      const response = await axios.get(
        `${API}/courses/${courseId}/materials/${material.material_id}/content`,
        { withCredentials: true, responseType: 'blob' }
      );
      if (selectedMaterialUrl) URL.revokeObjectURL(selectedMaterialUrl);
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setSelectedMaterial(material);
      setSelectedMaterialUrl(blobUrl);
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        setHasCourseAccess(false);
        setMaterials([]);
        toast.error('Tu sesión ya no permite acceder a este material');
      } else {
        toast.error('No se pudo abrir el material');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para inscribirte');
      navigate('/formacion-sanitaria');
      return;
    }
    if (hasCourseAccess) {
      document.getElementById('materiales-del-curso')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setLoadingAction(true);
    try {
      if (course.is_free) {
        await axios.post(`${API}/courses/enroll`, { course_id: courseId }, {
          withCredentials: true
        });
        toast.success('¡Te has inscrito correctamente!');
        await Promise.all([fetchMaterials(), fetchProgress()]);
      } else {
        const response = await axios.post(`${API}/payments/create-checkout`, null, {
          withCredentials: true,
          params: { course_id: courseId }
        });
        if (!response.data?.checkout_url) throw new Error('missing_checkout_url');
        window.location.assign(response.data.checkout_url);
      }
    } catch (error) {
      if (error.response?.data?.detail === 'Already enrolled') {
        await fetchMaterials();
        toast.info('Ya estás inscrito en este curso');
      } else if (error.response?.data?.detail === 'payment_service_unavailable') {
        toast.error('El pago no está disponible temporalmente');
      } else if (error.response?.data?.detail === 'payment_required') {
        toast.error('Este curso requiere completar el pago');
      } else {
        toast.error(course.is_free ? 'Error al inscribirse' : 'No se pudo iniciar el pago');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const completeModule = async (moduleId) => {
    if (!hasCourseAccess) return;
    setLoadingAction(true);
    try {
      const response = await axios.post(
        `${API}/courses/${courseId}/modules/${moduleId}/complete`,
        {},
        { withCredentials: true }
      );
      setProgressState(response.data);
      toast.success(response.data.progress === 100 ? 'Curso completado' : 'Progreso actualizado');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        setHasCourseAccess(false);
        setMaterials([]);
        setProgressState(null);
        toast.error('Tu sesión ya no permite actualizar este curso');
      } else {
        toast.error('No se pudo guardar el progreso');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const downloadCertificate = async () => {
    if (!progressState?.certificate_id || progressState.progress !== 100) return;
    setLoadingAction(true);
    try {
      const response = await axios.get(`${API}/courses/${courseId}/certificate`, {
        withCredentials: true,
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `certificado-${progressState.certificate_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('No se pudo descargar el certificado');
    } finally {
      setLoadingAction(false);
    }
  };

  const enrollmentLabel = !user
    ? 'Iniciar Sesión para Inscribirme'
    : hasCourseAccess
      ? 'Abrir materiales'
      : course?.is_free
        ? 'Inscribirme gratis'
        : `Comprar por ${course?.price}€`;

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
                  <Button className="w-full bg-[#005EB8] hover:bg-[#004a92] text-white py-6 text-lg" onClick={handleEnroll} disabled={loadingAction} data-testid="enroll-button">
                    {loadingAction ? 'Procesando…' : enrollmentLabel}
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
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-[#005EB8] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{index + 1}</div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <h3 className="font-semibold text-[#0F172A] text-lg">{module.title}</h3>
                              {hasCourseAccess && (
                                progressState?.completed_module_ids?.includes(module.module_id) ? (
                                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700" data-testid={`module-complete-${module.module_id}`}>
                                    <CheckCircle className="w-4 h-4" aria-hidden="true" /> Completado
                                  </span>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={loadingAction}
                                    onClick={() => completeModule(module.module_id)}
                                    data-testid={`complete-module-${module.module_id}`}
                                  >
                                    Marcar completado
                                  </Button>
                                )
                              )}
                            </div>
                            {module.description && <p className="text-gray-600 mt-1">{module.description}</p>}
                          </div>
                        </div>
                      </CardContent>
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

      {user && hasCourseAccess && (
        <section id="materiales-del-curso" className="py-12 bg-[#F8FAFC]" data-testid="course-materials">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#005EB8]" aria-hidden="true" />
                <div>
                  <h2 className="text-2xl font-bold text-[#0F172A]">Materiales del curso</h2>
                  <p className="text-sm text-gray-600">Acceso disponible únicamente con tu sesión y matrícula activas.</p>
                </div>
              </div>
              {progressState && (
                <div className="min-w-[220px]" data-testid="course-progress">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Progreso</span>
                    <strong>{progressState.progress}%</strong>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-[#005EB8]" style={{ width: `${progressState.progress}%` }} />
                  </div>
                </div>
              )}
            </div>
            {progressState?.progress === 100 && progressState?.certificate_id && (
              <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-testid="course-completed">
                <div>
                  <p className="font-semibold text-green-800">Curso completado</p>
                  <p className="text-sm text-green-700">Certificado {progressState.certificate_id}</p>
                </div>
                <Button type="button" onClick={downloadCertificate} disabled={loadingAction} data-testid="download-certificate">
                  <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Descargar certificado
                </Button>
              </div>
            )}
            {materials.length > 0 ? (
              <div className="space-y-3">
                {materials.map((material) => (
                  <Card key={material.material_id}>
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0F172A] truncate">{material.filename}</p>
                        <p className="text-sm text-gray-500">PDF · {Math.max(1, Math.ceil((material.size || 0) / 1024))} KB</p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => openMaterial(material)}
                        disabled={loadingAction}
                        data-testid={`open-material-${material.material_id}`}
                      >
                        Abrir material
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-gray-600">
                  Tu matrícula está activa. Todavía no hay materiales publicados para este curso.
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">¿Listo para empezar?</h2>
          <p className="text-gray-600 mb-8">Inscríbete ahora y mejora las capacidades de respuesta ante emergencias de tu equipo</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-[#005EB8] hover:bg-[#004a92] text-white" onClick={handleEnroll} disabled={loadingAction}>{loadingAction ? 'Procesando…' : enrollmentLabel}</Button>
            <Link to="/contacto"><Button size="lg" variant="outline">Solicitar información</Button></Link>
          </div>
        </div>
      </section>
      <Dialog open={Boolean(selectedMaterialUrl)} onOpenChange={(open) => { if (!open) closeMaterial(); }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedMaterial?.filename || 'Material del curso'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden border bg-gray-100">
            {selectedMaterialUrl && (
              <iframe
                src={`${selectedMaterialUrl}#toolbar=0&navpanes=0`}
                title={selectedMaterial?.filename || 'Material del curso'}
                className="w-full h-full"
              />
            )}
          </div>
          <p className="text-xs text-gray-500">
            El acceso se concede con tu sesión activa. La web no publica un enlace directo al archivo.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CursoDetalle;
