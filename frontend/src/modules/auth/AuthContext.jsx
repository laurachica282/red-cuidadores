import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { logout } from './services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; }
  });

  const iniciarSesion = ({ token, usuario }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setUsuario(usuario);
  };

  // Refleja cambios del perfil (p. ej. dos_pasos) sin tocar el token.
  const actualizarUsuario = (usuario) => {
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setUsuario(usuario);
  };

  // Solo borra los datos de este navegador; ProtectedRoute se encarga de llevar al login.
  const limpiarSesion = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  // api() emite 'sesion-cerrada' cuando el servidor responde SESION_CERRADA en cualquier llamada.
  useEffect(() => {
    window.addEventListener('sesion-cerrada', limpiarSesion);
    return () => window.removeEventListener('sesion-cerrada', limpiarSesion);
  }, [limpiarSesion]);

  // api() lee el token antes de su primer await, así que se puede limpiar enseguida.
  const cerrarSesion = () => {
    logout().catch(() => {});
    limpiarSesion();
  };

  return (
    <AuthContext.Provider value={{ usuario, iniciarSesion, actualizarUsuario, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
