import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processOAuth = async () => {
      const hash = location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        navigate('/formacion-sanitaria');
        return;
      }

      try {
        const response = await axios.get(`${API}/auth/session?session_id=${sessionId}`, {
          withCredentials: true
        });
        
        setUser(response.data.user);
        navigate('/dashboard', { state: { user: response.data.user }, replace: true });
      } catch (error) {
        console.error('OAuth error:', error);
        navigate('/formacion-sanitaria');
      }
    };

    processOAuth();
  }, [location, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#005EB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#64748B]">Procesando autenticación...</p>
      </div>
    </div>
  );
};

export default AuthCallback;