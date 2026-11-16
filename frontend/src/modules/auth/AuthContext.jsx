import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { logout } from './services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; }
  });

  // 'usuario-actualizado' avisa al idioma (módulo region) para que aplique el de la persona al instante.
  const avisarCambio = () => window.dispatchEvent(new Event('usuario-actualizado'));

  const iniciarSesion = ({ token, usuario }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setUsuario(usuario);
    avisarCambio();
  };

  // Refleja cambios del perfil (p. ej. dos_pasos) sin tocar el token.
  const actualizarUsuario = (usuario) => {
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setUsuario(usuario);
    avisarCambio();
  };

  // El módulo region cambió país, idioma o moneda: el usuario en memoria se alinea con el guardado.
  useEffect(() => {
    const alCambiarRegion = (e) => setUsuario((u) => (u ? { ...u, ...e.detail } : u));
    // Otra pestaña del navegador inició o cerró sesión, o cambió el perfil.
    const alCambiarOtraPestana = (e) => {
      if (e.key !== 'usuario') return;
      try { setUsuario(e.newValue ? JSON.parse(e.newValue) : null); } catch { /* valor dañado: se ignora */ }
    };
    window.addEventListener('region-cambiada', alCambiarRegion);
    window.addEventListener('storage', alCambiarOtraPestana);
    return () => {
      window.removeEventListener('region-cambiada', alCambiarRegion);
      window.removeEventListener('storage', alCambiarOtraPestana);
    };
  }, []);

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
