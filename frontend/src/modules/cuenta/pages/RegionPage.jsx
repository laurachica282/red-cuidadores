import { useState } from 'react';
import Aviso from '../components/Aviso.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { guardarRegion, obtenerPerfil, obtenerRegiones, sincronizarSesion } from '../services/cuentaService.js';
import { formatearPrecio } from '../utils/moneda.js';

const cargar = async () => {
  const [regiones, perfil] = await Promise.all([obtenerRegiones(), obtenerPerfil()]);
  return { regiones, perfil };
};

// HU-35 y RN-6: país y moneda. Al elegir país se propone su moneda, y se puede cambiar.
function Formulario({ regiones, perfil }) {
  const [guardado, setGuardado] = useState({ pais: perfil.pais, moneda: perfil.moneda });
  const [pais, setPais] = useState(perfil.pais);
  const [moneda, setMoneda] = useState(perfil.moneda);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [guardando, setGuardando] = useState(false);

  const elegirPais = (codigo) => {
    setPais(codigo);
    setMoneda(regiones.paises.find((p) => p.codigo === codigo)?.moneda ?? moneda);
    setOk('');
  };

  const cambio = pais !== guardado.pais || moneda !== guardado.moneda;

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    setGuardando(true);
    try {
      const r = await guardarRegion({ pais, moneda });
      setGuardado({ pais: r.pais, moneda: r.moneda });
      sincronizarSesion({ pais: r.pais, moneda: r.moneda });
      setOk('Guardamos tu país y tu moneda');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="cu-form" onSubmit={guardar}>
      <div>
        <label className="label" htmlFor="pais">País</label>
        <select id="pais" className="input" value={pais} onChange={(e) => elegirPais(e.target.value)}>
          {regiones.paises.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="moneda">Moneda</label>
        <select id="moneda" className="input" value={moneda} onChange={(e) => { setMoneda(e.target.value); setOk(''); }}>
          {regiones.monedas.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="cu-tarjeta cu-tarjeta-suave" aria-live="polite">
        <p className="cu-item-meta">Así verás los precios</p>
        <p className="cu-item-titulo">{formatearPrecio(85000, moneda)}<span className="cu-item-meta"> / noche</span></p>
      </div>

      <Aviso tipo="info">El cambio de país o de moneda aplica solo a las reservas nuevas. Las que ya hiciste conservan su moneda.</Aviso>
      <Aviso>{error}</Aviso>
      <Aviso tipo="ok">{ok}</Aviso>

      <button type="submit" className="btn-primary" disabled={!cambio || guardando}>
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  );
}

export default function RegionPage() {
  const { datos, cargando, error } = useCarga(cargar);
  return (
    <Pantalla titulo="País y moneda">
      {cargando && <p className="cu-cargando">Cargando…</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}
      {datos && <Formulario regiones={datos.regiones} perfil={datos.perfil} />}
    </Pantalla>
  );
}
