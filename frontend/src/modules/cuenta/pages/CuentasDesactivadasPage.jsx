import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth';
import { useIdioma } from '@/modules/region';
import '../i18n.js';
import Aviso from '../components/Aviso.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { historialDeCuenta, listarCuentasDesactivadas } from '../services/cuentaService.js';
import { ETIQUETA_MOTIVO, ETIQUETA_ROL, fecha } from '../utils/textos.js';
import Desplegable from '@/shared/components/Desplegable.jsx';

// HU-41 (solo administradores). El historial no trae nombre, correo ni teléfono: las cuentas se
// identifican por número. Las reservas, pagos y reseñas siguen en los reportes porque nada se borra.
function Cuenta({ cuenta }) {
  const { t, locale, pais } = useIdioma();
  const motivo = (codigo) => (ETIQUETA_MOTIVO[codigo] ? t(ETIQUETA_MOTIVO[codigo]) : codigo);
  const [abierto, setAbierto] = useState(false);
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState('');

  const alternar = async () => {
    setAbierto(!abierto);
    if (abierto || eventos) return;
    try {
      setEventos((await historialDeCuenta(cuenta.usuario_id)).eventos);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <li className="cu-item">
      <div className="cu-item-fila">
        <p className="cu-item-titulo">{t('cuenta.admin.cuentaN', { id: cuenta.usuario_id })}</p>
        <span className="cu-etiqueta" style={{ marginTop: 0 }}>{t(cuenta.status ? 'cuenta.admin.reactivada' : 'cuenta.admin.desactivada')}</span>
      </div>
      <p className="cu-item-meta">{ETIQUETA_ROL[cuenta.rol] ? t(ETIQUETA_ROL[cuenta.rol]) : cuenta.rol} · {cuenta.pais ? pais(cuenta.pais) : ''}</p>
      {!cuenta.status && (
        <p className="cu-item-texto">{cuenta.motivo ? motivo(cuenta.motivo) : t('cuenta.admin.sinMotivo')} · {fecha(cuenta.desactivado_en, locale)}</p>
      )}
      <p className="cu-item-meta">
        {t(cuenta.desactivaciones === 1 ? 'cuenta.admin.desactivacion.uno' : 'cuenta.admin.desactivacion.varios', { n: cuenta.desactivaciones })}
        {' · '}
        {t(cuenta.reactivaciones === 1 ? 'cuenta.admin.reactivacion.uno' : 'cuenta.admin.reactivacion.varios', { n: cuenta.reactivaciones })}
      </p>
      <button type="button" className="cu-btn cu-btn-texto cu-btn-chico" style={{ alignSelf: 'flex-start' }}
        aria-expanded={abierto} onClick={alternar}>
        {t(abierto ? 'cuenta.admin.ocultarHistorial' : 'cuenta.admin.verHistorial')}
      </button>
      {abierto && (
        <>
          <Aviso>{error}</Aviso>
          {eventos && (
            <ul className="cu-eventos">
              {eventos.map((e) => (
                <li key={e.id}>
                  <strong>{t(e.evento === 'desactivada' ? 'cuenta.admin.desactivada' : 'cuenta.admin.reactivada')}</strong>
                  {' '}{t(e.origen === 'admin' ? 'cuenta.admin.porAdmin' : 'cuenta.admin.porUsuario')} · {fecha(e.creado_en, locale)}
                  {e.motivo && <><br />{motivo(e.motivo)}</>}
                  {e.detalle && <><br /><em>“{e.detalle}”</em></>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}

export default function CuentasDesactivadasPage() {
  const { usuario } = useAuth();
  const { t } = useIdioma();
  const [filtros, setFiltros] = useState({ pagina: 1, rol: '', estado: '' });
  const [respuesta, setRespuesta] = useState(null);
  const esAdmin = usuario.rol === 'admin';
  const clave = JSON.stringify(filtros);

  useEffect(() => {
    if (!esAdmin) return undefined;
    let vigente = true;
    listarCuentasDesactivadas(filtros)
      .then((datos) => { if (vigente) setRespuesta({ clave, datos }); })
      .catch((e) => { if (vigente) setRespuesta((r) => ({ ...r, clave, error: e.message })); });
    return () => { vigente = false; };
  }, [clave, esAdmin]); // eslint-disable-line

  // Mientras llega una página nueva se sigue mostrando la anterior (aria-busy), sin parpadeo.
  const cargando = !respuesta || respuesta.clave !== clave;
  const datos = respuesta?.datos ?? null;
  const error = respuesta?.clave === clave ? (respuesta.error ?? '') : '';

  const filtrar = (campo) => (e) => setFiltros({ ...filtros, [campo]: e.target.value, pagina: 1 });
  const paginas = datos ? Math.max(1, Math.ceil(datos.total / datos.tamano)) : 1;

  if (!esAdmin) {
    return (
      <Pantalla titulo={t('cuenta.menu.cuentasDesactivadas')}>
        <Aviso>{t('cuenta.admin.soloAdmins')}</Aviso>
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo={t('cuenta.menu.cuentasDesactivadas')}>
      <p className="cu-texto">{t('cuenta.admin.intro')}</p>

      {datos && (
        <div className="cu-resumen">
          <div className="cu-dato"><strong>{datos.resumen.desactivadas}</strong><span>{t('cuenta.admin.desactivadas')}</span></div>
          <div className="cu-dato"><strong>{datos.resumen.reactivadas}</strong><span>{t('cuenta.admin.reactivadas')}</span></div>
        </div>
      )}

      <div className="cu-fila">
        <div>
          <label className="label" htmlFor="filtro-estado">{t('cuenta.admin.estado')}</label>
          <Desplegable id="filtro-estado" className="input" value={filtros.estado} onChange={filtrar('estado')}>
            <option value="">{t('cuenta.admin.todas')}</option>
            <option value="desactivada">{t('cuenta.admin.desactivadas')}</option>
            <option value="reactivada">{t('cuenta.admin.reactivadas')}</option>
          </Desplegable>
        </div>
        <div>
          <label className="label" htmlFor="filtro-rol">{t('cuenta.admin.tipoCuenta')}</label>
          <Desplegable id="filtro-rol" className="input" value={filtros.rol} onChange={filtrar('rol')}>
            <option value="">{t('cuenta.admin.todos')}</option>
            <option value="viajero">{t('cuenta.admin.viajeros')}</option>
            <option value="cuidador">{t('cuenta.admin.cuidadores')}</option>
            <option value="admin">{t('cuenta.admin.administradores')}</option>
          </Desplegable>
        </div>
      </div>

      <Aviso>{error}</Aviso>
      {cargando && !datos && <p className="cu-cargando">{t('cuenta.cargando')}</p>}
      {datos && datos.cuentas.length === 0 && <p className="cu-vacio">{t('cuenta.admin.sinCuentas')}</p>}
      {datos && datos.cuentas.length > 0 && (
        <ul className="cu-lista" aria-busy={cargando}>
          {datos.cuentas.map((c) => <Cuenta key={c.usuario_id} cuenta={c} />)}
        </ul>
      )}

      {datos && paginas > 1 && (
        <nav className="cu-paginas" aria-label={t('cuenta.admin.paginacion')}>
          <button type="button" className="cu-btn cu-btn-chico" disabled={filtros.pagina <= 1}
            onClick={() => setFiltros({ ...filtros, pagina: filtros.pagina - 1 })}>{t('cuenta.admin.anterior')}</button>
          <span>{t('cuenta.admin.pagina', { n: filtros.pagina, total: paginas })}</span>
          <button type="button" className="cu-btn cu-btn-chico" disabled={filtros.pagina >= paginas}
            onClick={() => setFiltros({ ...filtros, pagina: filtros.pagina + 1 })}>{t('cuenta.admin.siguiente')}</button>
        </nav>
      )}
    </Pantalla>
  );
}
