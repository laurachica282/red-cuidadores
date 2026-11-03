import { useLayoutEffect, useRef, useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Botón oficial de Google (el único que entrega el id_token). El proveedor envuelve solo este botón,
// así el script de Google se carga únicamente en el login.
// onCredencial recibe el id_token; onError, un mensaje para mostrar.
export default function BotonGoogle({ onCredencial, onError, deshabilitado = false }) {
  const caja = useRef(null);
  const [ancho, setAncho] = useState(0);

  // Google pide el ancho en píxeles (máximo 400): se toma el de la celda y se vuelve a medir si cambia
  // (p. ej. al pasar de móvil a tarjeta). Si Google lo dibuja más ancho, el CSS lo centra en la celda.
  useLayoutEffect(() => {
    const celda = caja.current;
    if (!celda) return undefined;
    const medir = () => setAncho(Math.min(400, Math.floor(celda.getBoundingClientRect().width)));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(celda);
    return () => observador.disconnect();
  }, []);

  if (!CLIENT_ID) {
    return (
      <span className="login-red" title="Inicio con Google no configurado">
        <button type="button" className="btn-secundario" disabled>Google</button>
      </span>
    );
  }

  return (
    <div ref={caja} className={`login-red login-google${deshabilitado ? ' login-google-ocupado' : ''}`}>
      {ancho > 0 && (
        <GoogleOAuthProvider clientId={CLIENT_ID}>
          <GoogleLogin
            onSuccess={({ credential }) => onCredencial(credential)}
            onError={() => onError('No pudimos conectar con Google. Inténtalo de nuevo.')}
            theme="outline" shape="rectangular" size="large" text="signin_with" locale="es"
            width={String(ancho)}
            containerProps={{ className: 'login-google-boton' }}
          />
        </GoogleOAuthProvider>
      )}
    </div>
  );
}
