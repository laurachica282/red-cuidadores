import { useLocation, useNavigate } from 'react-router-dom';

// Marca que se pone en los enlaces internos: "vengo de otra pantalla de la app".
export const DESDE_APP = { desde: 'app' };

// Botón "atrás" sin bucles: si se llegó desde otra pantalla (enlace con state DESDE_APP) se regresa a ella;
// si se entró directo (URL, recarga), se va a la pantalla padre reemplazando la actual, sin sumar historial.
export function useVolver(rutaPadre) {
  const navigate = useNavigate();
  const location = useLocation();
  return () => (location.state?.desde ? navigate(-1) : navigate(rutaPadre, { replace: true }));
}
