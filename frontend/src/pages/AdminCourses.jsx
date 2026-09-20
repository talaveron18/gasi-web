import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Plus, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const emptyCourse = () => ({
  title: '',
  description: '',
  duration: '',
  type: 'Online',
  price: 0,
  is_free: true,
  thumbnail: '',
  modules: [],
});

const normalizeCourse = course => ({
  title: course?.title || '',
  description: course?.description || '',
  duration: course?.duration || '',
  type: course?.type || 'Online',
  price: Number(course?.price || 0),
  is_free: course?.is_free !== false,
  thumbnail: course?.thumbnail || '',
  modules: (course?.modules || []).map((module, index) => ({
    module_id: module.module_id,
    title: module.title || '',
    order: Number(module.order ?? index + 1),
    description: module.description || '',
  })),
});

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyCourse());
  const [materials, setMaterials] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const selected = useMemo(
    () => courses.find(course => course.course_id === selectedId) || null,
    [courses, selectedId],
  );

  const loadCourses = useCallback(async (preferredId = '') => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/courses/`, { withCredentials: true });
      const rows = Array.isArray(response.data) ? response.data : [];
      setCourses(rows);
      const nextId = preferredId && rows.some(row => row.course_id === preferredId)
        ? preferredId
        : rows[0]?.course_id || '';
      setSelectedId(nextId);
      setForm(nextId ? normalizeCourse(rows.find(row => row.course_id === nextId)) : emptyCourse());
    } catch {
      toast.error('No se pudieron cargar los cursos');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMaterials = useCallback(async courseId => {
    if (!courseId) {
      setMaterials([]);
      return;
    }
    try {
      const response = await axios.get(`${API}/admin/courses/${courseId}/materials`, {
        withCredentials: true,
      });
      setMaterials(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      if (error.response?.status === 403) toast.error('Tu cuenta no tiene permisos de administración');
      else toast.error('No se pudieron cargar los materiales');
      setMaterials([]);
    }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  useEffect(() => {
    if (selectedId) {
      const row = courses.find(course => course.course_id === selectedId);
      if (row) setForm(normalizeCourse(row));
      loadMaterials(selectedId);
    } else {
      setMaterials([]);
    }
  }, [selectedId, courses, loadMaterials]);

  const chooseNew = () => {
    setSelectedId('');
    setForm(emptyCourse());
    setMaterials([]);
  };

  const updateField = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const addModule = () => setForm(current => ({
    ...current,
    modules: [
      ...current.modules,
      {
        module_id: crypto.randomUUID(),
        title: `Módulo ${current.modules.length + 1}`,
        order: current.modules.length + 1,
        description: '',
      },
    ],
  }));

  const updateModule = (index, key, value) => setForm(current => ({
    ...current,
    modules: current.modules.map((module, i) => i === index ? { ...module, [key]: value } : module),
  }));

  const removeModule = index => setForm(current => ({
    ...current,
    modules: current.modules
      .filter((_, i) => i !== index)
      .map((module, i) => ({ ...module, order: i + 1 })),
  }));

  const payload = () => ({
    ...form,
    price: form.is_free ? 0 : Number(form.price || 0),
    thumbnail: form.thumbnail || null,
    modules: form.modules.map((module, index) => ({
      ...module,
      order: index + 1,
    })),
  });

  const saveCourse = async event => {
    event.preventDefault();
    setBusy(true);
    try {
      let response;
      if (selectedId) {
        response = await axios.put(`${API}/admin/courses/${selectedId}`, payload(), {
          withCredentials: true,
        });
        toast.success('Curso actualizado');
      } else {
        response = await axios.post(`${API}/admin/courses`, payload(), {
          withCredentials: true,
        });
        toast.success('Curso creado');
      }
      await loadCourses(response.data.course_id);
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (detail?.code === 'module_has_materials') {
        toast.error('No puedes eliminar un módulo que todavía tiene materiales. Elimina primero sus materiales.');
      } else if (error.response?.status === 403) {
        toast.error('Tu cuenta no tiene permisos de administración');
      } else {
        toast.error('No se pudo guardar el curso');
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteCourse = async () => {
    if (!selectedId || !window.confirm('¿Eliminar este curso vacío? Esta acción no se puede deshacer.')) return;
    setBusy(true);
    try {
      await axios.delete(`${API}/admin/courses/${selectedId}`, { withCredentials: true });
      toast.success('Curso eliminado');
      await loadCourses();
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (detail === 'course_has_enrollments') toast.error('No se puede eliminar: el curso tiene matrículas.');
      else if (detail === 'course_has_materials') toast.error('No se puede eliminar: el curso tiene materiales.');
      else toast.error('No se pudo eliminar el curso');
    } finally {
      setBusy(false);
    }
  };

  const uploadMaterial = async (moduleId, file) => {
    if (!selectedId || !file) return;
    const body = new FormData();
    body.append('module_id', moduleId);
    body.append('file', file);
    setBusy(true);
    try {
      await axios.post(`${API}/admin/courses/${selectedId}/materials`, body, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Material subido');
      await loadMaterials(selectedId);
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (detail === 'course_material_storage_not_configured') {
        toast.error('El almacenamiento privado de materiales no está configurado.');
      } else if (detail === 'invalid_pdf_content' || detail === 'invalid_material_type') {
        toast.error('El archivo debe ser un PDF válido.');
      } else {
        toast.error('No se pudo subir el material');
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteMaterial = async material => {
    if (!window.confirm(`¿Eliminar "${material.filename}"?`)) return;
    setBusy(true);
    try {
      await axios.delete(
        `${API}/admin/courses/${selectedId}/materials/${material.material_id}`,
        { withCredentials: true },
      );
      toast.success('Material eliminado');
      await loadMaterials(selectedId);
    } catch {
      toast.error('No se pudo eliminar el material');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10" data-testid="admin-courses-page">
      <div className="max-w-7xl mx-auto px-6">
        <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-[#005EB8] mb-3">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver al panel
            </Link>
            <h1 className="text-3xl font-bold text-[#0F172A]">Administración del aula</h1>
            <p className="mt-2 text-[#64748B]">Cursos, módulos y materiales privados.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => loadCourses(selectedId)} disabled={loading || busy}>
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" /> Actualizar
            </Button>
            <Button onClick={chooseNew}>
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Nuevo curso
            </Button>
          </div>
        </header>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <aside className="space-y-3" aria-label="Cursos">
            {courses.map(course => (
              <button
                key={course.course_id}
                type="button"
                onClick={() => setSelectedId(course.course_id)}
                className={`w-full text-left rounded-xl border p-4 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] ${selectedId === course.course_id ? 'border-[#005EB8] ring-1 ring-[#005EB8]' : 'border-slate-200'}`}
              >
                <span className="block font-semibold text-[#0F172A]">{course.title}</span>
                <span className="block mt-1 text-sm text-[#64748B]">{course.is_free ? 'Gratis' : `${course.price}€`} · {course.modules?.length || 0} módulos</span>
              </button>
            ))}
            {!courses.length && !loading && (
              <Card><CardContent className="p-4 text-sm text-[#64748B]">Todavía no hay cursos.</CardContent></Card>
            )}
          </aside>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <form onSubmit={saveCourse} className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-[#0F172A]">{selectedId ? 'Editar curso' : 'Crear curso'}</h2>
                    {selectedId && (
                      <Button type="button" variant="destructive" onClick={deleteCourse} disabled={busy}>
                        <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" /> Eliminar curso
                      </Button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <label className="text-sm font-medium">Título
                      <input required value={form.title} onChange={e => updateField('title', e.target.value)} className="mt-1 w-full rounded-lg border p-3" />
                    </label>
                    <label className="text-sm font-medium">Duración
                      <input required value={form.duration} onChange={e => updateField('duration', e.target.value)} className="mt-1 w-full rounded-lg border p-3" />
                    </label>
                    <label className="text-sm font-medium">Modalidad
                      <input required value={form.type} onChange={e => updateField('type', e.target.value)} className="mt-1 w-full rounded-lg border p-3" />
                    </label>
                    <label className="text-sm font-medium">Imagen/thumbnail opcional
                      <input value={form.thumbnail} onChange={e => updateField('thumbnail', e.target.value)} className="mt-1 w-full rounded-lg border p-3" />
                    </label>
                  </div>

                  <label className="text-sm font-medium block">Descripción
                    <textarea required rows={4} value={form.description} onChange={e => updateField('description', e.target.value)} className="mt-1 w-full rounded-lg border p-3" />
                  </label>

                  <div className="flex flex-wrap items-center gap-6">
                    <label className="inline-flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" checked={form.is_free} onChange={e => updateField('is_free', e.target.checked)} />
                      Curso gratuito
                    </label>
                    {!form.is_free && (
                      <label className="text-sm font-medium">Precio (€)
                        <input type="number" min="0.01" step="0.01" required value={form.price} onChange={e => updateField('price', e.target.value)} className="ml-2 w-28 rounded-lg border p-2" />
                      </label>
                    )}
                  </div>

                  <section aria-labelledby="modules-title">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 id="modules-title" className="font-bold text-[#0F172A]">Módulos</h3>
                      <Button type="button" variant="outline" onClick={addModule}>
                        <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Añadir módulo
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {form.modules.map((module, index) => (
                        <Card key={module.module_id}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold">Módulo {index + 1}</span>
                              <Button type="button" variant="ghost" onClick={() => removeModule(index)} aria-label={`Eliminar módulo ${index + 1}`}>
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                            </div>
                            <input required value={module.title} onChange={e => updateModule(index, 'title', e.target.value)} placeholder="Título del módulo" className="w-full rounded-lg border p-3" />
                            <textarea value={module.description || ''} onChange={e => updateModule(index, 'description', e.target.value)} placeholder="Descripción" rows={2} className="w-full rounded-lg border p-3" />
                            {selectedId && (
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium">
                                <Upload className="w-4 h-4" aria-hidden="true" /> Subir PDF
                                <input
                                  type="file"
                                  accept="application/pdf,.pdf"
                                  className="sr-only"
                                  disabled={busy}
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadMaterial(module.module_id, file);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>

                  <Button type="submit" disabled={busy}>
                    <Save className="w-4 h-4 mr-2" aria-hidden="true" /> {busy ? 'Guardando…' : 'Guardar curso'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {selectedId && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-[#005EB8]" aria-hidden="true" />
                    <h2 className="text-xl font-bold text-[#0F172A]">Materiales publicados</h2>
                  </div>
                  <div className="space-y-3">
                    {materials.map(material => (
                      <div key={material.material_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                        <div>
                          <p className="font-semibold">{material.filename}</p>
                          <p className="text-sm text-[#64748B]">
                            {form.modules.find(module => module.module_id === material.module_id)?.title || material.module_id}
                          </p>
                        </div>
                        <Button type="button" variant="destructive" onClick={() => deleteMaterial(material)} disabled={busy}>
                          <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" /> Eliminar
                        </Button>
                      </div>
                    ))}
                    {!materials.length && <p className="text-sm text-[#64748B]">No hay materiales publicados.</p>}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
