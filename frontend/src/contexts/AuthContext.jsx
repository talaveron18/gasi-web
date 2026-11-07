import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PUBLIC_API_BASE as API } from '@/lib/publicApi';

const AuthContext = createContext(null);

// The commercial SPA can receive index.html from a missing API. Never treat a
// successful HTTP status (or arbitrary truthy data) as an authenticated user.
export const isAuthenticatedStudent = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  return typeof payload.user_id === 'string' && payload.user_id.trim().length > 0
    && typeof payload.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
    && typeof payload.name === 'string' && payload.name.trim().length > 0;
};
const isJson = (response) => String(response?.headers?.['content-type'] || '').toLowerCase().includes('application/json');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    if (window.location.hash?.includes('session_id=')) { setUser(null); setLoading(false); return; }
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true, timeout: 10000 });
      setUser(isJson(response) && isAuthenticatedStudent(response.data) ? response.data : null);
    } catch (_) { setUser(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (email, password) => {
    setUser(null);
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true, timeout: 10000 });
      const profile = response.data?.user;
      if (!isJson(response) || !isAuthenticatedStudent(profile)) {
        return { success: false, error: 'El servicio de acceso no está disponible o ha devuelto una respuesta no válida.' };
      }
      setUser(profile);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail === 'api_unavailable'
        ? 'El acceso al aula todavía no está habilitado.'
        : 'No se ha podido validar la identidad. Consulta con GASI el estado de tu acceso.' };
    }
  };

  // Registration is retained for a future authenticated backend. There is no
  // public registration form or available registration endpoint on this site.
  const register = async () => ({ success: false, error: 'El registro público no está habilitado.' });

  const logout = async () => {
    setUser(null);
    try { await axios.post(`${API}/auth/logout`, {}, { withCredentials: true, timeout: 10000 }); }
    catch (_) { /* An absent public API must not keep a stale local session. */ }
  };

  return <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, checkAuth }}>
    {children}
  </AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
