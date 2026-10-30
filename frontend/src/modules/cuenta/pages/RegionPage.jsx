import { useState } from 'react';
import Aviso from '../components/Aviso.jsx';
import { IconEscudo } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { guardarRegion, obtenerPerfil, obtenerRegiones, sincronizarSesion } from '../services/cuentaService.js';

const cargar = async () => {
  const [regiones, perfil] = await Promise.all([obtenerRegiones(), obtenerPerfil()]);
  return { regiones, perfil };
};

// HU-35, RN-6 y mockup 17: idioma, país y moneda. Al elegir país se propone su moneda, y se puede cambiar.
// La traducción de la interfaz (HU-34) es del módulo de región; aquí solo se guarda la elección.
function Formulario({ regiones, perfil }) {
  const [guardado, setGuardado] = useState({ idioma: perfil.idioma, pais: perfil.pais, moneda: perfil.moneda });
  const [idioma, setIdioma] = useState(perfil.idioma);
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

  const cambio = idioma !== guardado.idioma || pais !== guardado.pais || moneda !== guardado.moneda;

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    setGuardando(true);
    try {
      const r = await guardarRegion({ idioma, pais, moneda });
      setGuardado({ idioma: r.idioma, pais: r.pais, moneda: r.moneda });
      sincronizarSesion({ idioma: r.idioma, pais: r.pais, moneda: r.moneda });
      setOk('Guardamos tus preferencias');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiar = (poner) => (e) => { poner(e.target.value); setOk(''); };

  return (
    <form className="cu-form" onSubmit={guardar}>
      <p className="cu-texto">Con esto te mostramos cuidadores de tu región y los precios en tu moneda.</p>

      <div>
        <label className="label" htmlFor="idioma">Idioma</label>
        <select id="idioma" className="input" value={idioma} onChange={cambiar(setIdioma)}>
          {regiones.idiomas.map((i) => <option key={i.codigo} value={i.codigo}>{i.nombre}</option>)}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="pais">País</label>
        <select id="pais" className="input" value={pais} onChange={(e) => elegirPais(e.target.value)}>
          {regiones.paises.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="moneda">Moneda</label>
        <select id="moneda" className="input" value={moneda} onChange={cambiar(setMoneda)}>
          {regiones.monedas.map((m) => <option key={m.codigo} value={m.codigo}>{m.nombre} ({m.codigo})</option>)}
        </select>
      </div>

      <p className="cu-nota" role="note">
        <IconEscudo />
        <span>Tus reservas actuales no cambian. El nuevo país y la nueva moneda aplican a las reservas que hagas desde ahora.</span>
      </p>

      <div className="cu-acciones">
        <Aviso>{error}</Aviso>
        <Aviso tipo="ok">{ok}</Aviso>
        <button type="submit" className="btn-primary" disabled={!cambio || guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

export default function RegionPage() {
  const { datos, cargando, error } = useCarga(cargar);
  return (
    <Pantalla titulo="Idioma, país y moneda">
      {cargando && <p className="cu-cargando">Cargando…</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}
      {datos && <Formulario regiones={datos.regiones} perfil={datos.perfil} />}
    </Pantalla>
  );
}
