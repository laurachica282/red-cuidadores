import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIdioma } from '@/modules/region';
import { cambiarMiPais, detectarPais, obtenerMiPais, pasarelaDePais } from '../services/pagosService.js';
import '../i18n.js';
import './pagos.css';

// Nombre comercial de cada pasarela guardada en pasarelas_pais (ej. 'wompi_simulada').
const MARCAS = {
  wompi: 'Wompi', mercadopago: 'Mercado Pago', webpay: 'Webpay', culqi: 'Culqi',
  pagseguro: 'PagSeguro', stripe: 'Stripe', redsys: 'Redsys',
};

export default function PaisPage() {
  const { t, pais: nombrePais } = useIdioma();
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
          // Se guarda la clave para que el aviso siga al idioma si se cambia mientras se muestra.
          setMensaje('pagos.sin_ubicacion');
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

  // 'wompi_simulada' -> 'Wompi (simulada)'; si no se conoce, se muestra tal cual.
  const nombrePasarela = (codigo) => {
    const [base, sufijo] = String(codigo ?? '').split('_');
    const marca = MARCAS[base] ?? base;
    return sufijo === 'simulada' ? t('pagos.pasarela_simulada', { nombre: marca }) : marca;
  };
  // El nombre del país sale del código ISO en el idioma de la persona (no del que manda el servidor).
  const paisDe = (s) => (s?.pais ? nombrePais(s.pais) : s?.nombre);
  const igualAlPerfil = sugerencia && perfil?.pais === sugerencia.pais;

  return (
    <main className="pg-pagina">
      <h1 className="pg-titulo">{t('pagos.tu_pais')}</h1>
      <p className="pg-texto">{t('pagos.tu_pais_intro')}</p>

      <section className="pg-tarjeta">
        <p className="pg-etiqueta">{t('pagos.pais_perfil')}</p>
        <p className="pg-valor">{perfil?.pais ? nombrePais(perfil.pais) : t('pagos.sin_definir')}</p>
        {pasarelaPerfil && (
          <p className="pg-texto">
            {t('pagos.pagas_en', { moneda: pasarelaPerfil.moneda, pasarela: nombrePasarela(pasarelaPerfil.pasarela) })}
          </p>
        )}
      </section>

      <div aria-live="polite">
        {estado === 'sugerido' && (
          <section className="pg-tarjeta pg-tarjeta--destacada">
            {igualAlPerfil ? (
              <p className="pg-valor">{t('pagos.ya_estas_en', { pais: paisDe(sugerencia) })}</p>
            ) : (
              <>
                <p className="pg-valor">{t('pagos.detectamos', { pais: paisDe(sugerencia) })}</p>
                <p className="pg-texto">
                  {t('pagos.pagarias_en', {
                    moneda: sugerencia.pasarela.moneda, pasarela: nombrePasarela(sugerencia.pasarela.pasarela),
                  })}
                </p>
                <button type="button" className="pg-boton" onClick={confirmar}>
                  {t('pagos.si_usar', { pais: paisDe(sugerencia) })}
                </button>
                <button type="button" className="pg-boton pg-boton--claro" onClick={() => setEstado('inicio')}>
                  {t('pagos.no_mantener')}
                </button>
              </>
            )}
          </section>
        )}
        {estado === 'guardado' && <p className="pg-aviso pg-aviso--ok">{t('pagos.pais_cambiado')}</p>}
        {estado === 'sin-permiso' && (
          <p className="pg-aviso">
            {t('pagos.sin_permiso', { pais: perfil?.pais ? ` (${nombrePais(perfil.pais)})` : '' })}{' '}
            <Link to="/configuracion/region">{t('pagos.configuracion')}</Link>.
          </p>
        )}
        {estado === 'no-soportado' && (
          <p className="pg-aviso">{t('pagos.no_soportado', { pais: paisDe(sugerencia) })}</p>
        )}
        {estado === 'error' && (
          <p className="pg-aviso pg-aviso--error">{mensaje.startsWith('pagos.') ? t(mensaje) : mensaje}</p>
        )}
      </div>

      <button type="button" className="pg-boton" onClick={detectar} disabled={estado === 'buscando'}>
        {estado === 'buscando' ? t('pagos.buscando') : t('pagos.detectar')}
      </button>
    </main>
  );
}
