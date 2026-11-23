import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useIdioma } from '@/modules/region';
import { obtenerMiPais, pagarReserva, pasarelaDePais, reservaPorId } from '../services/pagosService.js';
import '../i18n.js';
import './pagos.css';
import Desplegable from '@/shared/components/Desplegable.jsx';

const formatoNumero = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatoVence = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

// Lo que pide cada método de pago (simulado) y la regla de prueba para ver un rechazo.
// Los textos se guardan como claves 'pagos.*'; `nombre` sin clave es nombre propio (marca) y no se traduce.
const METODOS = {
  tarjeta: { claveNombre: 'pagos.metodo.tarjeta' },
  paypal: { nombre: 'PayPal', etiqueta: 'pagos.paypal.etiqueta', placeholder: 'pagos.paypal.placeholder', ayuda: 'pagos.paypal.ayuda' },
  pse: {
    nombre: 'PSE',
    etiqueta: 'pagos.pse.etiqueta',
    opciones: [
      ['bancolombia', 'Bancolombia'],
      ['davivienda', 'Davivienda'],
      ['bbva', 'BBVA'],
      ['bogota', 'Banco de Bogotá'],
      ['sin_fondos', null], // banco de prueba: su nombre se traduce
    ],
    ayuda: 'pagos.pse.ayuda',
  },
  nequi: { nombre: 'Nequi', etiqueta: 'pagos.nequi.etiqueta', placeholder: '3101234567', digitos: 10, ayuda: 'pagos.nequi.ayuda' },
  spei: { nombre: 'SPEI', etiqueta: 'pagos.spei.etiqueta', placeholder: '012345678901234567', digitos: 18, ayuda: 'pagos.spei.ayuda' },
  oxxo: { nombre: 'OXXO', etiqueta: 'pagos.oxxo.etiqueta', placeholder: 'pagos.oxxo.placeholder', ayuda: 'pagos.oxxo.ayuda' },
  bizum: { nombre: 'Bizum', etiqueta: 'pagos.bizum.etiqueta', placeholder: '612345678', digitos: 9, ayuda: 'pagos.bizum.ayuda' },
  pix: { nombre: 'Pix', etiqueta: 'pagos.pix.etiqueta', placeholder: '12345678901', digitos: 11, ayuda: 'pagos.pix.ayuda' },
};

// El detalle lo arma el servidor en español (pagos/metodos.js); se traducen solo las partes que no son marcas.
function textoDetalle(t, detalle) {
  if (typeof detalle !== 'string') return detalle;
  const tarjeta = /^Tarjeta ••••(\d{4})$/.exec(detalle);
  if (tarjeta) return t('pagos.detalle.tarjeta', { ultimos: tarjeta[1] });
  if (detalle === 'OXXO · pago en efectivo') return t('pagos.detalle.oxxo');
  return detalle.replace('Banco de prueba (sin fondos)', t('pagos.banco_prueba'));
}

