import { useCallback, useEffect, useState } from 'react';
import { useIdioma } from '@/modules/region';
import { ChipEstado } from '../components/EstadoVerificacion.jsx';
import Pantalla from '../components/Pantalla.jsx';
import {
  abrirArchivo, aprobarVerificacion, listarCuidadoresAdmin, listarVerificaciones,
  rechazarVerificacion, suspenderCuidador,
} from '../services/cuidadoresService.js';

const iniciales = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('');
const ETIQUETA_ARCHIVO = { documento: 'admin.ver_documento', selfie: 'admin.ver_selfie', antecedentes: 'admin.ver_antecedentes' };

// Cuadro para escribir un motivo obligatorio (rechazo y suspensión).
function CajaMotivo({ etiqueta, placeholder, confirmar, onConfirmar, onCancelar, ocupado }) {
  const { t } = useIdioma();
  const [motivo, setMotivo] = useState('');
  return (
    <div className="cd-motivo-caja">
      <label className="label">{etiqueta}
        <textarea className="input cd-textarea" rows={3} value={motivo} placeholder={placeholder} onChange={(e) => setMotivo(e.target.value)} />
      </label>
      <div className="cd-acciones">
        <button type="button" className="cd-btn cd-btn-sec" onClick={onCancelar}>{t('comun.cancelar')}</button>
        <button type="button" className="cd-btn cd-btn-peligro" disabled={ocupado} onClick={() => onConfirmar(motivo.trim())}>{confirmar}</button>
      </div>
    </div>
  );
}

// HU-12 (aprobar o rechazar) y HU-14 (suspender): panel del administrador.
export default function AdminCuidadoresPage() {
  const { t, fecha } = useIdioma();
  const [pestana, setPestana] = useState('pendientes');
  const [pendientes, setPendientes] = useState([]);
  const [cuidadores, setCuidadores] = useState([]);
  const [abierto, setAbierto] = useState(null); // { tipo: 'rechazar' | 'suspender', id }
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const [p, c] = await Promise.all([listarVerificaciones('en_revision'), listarCuidadoresAdmin()]);
    setPendientes(p);
    setCuidadores(c);
  }, []);

  useEffect(() => {
    let vivo = true;
    Promise.all([listarVerificaciones('en_revision'), listarCuidadoresAdmin()])
      .then(([p, c]) => { if (vivo) { setPendientes(p); setCuidadores(c); } })
      .catch((e) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, []);

  const ejecutar = async (accion, mensaje) => {
    setError('');
    setAviso('');
    setOcupado(true);
    try {
      await accion();
      setAbierto(null);
      setAviso(mensaje);
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  };

  const ver = (id) => abrirArchivo(id).catch((e) => setError(e.message));
  const motivoValido = (m) => (m.length >= 5 ? true : (setError(t('admin.motivo_corto')), false));

  return (
    <Pantalla titulo={t('admin.titulo')} sub={t('admin.sub')} atras="/inicio">
      <div className="cd-tabs" role="tablist">
        {[['pendientes', t('admin.tab_pendientes'), pendientes.length], ['cuidadores', t('admin.tab_cuidadores'), cuidadores.length]].map(([id, texto, n]) => (
          <button key={id} type="button" role="tab" aria-selected={pestana === id}
            className={`cd-tab${pestana === id ? ' cd-tab-activa' : ''}`} onClick={() => { setPestana(id); setAbierto(null); }}>
            {texto} <span className="cd-tab-n">{n}</span>
          </button>
        ))}
      </div>

      {aviso && <p className="cd-exito" role="status">{aviso}</p>}
      {error && <p className="cd-error" role="alert">{error}</p>}

      {pestana === 'pendientes' && (
        <div className="cd-solicitudes">
          {pendientes.length === 0 && <p className="cd-vacio">{t('admin.sin_pendientes')}</p>}
          {pendientes.map((v) => (
            <article className="cd-solic" key={v.id}>
              <header>
                <span className="cd-avatar">{iniciales(v.cuidador.nombre)}</span>
                <div>
                  <strong>{v.cuidador.nombre}</strong>
                  <small>{v.cuidador.correo}</small>
                  <small>{t('admin.enviada', { fecha: fecha(v.enviadaEn) })}</small>
                </div>
              </header>

              <div className="cd-archivos">
                {v.archivos.map((a) => (
                  <button key={a.id} type="button" className="cd-btn cd-btn-sec" onClick={() => ver(a.id)}>{t(ETIQUETA_ARCHIVO[a.tipo])}</button>
                ))}
              </div>

              {abierto?.tipo === 'rechazar' && abierto.id === v.id ? (
                <CajaMotivo etiqueta={t('admin.motivo_rechazo')} placeholder={t('admin.motivo_ph')} confirmar={t('admin.confirmar_rechazo')}
                  ocupado={ocupado} onCancelar={() => setAbierto(null)}
                  onConfirmar={(m) => motivoValido(m) && ejecutar(() => rechazarVerificacion(v.id, m), t('admin.rechazada_ok'))} />
              ) : (
                <div className="cd-acciones">
                  <button type="button" className="cd-btn cd-btn-sec" onClick={() => { setError(''); setAbierto({ tipo: 'rechazar', id: v.id }); }}>{t('admin.rechazar')}</button>
                  <button type="button" className="cd-btn cd-btn-ok" disabled={ocupado} onClick={() => ejecutar(() => aprobarVerificacion(v.id), t('admin.aprobada_ok'))}>{t('admin.aprobar')}</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {pestana === 'cuidadores' && (
        <div className="cd-solicitudes">
          {cuidadores.length === 0 && <p className="cd-vacio">{t('admin.sin_cuidadores')}</p>}
          {cuidadores.map((c) => (
            <article className="cd-solic" key={c.id}>
              <header>
                <span className="cd-avatar">{iniciales(c.nombre)}</span>
                <div>
                  <strong>{c.nombre}</strong>
                  <small>{c.correo}</small>
                </div>
                <span className={`cd-chip ${c.activo ? 'cd-chip-aprobado' : 'cd-chip-rechazado'}`}>{c.activo ? t('admin.activo') : t('admin.suspendido')}</span>
              </header>
              <div className="cd-archivos"><ChipEstado estado={c.verificacion} /></div>

              {c.activo && (abierto?.tipo === 'suspender' && abierto.id === c.id ? (
                <CajaMotivo etiqueta={t('admin.motivo_suspension')} placeholder={t('admin.motivo_suspension_ph')} confirmar={t('admin.confirmar_suspension')}
                  ocupado={ocupado} onCancelar={() => setAbierto(null)}
                  onConfirmar={(m) => motivoValido(m) && ejecutar(() => suspenderCuidador(c.id, m), t('admin.suspendido_ok'))} />
              ) : (
                <div className="cd-acciones">
                  <button type="button" className="cd-btn cd-btn-peligro" onClick={() => { setError(''); setAbierto({ tipo: 'suspender', id: c.id }); }}>{t('admin.suspender')}</button>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}
    </Pantalla>
  );
}
