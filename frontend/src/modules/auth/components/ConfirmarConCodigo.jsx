import { useState } from 'react';
import { pedirCodigoConfirmacion } from '../services/authService.js';
import CodigoVerificacion from './CodigoVerificacion.jsx';
import './ConfirmarConCodigo.css';

// Para cuentas sin contraseña (entraron con Google/Microsoft): en vez de la clave se confirma con un
// código que llega al correo. `valor`/`onChange` son los 6 dígitos, como en CodigoVerificacion.
export default function ConfirmarConCodigo({ valor, onChange, deshabilitado = false }) {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const enviar = async () => {
    setError('');
    setAviso('');
    setEnviando(true);
    try {
      await pedirCodigoConfirmacion();
      onChange('');
      setEnviado(true);
      setAviso('Te enviamos un código de 6 dígitos a tu correo. Vence en 10 minutos.');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="confirmar-codigo">
      <span className="label">Confirma que eres tú</span>
      {enviado && <CodigoVerificacion valor={valor} onChange={onChange} deshabilitado={deshabilitado} />}
      {aviso && <p className="confirmar-codigo-aviso" role="status">{aviso}</p>}
      {error && <p className="confirmar-codigo-error" role="alert">{error}</p>}
      <button type="button" className={enviado ? 'confirmar-codigo-reenviar' : 'btn-secundario'}
        onClick={enviar} disabled={enviando || deshabilitado}>
        {enviando ? 'Enviando…' : enviado ? 'Reenviar código' : 'Enviarme un código'}
      </button>
    </div>
  );
}
