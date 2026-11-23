import { useEffect, useMemo, useState } from 'react';
import { useIdioma } from '@/modules/region';
import { cargarAgenda, isoLocal, serviciosDelDia } from '../agenda.js';
import ServicioAgenda from '../components/ServicioAgenda.jsx';
import { IconChevron } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { diasNoDisponibles, marcarNoDisponible, quitarNoDisponible } from '../services/cuidadoresService.js';
import '../i18n.js';
import '../tablero.css';

// Reservas que impiden marcar un día como no disponible.
const OCUPAN = new Set(['confirmada', 'en_curso']);
const ultimoDelMes = (anio, mes) => isoLocal(new Date(anio, mes + 1, 0, 12));

const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Semanas del mes (lunes primero) como fechas ISO; null para los huecos antes del día 1 y después del último.
function semanasDelMes(anio, mes) {
  const primero = new Date(anio, mes, 1, 12);
  const huecos = (primero.getDay() + 6) % 7;
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const celdas = [...Array(huecos).fill(null)];
  for (let d = 1; d <= diasMes; d += 1) celdas.push(isoLocal(new Date(anio, mes, d, 12)));
  while (celdas.length % 7) celdas.push(null);
  return Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7));
}

// Calendario del cuidador: cada día con sus servicios; al tocar un día se ven abajo.
export default function AgendaCuidadorPage() {
  const { t, locale } = useIdioma();
  const [agenda, setAgenda] = useState(null);
  const [error, setError] = useState('');
  const [mes, setMes] = useState(null);
  const [elegido, setElegido] = useState(null);
  // Días que el cuidador marcó como no disponibles (del mes que se ve).
  const [noDisp, setNoDisp] = useState(() => new Set());
  const [cambiando, setCambiando] = useState(false);
  const [errorDia, setErrorDia] = useState('');

  useEffect(() => {
    let vivo = true;
    cargarAgenda()
      .then((a) => {
        if (!vivo) return;
        setAgenda(a);
        const [y, m] = a.hoy.split('-').map(Number);
        setMes({ anio: y, mes: m - 1 });
        setElegido(a.hoy);
      })
      .catch((e) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!mes) return undefined;
    let vivo = true;
    const desde = isoLocal(new Date(mes.anio, mes.mes, 1, 12));
    diasNoDisponibles(desde, ultimoDelMes(mes.anio, mes.mes))
      .then((r) => vivo && setNoDisp(new Set(r.dias)))
      .catch(() => {});
    return () => { vivo = false; };
  }, [mes]);

  const semanas = useMemo(() => (mes ? semanasDelMes(mes.anio, mes.mes) : []), [mes]);
  const nombresDias = useMemo(() => Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i, 12).toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').slice(0, 3)), [locale]);

  const cambiarMes = (paso) => setMes(({ anio, mes: m }) => {
    const d = new Date(anio, m + paso, 1);
    return { anio: d.getFullYear(), mes: d.getMonth() };
  });

  const delDia = agenda && elegido ? serviciosDelDia(agenda.items, elegido) : [];
  const elegidoNoDisp = noDisp.has(elegido);
  const editable = agenda && elegido >= agenda.hoy;
  const ocupado = delDia.some(({ s }) => OCUPAN.has(s.estado));

  const elegir = (dia) => {
    setElegido(dia);
    setErrorDia('');
  };

  // Marca o desmarca el día elegido.
  const alternarDisponible = async () => {
    const dia = elegido;
    const marcar = !noDisp.has(dia);
    setCambiando(true);
    setErrorDia('');
    try {
      await (marcar ? marcarNoDisponible(dia) : quitarNoDisponible(dia));
      setNoDisp((prev) => {
        const nuevo = new Set(prev);
        if (marcar) nuevo.add(dia); else nuevo.delete(dia);
        return nuevo;
      });
    } catch (e) {
      setErrorDia(e.status === 409 ? t('agenda.no_disp_ocupado') : e.message);
    } finally {
      setCambiando(false);
    }
  };
  const titulo = mes ? new Date(mes.anio, mes.mes, 1, 12).toLocaleDateString(locale, { month: 'long', year: 'numeric' }) : '';

  return (
    <Pantalla titulo={t('agenda.titulo')} atras="/cuidador">
      {error && <p className="cd-error" role="alert">{error}</p>}
      {!agenda && !error && <p className="cd-sub">{t('comun.cargando')}</p>}

      {agenda && mes && (
        <>
          <div className="ag-calendario">
            <div className="ag-mes">
              <button type="button" className="ag-flecha ag-flecha--atras" onClick={() => cambiarMes(-1)} aria-label={t('agenda.mes_anterior')}>
                <IconChevron />
              </button>
              <strong>{mayuscula(titulo)}</strong>
              <button type="button" className="ag-flecha" onClick={() => cambiarMes(1)} aria-label={t('agenda.mes_siguiente')}>
                <IconChevron />
              </button>
            </div>

            <div className="ag-grilla" role="grid" aria-label={titulo}>
              {nombresDias.map((n, i) => <span key={i} className="ag-dia-semana" aria-hidden="true">{n}</span>)}
              {semanas.flat().map((dia, i) => {
                if (!dia) return <span key={`v${i}`} />;
                const servicios = serviciosDelDia(agenda.items, dia);
                const activos = servicios.filter(({ s }) => s.estado !== 'completada').length;
                const clases = [
                  'ag-dia',
                  dia === agenda.hoy && 'ag-dia--hoy',
                  dia === elegido && 'ag-dia--elegido',
                  dia < agenda.hoy && 'ag-dia--pasado',
                  noDisp.has(dia) && 'ag-dia--no-disp',
                ].filter(Boolean).join(' ');
                return (
                  <button key={dia} type="button" className={clases} onClick={() => elegir(dia)}
                    aria-pressed={dia === elegido}
                    aria-label={`${new Date(`${dia}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long' })}: ${t('agenda.n_servicios', { n: servicios.length })}${noDisp.has(dia) ? ` · ${t('agenda.no_disponible')}` : ''}`}>
                    <span>{Number(dia.slice(8))}</span>
                    {servicios.length > 0 && (
                      <span className={`ag-marca${activos ? '' : ' ag-marca--pasada'}`}>{servicios.length}</span>
                    )}
                    {servicios.length === 0 && noDisp.has(dia) && <span className="ag-marca-no-disp" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            <div className="ag-leyenda" aria-hidden="true">
              <span><i className="ag-leyenda-servicios" /> {t('agenda.leyenda_servicios')}</span>
              <span><i className="ag-leyenda-no-disp" /> {t('agenda.leyenda_no_disp')}</span>
            </div>
          </div>

          <section className="tb-seccion">
            <div className="tb-titulo">
              <h2>
                {mayuscula(new Date(`${elegido}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }))}
                {delDia.length > 0 && <span className="tb-contador">{delDia.length}</span>}
              </h2>
              {elegidoNoDisp && <span className="ag-chip-no-disp">{t('agenda.no_disponible')}</span>}
            </div>

            {editable && (
              <div className={`ag-disponible${elegidoNoDisp ? ' ag-disponible--off' : ''}`}>
                <p>{elegidoNoDisp ? t('agenda.dia_no_disp') : (ocupado ? t('agenda.no_disp_ocupado') : t('agenda.no_disp_ayuda'))}</p>
                <button type="button" className={`tb-boton${elegidoNoDisp ? ' tb-boton--primario' : ''}`}
                  disabled={cambiando || (!elegidoNoDisp && ocupado)} onClick={alternarDisponible}>
                  {cambiando ? t('comun.guardando') : t(elegidoNoDisp ? 'agenda.volver_disp' : 'agenda.marcar_no_disp')}
                </button>
                {errorDia && <p className="cd-error" role="alert">{errorDia}</p>}
              </div>
            )}

            {delDia.length === 0 && !elegidoNoDisp && <p className="tb-vacio">{t('agenda.dia_libre')}</p>}
            <div className="tb-servicios">
              {delDia.map(({ s, momento }) => <ServicioAgenda key={s.id} s={s} momento={momento} />)}
            </div>
          </section>
        </>
      )}
    </Pantalla>
  );
}
