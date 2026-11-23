import { useState } from 'react';
import { pedirCodigoConfirmacion } from '../services/authService.js';
import CodigoVerificacion from './CodigoVerificacion.jsx';
import './ConfirmarConCodigo.css';
import '../i18n.js';
import { useIdioma } from '@/modules/region';

// Para cuentas sin contraseña (entraron con Google/Microsoft): en vez de la clave se confirma con un
// código que llega al correo. `valor`/`onChange` son los 6 dígitos, como en CodigoVerificacion.
export default function ConfirmarConCodigo({ valor, onChange, deshabilitado = false }) {
  const { t } = useIdioma();
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(''); // clave de traducción, para que siga al idioma
  const [error, setError] = useState('');

  const enviar = async () => {
    setError('');
    setAviso('');
    setEnviando(true);
    try {
      await pedirCodigoConfirmacion();
      onChange('');
      setEnviado(true);
      setAviso('auth.confirmarCodigo.aviso');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="confirmar-codigo">
      <span className="label">{t('auth.confirmaQueEresTu')}</span>
      {enviado && <CodigoVerificacion valor={valor} onChange={onChange} deshabilitado={deshabilitado} />}
      {aviso && <p className="confirmar-codigo-aviso" role="status">{t(aviso)}</p>}
      {error && <p className="confirmar-codigo-error" role="alert">{error}</p>}
      <button type="button" className={enviado ? 'confirmar-codigo-reenviar' : 'btn-secundario'}
        onClick={enviar} disabled={enviando || deshabilitado}>
        {t(enviando ? 'auth.enviando' : enviado ? 'auth.reenviarCodigo' : 'auth.confirmarCodigo.enviarme')}
      </button>
    </div>
  );
}
