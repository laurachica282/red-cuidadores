import { useState } from 'react';
import { BrowserAuthErrorCodes, PublicClientApplication } from '@azure/msal-browser';
import '../i18n.js';
import { useIdioma } from '@/modules/region';

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
  const { t, idioma } = useIdioma();
  const [abriendo, setAbriendo] = useState(false);

  if (!CLIENT_ID) {
    return (
      <span className="login-red" title={t('auth.microsoft.noConfigurado')}>
        <button type="button" className="login-social" disabled><LogoMicrosoft /> Microsoft</button>
      </span>
    );
  }

  async function entrar() {
    setAbriendo(true);
    try {
      const app = await msal();
      const r = await app.loginPopup({ scopes: ['openid', 'profile', 'email'], prompt: 'select_account', extraQueryParameters: { ui_locales: idioma } });
      onIdToken(r.idToken);
    } catch (e) {
      if (CANCELADO.includes(e?.errorCode)) return;
      if (e?.errorCode === BrowserAuthErrorCodes.popupWindowError) {
        onError(t('auth.microsoft.bloqueado'));
      } else {
        onError(t('auth.microsoft.error'));
      }
    } finally {
      setAbriendo(false);
    }
  }

  return (
    <span className="login-red">
      <button type="button" className="login-social" onClick={entrar} disabled={deshabilitado || abriendo}>
        <LogoMicrosoft /> {t(abriendo ? 'auth.microsoft.conectando' : 'auth.microsoft.entrar')}
      </button>
    </span>
  );
}
