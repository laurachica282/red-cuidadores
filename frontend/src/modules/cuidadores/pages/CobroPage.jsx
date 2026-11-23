import { useEffect, useState } from 'react';
import { useIdioma } from '@/modules/region';
import Desplegable from '@/shared/components/Desplegable.jsx';
import '../i18n.js';
import { DOCUMENTO_PAIS, VALIDA, limpiarNumero } from '../cobro.js';
import { IconCheck } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { guardarDatosCobro, obtenerDatosCobro } from '../services/cuidadoresService.js';

const TIPOS = ['cuenta_bancaria', 'billetera'];
const EJEMPLO = {
  cuenta: '1234567890', clabe: '012180001234567890', iban: 'ES91 2100 0418 4502 0005 1332',
  celular: '3001234567', movil: '612345678', mercadopago: '5512345678', pix: '123.456.789-09', correo: 'nombre@email.com',
};
const VACIO = { tipo: 'cuenta_bancaria', titular: '', documento: '', entidad: '', tipoCuenta: '', numero: '', parte1: '', parte2: '' };

// Datos de cobro: a dónde se le paga al cuidador (cuenta bancaria o billetera de su país).
export default function CobroPage() {
  const { t } = useIdioma();
  const [info, setInfo] = useState(null); // { pais, opciones, datos }
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => obtenerDatosCobro().then((d) => {
    setInfo(d);
    if (d.datos) {
      setForm({ ...VACIO, tipo: d.datos.tipo, titular: d.datos.titular, documento: d.datos.documento, entidad: d.datos.entidad, tipoCuenta: d.datos.tipoCuenta ?? '' });
    }
  });

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, []);

  const cambiar = (cambio) => {
    setOk(false);
    setError('');
    setForm((f) => ({ ...f, ...cambio }));
  };

  const op = info?.opciones;
  const esCuenta = form.tipo === 'cuenta_bancaria';
  const formato = esCuenta ? op?.formatoCuenta : op?.billeteras.find((b) => b.nombre === form.entidad)?.formato;
  // Con dos campos (agência y conta en Brasil; routing y cuenta en EE. UU.) el número se arma con "/".
  const dosPartes = esCuenta && (formato === 'agencia' || formato === 'routing');
  const guardado = info?.datos;
  const puedeConservar = guardado && guardado.tipo === form.tipo && guardado.entidad === form.entidad;

  const numeroEscrito = () => {
    if (!dosPartes) return limpiarNumero(form.numero, formato);
    const a = form.parte1.replace(/\s/g, '');
    const b = form.parte2.replace(/\s/g, '');
    return a || b ? `${a}/${b}` : '';
  };

  const guardar = async (e) => {
    e.preventDefault();
    setOk(false);
    const titular = form.titular.trim();
    const documento = form.documento.replace(/[\s.]/g, '');
    if (titular.length < 3) return setError(t('cobro.error.titular'));
    if (!/^[A-Za-z0-9-]{5,30}$/.test(documento)) return setError(t('cobro.error.documento'));
    if (!form.entidad) return setError(t('cobro.error.entidad'));
    if (esCuenta && !form.tipoCuenta) return setError(t('cobro.error.tipo_cuenta'));
    const numero = numeroEscrito();
    if (!(numero === '' && puedeConservar) && !VALIDA[formato]?.(numero)) return setError(t(`cobro.error.${formato}`));

    setGuardando(true);
    try {
      await guardarDatosCobro({
        tipo: form.tipo, titular, documento, entidad: form.entidad, tipoCuenta: esCuenta ? form.tipoCuenta : null, numero,
      });
      await cargar();
      setForm((f) => ({ ...f, numero: '', parte1: '', parte2: '' }));
      setOk(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const placeholderNumero = puedeConservar ? t('cobro.conservar', { numero: guardado.numero }) : EJEMPLO[formato];

  return (
    <Pantalla titulo={t('cobro.titulo')} sub={t('cobro.sub')} atras="/configuracion" pie={op && (
      <button type="submit" form="cobro-form" className="btn-primary" disabled={guardando}>
        {guardando ? t('comun.guardando') : t('cobro.guardar')}
      </button>
    )}>
      {!info && !error && <p className="cd-sub">{t('comun.cargando')}</p>}
      {info && !op && <p className="cd-caja cd-caja-neutra">{t('cobro.sin_pais')}</p>}

      {guardado && (
        <div className="cd-caja cd-caja-ok">
          <IconCheck />
          <span className="cd-caja-texto">
            <strong>{t('cobro.guardados')}</strong>
            <p>{guardado.entidad} · {guardado.tipoCuenta ? `${t(`cobro.tipo_cuenta.${guardado.tipoCuenta}`)} · ` : ''}{guardado.numero}</p>
          </span>
        </div>
      )}

      {op && (
        <form id="cobro-form" className="cd-form" onSubmit={guardar} noValidate>
          <fieldset className="cd-grupo">
            <legend className="label">{t('cobro.tipo')}</legend>
            <div className="cd-tipos">
              {TIPOS.map((tipo) => (
                <button key={tipo} type="button" aria-pressed={form.tipo === tipo}
                  className={`cd-tipo${form.tipo === tipo ? ' cd-tipo-activo' : ''}`}
                  onClick={() => form.tipo !== tipo && cambiar({ tipo, entidad: '', numero: '', parte1: '', parte2: '' })}>
                  {t(`cobro.tipo.${tipo}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="label" htmlFor="cobro-entidad">{esCuenta ? t('cobro.banco') : t('cobro.billetera')}</label>
            <Desplegable id="cobro-entidad" value={form.entidad} onChange={(e) => cambiar({ entidad: e.target.value, numero: '' })}>
              <option value="" disabled>{t('cobro.elige')}</option>
              {(esCuenta ? op.bancos : op.billeteras.map((b) => b.nombre)).map((n) => <option key={n} value={n}>{n}</option>)}
            </Desplegable>
          </div>

          {esCuenta && (
            <div>
              <label className="label" htmlFor="cobro-tipo-cuenta">{t('cobro.tipo_cuenta')}</label>
              <Desplegable id="cobro-tipo-cuenta" value={form.tipoCuenta} onChange={(e) => cambiar({ tipoCuenta: e.target.value })}>
                <option value="" disabled>{t('cobro.elige')}</option>
                <option value="ahorros">{t('cobro.tipo_cuenta.ahorros')}</option>
                <option value="corriente">{t('cobro.tipo_cuenta.corriente')}</option>
              </Desplegable>
            </div>
          )}

          {formato && dosPartes && (
            <div className="cd-cobro-partes">
              <div>
                <label className="label" htmlFor="cobro-parte1">{t(formato === 'agencia' ? 'cobro.numero.agencia' : 'cobro.numero.routing')}</label>
                <input id="cobro-parte1" className="input" inputMode="numeric" autoComplete="off"
                  placeholder={formato === 'agencia' ? '1234' : '021000021'} value={form.parte1}
                  onChange={(e) => cambiar({ parte1: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="cobro-parte2">{t(formato === 'agencia' ? 'cobro.numero.conta' : 'cobro.numero.cuenta_us')}</label>
                <input id="cobro-parte2" className="input" autoComplete="off"
                  placeholder={puedeConservar ? guardado.numero : (formato === 'agencia' ? '12345-6' : '123456789')} value={form.parte2}
                  onChange={(e) => cambiar({ parte2: e.target.value })} />
              </div>
              {puedeConservar && <p className="cd-ayuda">{t('cobro.conservar', { numero: guardado.numero })}</p>}
            </div>
          )}

          {formato && !dosPartes && (
            <div>
              <label className="label" htmlFor="cobro-numero">{t(`cobro.numero.${formato}`)}</label>
              <input id="cobro-numero" className="input" autoComplete="off"
                inputMode={['correo', 'pix', 'mercadopago', 'iban'].includes(formato) ? 'text' : 'numeric'}
                placeholder={placeholderNumero} value={form.numero}
                onChange={(e) => cambiar({ numero: e.target.value })} />
              {formato === 'pix' && <p className="cd-ayuda">{t('cobro.numero.pix_ayuda')}</p>}
            </div>
          )}

          <div>
            <label className="label" htmlFor="cobro-titular">{t('cobro.titular')}</label>
            <input id="cobro-titular" className="input" autoComplete="name" maxLength={120}
              placeholder={t('cobro.titular_ph')} value={form.titular} onChange={(e) => cambiar({ titular: e.target.value })} />
          </div>

          <div>
            <label className="label" htmlFor="cobro-documento">{t('cobro.documento')}</label>
            <input id="cobro-documento" className="input" autoComplete="off" maxLength={30}
              placeholder={DOCUMENTO_PAIS[info.pais] ?? ''} value={form.documento} onChange={(e) => cambiar({ documento: e.target.value })} />
          </div>

          {error && <p className="cd-error" role="alert">{error}</p>}
          {ok && <p className="cd-exito" role="status">{t('cobro.guardado')}</p>}
          <p className="cd-ayuda cd-centro">{t('cobro.nota')}</p>
        </form>
      )}
      {!op && error && <p className="cd-error" role="alert">{error}</p>}
    </Pantalla>
  );
}
