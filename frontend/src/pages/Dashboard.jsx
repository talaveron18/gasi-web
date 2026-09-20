import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, BookOpen, Clock, ArrowRight, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { PUBLIC_API_BASE as API } from '@/lib/publicApi';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/formacion-sanitaria');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEnrollments();
    }
  }, [user]);

  const fetchEnrollments = async () => {
    try {
      const response = await axios.get(`${API}/courses/enrollments/my`, {
        withCredentials: true
      });
      setEnrollments(response.data);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#005EB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#64748B]">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="dashboard-page">
      <div className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2" data-testid="dashboard-title">
            Bienvenido, {user.name}
          </h1>
          <p className="text-lg opacity-90">Tu panel de formación sanitaria</p>
          {user.is_admin && (
            <Link to="/dashboard/admin/cursos" className="inline-flex mt-5">
              <Button variant="secondary" data-testid="admin-courses-link">
                <Settings className="w-4 h-4 mr-2" aria-hidden="true" /> Administrar aula
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A]">Mis Cursos</h2>
            <Link to="/formacion-sanitaria">
              <Button className="bg-[#005EB8] hover:bg-[#004a92]" data-testid="explore-courses-button">
                Explorar más cursos
              </Button>
            </Link>
          </div>

          {loadingCourses ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#005EB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#64748B]">Cargando tus cursos...</p>
            </div>
          ) : enrollments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((item, index) => (
                <Card key={index} className="hover-lift" data-testid={`enrolled-course-${index}`}>
                  <div className="h-40 bg-gradient-to-br from-[#005EB8] to-[#327BBD] rounded-t-lg flex items-center justify-center">
                    <GraduationCap className="w-16 h-16 text-white" />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-[#0F172A] mb-2">
                      {item.course.title}
                    </h3>
                    <p className="text-[#64748B] text-sm mb-4 line-clamp-2">
                      {item.course.description}
                    </p>
                    <div className="flex items-center gap-4 mb-4 text-sm text-[#64748B]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{item.course.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{item.course.type}</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[#64748B]">Progreso</span>
                        <span className="font-semibold text-[#005EB8]">{item.enrollment.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-[#005EB8] h-2 rounded-full transition-all"
                          style={{ width: `${item.enrollment.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <Link to={`/curso/${item.course.course_id}`}>
                      <Button className="w-full bg-[#005EB8] hover:bg-[#004a92]" data-testid={`continue-course-${index}`}>
                        Continuar curso <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <GraduationCap className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">
                Aún no estás inscrito en ningún curso
              </h3>
              <p className="text-[#64748B] mb-6">
                Explora nuestro catálogo de formación sanitaria y comienza a aprender
              </p>
              <Link to="/formacion-sanitaria">
                <Button className="bg-[#005EB8] hover:bg-[#004a92]" data-testid="explore-courses-empty">
                  Ver cursos disponibles
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;