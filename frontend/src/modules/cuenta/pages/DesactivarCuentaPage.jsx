import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { useIdioma } from '@/modules/region';
import { traducirMensajeServidor } from '@/shared/api/mensajesServidor.js';
import '../i18n.js';
import Aviso from '../components/Aviso.jsx';
import CampoClave from '../components/CampoClave.jsx';
import { IconAlerta, IconCheck } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { desactivarCuenta, obtenerPendientes } from '../services/cuentaService.js';
import { MOTIVOS, PAZ_Y_SALVO } from '../utils/textos.js';
import { RUTAS } from '../rutas.js';
import Desplegable from '@/shared/components/Desplegable.jsx';

// Mockup 18 (antes "Eliminar cuenta"; ahora "Desactivar cuenta" por RN-5: nada se borra).
// HU-37: "Antes de irte" muestra qué falta para cerrar. HU-39: desactiva con motivo y contraseña.
function Formulario({ alTerminar }) {
  const { t } = useIdioma();
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [clave, setClave] = useState('');
  const [entiendo, setEntiendo] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const completo = motivo && clave && entiendo;

  const enviar = async (e) => {
    e.preventDefault();
    if (!completo) return;
    setError('');
    setEnviando(true);
    try {
      await desactivarCuenta({ clave, motivo, detalle: motivo === 'otro' ? detalle : '' });
      alTerminar();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <form className="cu-form" onSubmit={enviar}>
      <div>
        <label className="label" htmlFor="motivo">{t('cuenta.desactivar.porQue')}</label>
        <Desplegable id="motivo" name="motivo" className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          <option value="">{t('cuenta.desactivar.eligeMotivo')}</option>
          {MOTIVOS.map((m) => <option key={m.valor} value={m.valor}>{t(m.titulo)}</option>)}
        </Desplegable>
      </div>

      {motivo === 'otro' && (
        <div>
          <label className="label" htmlFor="detalle">{t('cuenta.desactivar.cuentanos')}</label>
          <textarea id="detalle" className="input" maxLength={500} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
        </div>
      )}

      <CampoClave id="clave" etiqueta={t('cuenta.desactivar.claveConfirmar')} placeholder={t('cuenta.desactivar.tuClave')} valor={clave} onChange={setClave} />

      <label className="cu-check">
        <input type="checkbox" checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)} />
        {t('cuenta.desactivar.entiendo')}
      </label>

      <div className="cu-acciones">
        <Aviso>{error}</Aviso>
        <button type="submit" className="cu-btn cu-btn-peligro" disabled={!completo || enviando}>
          {enviando ? t('cuenta.desactivar.desactivando') : t('cuenta.desactivar.boton')}
        </button>
        <Link className="cu-btn" to={RUTAS.configuracion}>{t('cuenta.mejorMeQuedo')}</Link>
      </div>
    </form>
  );
}

export default function DesactivarCuentaPage() {
  const { usuario } = useAuth();
  const { t } = useIdioma();
  const navigate = useNavigate();
  const { datos, cargando, error } = useCarga(obtenerPendientes);

  // Se navega a la pantalla pública SIN cerrar la sesión aquí: si se cerrara antes, la ruta
  // protegida redirigiría a /login y ganaría a esta navegación. La sesión local se cierra al
  // llegar a /reactivar (ReactivarCuentaPage mira state.desactivada).
  const terminar = () => {
    navigate(RUTAS.reactivar, { state: { correo: usuario.correo, desactivada: true }, replace: true });
  };

  return (
    <Pantalla titulo={t('cuenta.menu.desactivar')}>
      <div className="cu-peligro">
        <IconAlerta />
        <div>
          <strong>{t('cuenta.desactivar.noVisible')}</strong>
          {t('cuenta.desactivar.noBorramos')}
        </div>
      </div>

      {cargando && <p className="cu-cargando">{t('cuenta.desactivar.revisando')}</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}

      {datos && (
        <>
          <p className="cu-titulo-lista">{t('cuenta.desactivar.antesDeIrte')}</p>
          <ul className="cu-chequeo">
            {datos.verificaciones.map((v) => {
              const textos = PAZ_Y_SALVO[v.codigo];
              const pendiente = v.cantidad > 0;
              return (
                <li key={v.codigo} className={pendiente ? 'cu-pendiente-item' : ''}>
                  {pendiente ? <IconAlerta /> : <IconCheck />}
                  <span>
                    {textos ? t(pendiente ? textos.pendiente(v.cantidad) : textos.ok, { n: v.cantidad }) : v.codigo}
                    {v.detalle && <small>{traducirMensajeServidor(v.detalle)}</small>}
                  </span>
                </li>
              );
            })}
          </ul>

          {datos.puede_cerrar
            ? <Formulario alTerminar={terminar} />
            : (
              <div className="cu-form">
                <Aviso tipo="info">{t('cuenta.desactivar.pazYSalvo')}</Aviso>
                <div className="cu-acciones"><Link className="cu-btn" to={RUTAS.configuracion}>{t('cuenta.mejorMeQuedo')}</Link></div>
              </div>
            )}
        </>
      )}
    </Pantalla>
  );
}
