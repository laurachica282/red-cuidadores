import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cambiarMiPais, detectarPais, obtenerMiPais, pasarelaDePais } from '../services/pagosService.js';
import './pagos.css';

export default function PaisPage() {
  const [perfil, setPerfil] = useState(null); // { pais, idioma, moneda }
  const [pasarelaPerfil, setPasarelaPerfil] = useState(null);
  // inicio | buscando | sugerido | sin-permiso | no-soportado | error | guardado
  const [estado, setEstado] = useState('inicio');
  const [sugerencia, setSugerencia] = useState(null);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const mi = await obtenerMiPais();
        if (!vivo) return;
        setPerfil(mi);
        const p = mi?.pais ? await pasarelaDePais(mi.pais).catch(() => null) : null;
        if (vivo) setPasarelaPerfil(p);
      } catch (e) {
        if (vivo) setMensaje(e.message);
      }
    })();
    return () => { vivo = false; };
  }, []);

  function detectar() {
    if (!navigator.geolocation) {
      setEstado('sin-permiso');
      return;
    }
    setEstado('buscando');
    setMensaje('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const r = await detectarPais(coords.latitude, coords.longitude);
          setSugerencia(r);
          setEstado(r.soportado ? 'sugerido' : 'no-soportado');
        } catch (e) {
          setMensaje(e.message);
          setEstado('error');
        }
      },
      (err) => {
        if (err.code === 1) {
          setEstado('sin-permiso');
        } else {
          setMensaje('No pudimos obtener tu ubicación. Inténtalo de nuevo.');
          setEstado('error');
        }
      },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }

  async function confirmar() {
    try {
      const nuevo = await cambiarMiPais(sugerencia.pais);
      setPerfil(nuevo);
      setPasarelaPerfil(sugerencia.pasarela);
      setEstado('guardado');
    } catch (e) {
      setMensaje(e.message);
      setEstado('error');
    }
  }

  const igualAlPerfil = sugerencia && perfil?.pais === sugerencia.pais;

  return (
    <main className="pg-pagina">
      <h1 className="pg-titulo">Tu país</h1>
      <p className="pg-texto">Con tu país elegimos la pasarela de pago y la moneda.</p>

      <section className="pg-tarjeta">
        <p className="pg-etiqueta">País de tu perfil</p>
        <p className="pg-valor">{perfil?.pais ?? 'Sin definir'}</p>
        {pasarelaPerfil && (
          <p className="pg-texto">
            Pagas en {pasarelaPerfil.moneda} con {pasarelaPerfil.pasarela}.
          </p>
        )}
      </section>

      <div aria-live="polite">
        {estado === 'sugerido' && (
          <section className="pg-tarjeta pg-tarjeta--destacada">
            {igualAlPerfil ? (
              <p className="pg-valor">Ya estás en {sugerencia.nombre}. No hay nada que cambiar.</p>
            ) : (
              <>
                <p className="pg-valor">Detectamos que estás en {sugerencia.nombre}</p>
                <p className="pg-texto">
                  Pagarías en {sugerencia.pasarela.moneda} con {sugerencia.pasarela.pasarela}.
                </p>
                <button type="button" className="pg-boton" onClick={confirmar}>
                  Sí, usar {sugerencia.nombre}
                </button>
                <button type="button" className="pg-boton pg-boton--claro" onClick={() => setEstado('inicio')}>
                  No, mantener mi país
                </button>
              </>
            )}
          </section>
        )}
        {estado === 'guardado' && <p className="pg-aviso pg-aviso--ok">Listo, cambiamos tu país.</p>}
        {estado === 'sin-permiso' && (
          <p className="pg-aviso">
            No tenemos permiso de ubicación. Usaremos el país de tu perfil
            {perfil?.pais ? ` (${perfil.pais})` : ''}. Puedes cambiarlo en <Link to="/configuracion/region">configuración</Link>.
          </p>
        )}
        {estado === 'no-soportado' && (
          <p className="pg-aviso">
            Detectamos {sugerencia.nombre}, pero todavía no hay pagos disponibles allí. Seguimos con tu país actual.
          </p>
        )}
        {estado === 'error' && <p className="pg-aviso pg-aviso--error">{mensaje}</p>}
      </div>

      <button type="button" className="pg-boton" onClick={detectar} disabled={estado === 'buscando'}>
        {estado === 'buscando' ? 'Buscando…' : 'Detectar mi país'}
      </button>
    </main>
  );
}