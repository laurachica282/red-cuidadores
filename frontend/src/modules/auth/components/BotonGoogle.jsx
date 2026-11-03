import { useLayoutEffect, useRef, useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Botón oficial de Google (el único que entrega el id_token). El proveedor envuelve solo este botón,
// así el script de Google se carga únicamente en el login.
// onCredencial recibe el id_token; onError, un mensaje para mostrar.
export default function BotonGoogle({ onCredencial, onError, deshabilitado = false }) {
  const caja = useRef(null);
  const [ancho, setAncho] = useState(0);

  // Google pide el ancho en píxeles (entre 200 y 400): se mide la celda una sola vez al montar.
  useLayoutEffect(() => {
    if (!caja.current) return;
    setAncho(Math.min(400, Math.max(200, Math.floor(caja.current.getBoundingClientRect().width))));
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
