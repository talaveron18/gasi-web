import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '',
    type: 'Presencial',
    price: 0,
    is_free: true,
    modules: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      toast.error('Acceso denegado: se requieren privilegios de administrador');
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && user.is_admin) {
      fetchCourses();
    }
  }, [user]);

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API}/courses/`);
      setCourses(response.data);
    } catch (error) {
      toast.error('Error al cargar cursos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCourse) {
        await axios.put(`${API}/admin/courses/${editingCourse.course_id}`, formData, {
          withCredentials: true
        });
        toast.success('Curso actualizado');
      } else {
        await axios.post(`${API}/admin/courses`, formData, {
          withCredentials: true
        });
        toast.success('Curso creado');
      }
      setShowModal(false);
      setEditingCourse(null);
      fetchCourses();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar curso');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseId) => {
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      duration: '',
      type: 'Presencial',
      price: 0,
      is_free: true,
      modules: []
    });
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      duration: course.duration,
      type: course.type,
      price: course.price,
      is_free: course.is_free,
      modules: course.modules || []
    });
    setShowModal(true);
  };

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="admin-panel">
      <div className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">Panel de Administración</h1>
          <p className="text-lg opacity-90">Gestión de cursos y contenido</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#0F172A]">Cursos</h2>
          <Button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-[#005EB8] hover:bg-[#004a92]"
            data-testid="create-course-button"
          >
            <Plus className="mr-2 w-5 h-5" /> Crear Curso
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.course_id} data-testid={`course-admin-${course.course_id}`}>
              <CardHeader>
                <CardTitle>{course.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#64748B] mb-4 line-clamp-2">{course.description}</p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => openEditModal(course)}
                    data-testid={`edit-course-${course.course_id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleDelete(course.course_id)}
                    data-testid={`delete-course-${course.course_id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Editar Curso' : 'Crear Nuevo Curso'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duración</Label>
                <Input
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  placeholder="ej: 8 horas"
                  required
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option>Presencial</option>
                  <option>Online</option>
                  <option>Híbrido</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Precio (€)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                  disabled={formData.is_free}
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  checked={formData.is_free}
                  onChange={(e) => setFormData({...formData, is_free: e.target.checked, price: 0})}
                  id="is_free"
                />
                <Label htmlFor="is_free">Curso gratuito</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-[#005EB8] hover:bg-[#004a92]">
                {editingCourse ? 'Actualizar' : 'Crear'} Curso
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;