export default function PagarPage() {
  const { t, locale, precio } = useIdioma();
  const { id } = useParams();
  const [reserva, setReserva] = useState(null);
  const [metodos, setMetodos] = useState([]); // métodos que ofrece el país del viajero
  const [metodo, setMetodo] = useState('tarjeta');
  const [numero, setNumero] = useState('');
  const [vence, setVence] = useState('');
  const [cvv, setCvv] = useState('');
  const [dato, setDato] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pago, setPago] = useState(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [r, mi] = await Promise.all([reservaPorId(id), obtenerMiPais()]);
        const pasarela = await pasarelaDePais(mi.pais);
        if (!vivo) return;
        const lista = (pasarela.metodos ?? ['tarjeta']).filter((m) => METODOS[m]);
        setReserva(r);
        setMetodos(lista);
        setMetodo(lista[0] ?? 'tarjeta');
      } catch (e) {
        if (vivo) setError(e.message);
      }
    })();
    return () => { vivo = false; };
  }, [id]);

  function elegir(m) {
    setMetodo(m);
    setDato('');
    setError('');
  }

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const cuerpo = metodo === 'tarjeta' ? { metodo, numero, vence, cvv } : { metodo, dato };
      setPago(await pagarReserva(id, cuerpo));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const nombreMetodo = (k) => (METODOS[k].claveNombre ? t(METODOS[k].claveNombre) : METODOS[k].nombre);
  // Las claves 'pagos.*' se traducen; lo demás (números de ejemplo) se muestra tal cual.
  const textoCampo = (v) => (v?.startsWith('pagos.') ? t(v) : v);
  const fecha = (v) => new Date(`${String(v).slice(0, 10)}T12:00:00`)
    .toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  if (pago) {
    return (
      <main className="pg-pagina">
        <h1 className="pg-titulo">{t('pagos.pago_recibido')}</h1>
        <p className="pg-aviso pg-aviso--ok">
          {t('pagos.pagaste', { monto: precio(pago.monto, pago.moneda.trim()), detalle: textoDetalle(t, pago.detalle) })}
        </p>
        <p className="pg-texto">{t('pagos.referencia')} <strong>{pago.referencia}</strong></p>
        <Link className="pg-boton" to="/reservas">{t('pagos.ir_reservas')}</Link>
      </main>
    );
  }

  const moneda = reserva?.moneda?.trim();
  const pagable = reserva?.estado === 'confirmada';
  const m = METODOS[metodo];
  const textoEstado = (e) => {
    const texto = t(`pagos.estado.${e}`);
    return texto === `pagos.estado.${e}` ? e : texto;
  };

  return (
    <main className="pg-pagina">
      <h1 className="pg-titulo">{t('pagos.pagar_reserva')}</h1>
      {error && !pagable && <p className="pg-aviso pg-aviso--error" role="alert">{error}</p>}

      {reserva && (
        <div className="pg-tarjeta">
          <p className="pg-texto">
            {/* Los nombres van en negrita: se deja la marca {cuidador}/{mascota} y se reemplaza por <strong>. */}
            {t('pagos.cuidara_a', { cuidador: '{cuidador}', mascota: '{mascota}' }).split(/(\{cuidador\}|\{mascota\})/).map((parte) => {
              if (parte === '{cuidador}') return <strong key="cuidador">{reserva.cuidador}</strong>;
              if (parte === '{mascota}') return <strong key="mascota">{reserva.mascota}</strong>;
              return parte;
            })}
          </p>
          <p className="pg-texto">{fecha(reserva.fecha_inicio)} → {fecha(reserva.fecha_fin)}</p>
          <p className="pg-valor">{precio(reserva.total, moneda)}</p>
        </div>
      )}

      {reserva && !pagable && (
        <p className="pg-aviso pg-aviso--error">{t('pagos.no_pagable', { estado: textoEstado(reserva.estado) })}</p>
      )}

      {pagable && (
        <form className="pg-form" onSubmit={enviar}>
          <p className="pg-texto"><strong>{t('pagos.como_pagar')}</strong></p>
          <div className="pg-metodos" role="group" aria-label={t('pagos.metodo_pago')}>
            {metodos.map((k) => (
              <button key={k} type="button" aria-pressed={metodo === k}
                className={`pg-metodo${metodo === k ? ' pg-metodo--activo' : ''}`} onClick={() => elegir(k)}>
                {nombreMetodo(k)}
              </button>
            ))}
          </div>

          {metodo === 'tarjeta' ? (
            <>
              <label className="label" htmlFor="numero">{t('pagos.numero_tarjeta')}</label>
              <input id="numero" className="input" inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242"
                value={numero} onChange={(e) => setNumero(formatoNumero(e.target.value))} />
              <div className="pg-fila">
                <div>
                  <label className="label" htmlFor="vence">{t('pagos.vence')}</label>
                  <input id="vence" className="input" inputMode="numeric" autoComplete="off" placeholder={t('pagos.vence_formato')}
                    value={vence} onChange={(e) => setVence(formatoVence(e.target.value))} />
                </div>
                <div>
                  <label className="label" htmlFor="cvv">{t('pagos.codigo')}</label>
                  <input id="cvv" className="input" inputMode="numeric" autoComplete="off" placeholder="123" maxLength={4}
                    value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>
              <p className="pg-nota">{t('pagos.tarjetas_prueba')}</p>
            </>
          ) : (
            <>
              <label className="label" htmlFor="dato">{t(m.etiqueta)}</label>
              {m.opciones ? (
                <Desplegable id="dato" className="input" value={dato} onChange={(e) => setDato(e.target.value)}>
                  <option value="">{t('pagos.elige_banco')}</option>
                  {m.opciones.map(([valor, texto]) => (
                    <option key={valor} value={valor}>{texto ?? t('pagos.banco_prueba')}</option>
                  ))}
                </Desplegable>
              ) : (
                <input id="dato" className="input" autoComplete="off" placeholder={textoCampo(m.placeholder)}
                  inputMode={m.digitos ? 'numeric' : undefined} value={dato}
                  onChange={(e) => setDato(m.digitos ? e.target.value.replace(/\D/g, '').slice(0, m.digitos) : e.target.value)} />
              )}
              <p className="pg-nota">{t(m.ayuda, { banco: t('pagos.banco_prueba') })}</p>
            </>
          )}

          {error && <p className="pg-aviso pg-aviso--error" role="alert">{error}</p>}
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? t('pagos.procesando') : t('pagos.pagar', { monto: precio(reserva.total, moneda) })}
          </button>
          <p className="pg-nota">{t('pagos.simulado')}</p>
        </form>
      )}
      <Link className="pg-boton pg-boton--claro" to="/reservas">{t('pagos.volver')}</Link>
    </main>
  );
}
