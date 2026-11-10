import { useState } from 'react';
import { BrowserAuthErrorCodes, PublicClientApplication } from '@azure/msal-browser';

const CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;

// Una sola instancia de MSAL, creada al primer clic (así la librería solo trabaja si se usa).
// "common" acepta cuentas personales (Outlook, Hotmail) y de organizaciones (universidad, empresa).
let instancia = null;
function msal() {
  if (!instancia) {
    const app = new PublicClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: `${window.location.origin}/redirect.html`,
      },
      cache: { cacheLocation: 'sessionStorage' },
    });
    instancia = app.initialize().then(() => app);
  }
  return instancia;
}

// Cerrar la ventana o cancelar no es un error que haya que mostrar.
const CANCELADO = [BrowserAuthErrorCodes.userCancelled, 'user_cancelled'];

const LogoMicrosoft = () => (
  <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

// Abre la ventana de Microsoft y entrega el id_token. onIdToken recibe el token; onError, un mensaje para mostrar.
export default function BotonMicrosoft({ onIdToken, onError, deshabilitado = false }) {
  const [abriendo, setAbriendo] = useState(false);

  if (!CLIENT_ID) {
    return (
      <span className="login-red" title="Inicio con Microsoft no configurado">
        <button type="button" className="btn-secundario login-microsoft" disabled><LogoMicrosoft /> Microsoft</button>
      </span>
    );
  }

  async function entrar() {
    setAbriendo(true);
    try {
      const app = await msal();
      const r = await app.loginPopup({ scopes: ['openid', 'profile', 'email'], prompt: 'select_account' });
      onIdToken(r.idToken);
    } catch (e) {
      if (CANCELADO.includes(e?.errorCode)) return;
      if (e?.errorCode === BrowserAuthErrorCodes.popupWindowError) {
        onError('Tu navegador bloqueó la ventana de Microsoft. Permite las ventanas emergentes e inténtalo de nuevo.');
      } else {
        onError('No pudimos conectar con Microsoft. Inténtalo de nuevo.');
      }
    } finally {
      setAbriendo(false);
    }
  }

  return (
    <span className="login-red">
      <button type="button" className="btn-secundario login-microsoft" onClick={entrar} disabled={deshabilitado || abriendo}>
        <LogoMicrosoft /> {abriendo ? 'Conectando…' : 'Iniciar sesión con Microsoft'}
      </button>
    </span>
  );
}
