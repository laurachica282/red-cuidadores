import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth';
import Aviso from '../components/Aviso.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { historialDeCuenta, listarCuentasDesactivadas } from '../services/cuentaService.js';
import { ETIQUETA_MOTIVO, ETIQUETA_ROL, fecha } from '../utils/textos.js';

// HU-41 (solo administradores). El historial no trae nombre, correo ni teléfono: las cuentas se
// identifican por número. Las reservas, pagos y reseñas siguen en los reportes porque nada se borra.
function Cuenta({ cuenta }) {
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
        <p className="cu-item-titulo">Cuenta #{cuenta.usuario_id}</p>
        <span className="cu-etiqueta" style={{ marginTop: 0 }}>{cuenta.status ? 'Reactivada' : 'Desactivada'}</span>
      </div>
      <p className="cu-item-meta">{ETIQUETA_ROL[cuenta.rol]} · {cuenta.pais}</p>
      {!cuenta.status && (
        <p className="cu-item-texto">{ETIQUETA_MOTIVO[cuenta.motivo] ?? cuenta.motivo ?? 'Sin motivo'} · {fecha(cuenta.desactivado_en)}</p>
      )}
      <p className="cu-item-meta">
        {cuenta.desactivaciones} {cuenta.desactivaciones === 1 ? 'desactivación' : 'desactivaciones'} · {cuenta.reactivaciones} {cuenta.reactivaciones === 1 ? 'reactivación' : 'reactivaciones'}
      </p>
      <button type="button" className="cu-btn cu-btn-texto cu-btn-chico" style={{ alignSelf: 'flex-start' }}
        aria-expanded={abierto} onClick={alternar}>
        {abierto ? 'Ocultar historial' : 'Ver historial'}
      </button>
      {abierto && (
        <>
          <Aviso>{error}</Aviso>
          {eventos && (
            <ul className="cu-eventos">
              {eventos.map((e) => (
                <li key={e.id}>
                  <strong>{e.evento === 'desactivada' ? 'Desactivada' : 'Reactivada'}</strong>
                  {' '}por {e.origen === 'admin' ? 'un administrador' : 'el usuario'} · {fecha(e.creado_en)}
                  {e.motivo && <><br />{ETIQUETA_MOTIVO[e.motivo] ?? e.motivo}</>}
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
      <Pantalla titulo="Cuentas desactivadas">
        <Aviso>Esta pantalla es solo para administradores.</Aviso>
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo="Cuentas desactivadas">
      <p className="cu-texto">Historial sin datos personales. Las reservas, pagos y reseñas de estas cuentas siguen en los reportes.</p>

      {datos && (
        <div className="cu-resumen">
          <div className="cu-dato"><strong>{datos.resumen.desactivadas}</strong><span>Desactivadas</span></div>
          <div className="cu-dato"><strong>{datos.resumen.reactivadas}</strong><span>Reactivadas</span></div>
        </div>
      )}

      <div className="cu-fila">
        <div>
          <label className="label" htmlFor="filtro-estado">Estado</label>
          <select id="filtro-estado" className="input" value={filtros.estado} onChange={filtrar('estado')}>
            <option value="">Todas</option>
            <option value="desactivada">Desactivadas</option>
            <option value="reactivada">Reactivadas</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="filtro-rol">Tipo de cuenta</label>
          <select id="filtro-rol" className="input" value={filtros.rol} onChange={filtrar('rol')}>
            <option value="">Todos</option>
            <option value="viajero">Viajeros</option>
            <option value="cuidador">Cuidadores</option>
            <option value="admin">Administradores</option>
          </select>
        </div>
      </div>

      <Aviso>{error}</Aviso>
      {cargando && !datos && <p className="cu-cargando">Cargando…</p>}
      {datos && datos.cuentas.length === 0 && <p className="cu-vacio">No hay cuentas con estos filtros.</p>}
      {datos && datos.cuentas.length > 0 && (
        <ul className="cu-lista" aria-busy={cargando}>
          {datos.cuentas.map((c) => <Cuenta key={c.usuario_id} cuenta={c} />)}
        </ul>
      )}

      {datos && paginas > 1 && (
        <nav className="cu-paginas" aria-label="Paginación">
          <button type="button" className="cu-btn cu-btn-chico" disabled={filtros.pagina <= 1}
            onClick={() => setFiltros({ ...filtros, pagina: filtros.pagina - 1 })}>Anterior</button>
          <span>Página {filtros.pagina} de {paginas}</span>
          <button type="button" className="cu-btn cu-btn-chico" disabled={filtros.pagina >= paginas}
            onClick={() => setFiltros({ ...filtros, pagina: filtros.pagina + 1 })}>Siguiente</button>
        </nav>
      )}
    </Pantalla>
  );
}
