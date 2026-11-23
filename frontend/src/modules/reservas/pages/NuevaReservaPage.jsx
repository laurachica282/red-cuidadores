import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useIdioma } from '@/modules/region';
import { crearReserva, misMascotas, obtenerCuidador } from '../services/reservasService.js';
import {
  HORAS, SERVICIOS, dias, esPorHora, fechaHora, horasEntre, hoyISO, nombreServicio, precio, textoEspecie, textoUnidad,
} from '../utils.js';
import { IconPata } from '@/shared/components/Icons.jsx';
import '../i18n.js';
import './reservas.css';
import Desplegable from '@/shared/components/Desplegable.jsx';

// Si el cuidador no marcó especies, se entiende que recibe todas (igual que el servidor).
const aceptaEspecie = (cuidador, especie) => {
  const tipos = cuidador?.tiposMascota ?? [];
  return tipos.length === 0 || tipos.includes(especie);
};

export default function NuevaReservaPage() {
  const { t } = useIdioma();
  const { cuidadorId } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [cuidador, setCuidador] = useState(null);
  const [mascotas, setMascotas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [creada, setCreada] = useState(null);
  const [form, setForm] = useState({
    servicio: params.get('servicio') ?? '',
    mascota_ids: [],
    fecha_inicio: params.get('desde') ?? '',
    fecha_fin: params.get('hasta') ?? '',
    hora_inicio: params.get('horaDesde') ?? '',
    hora_fin: params.get('horaHasta') ?? '',
    nota: '',
  });

  useEffect(() => {
    let vivo = true;
    Promise.all([obtenerCuidador(cuidadorId), misMascotas()])
      .then(([c, m]) => {
        if (!vivo) return;
        setCuidador(c);
        setMascotas(m);
        setForm((f) => ({
          ...f,
          servicio: c.servicios.some((s) => s.servicio === f.servicio) ? f.servicio : (c.servicios[0]?.servicio ?? ''),
          // Se marca la primera mascota que el cuidador recibe; el viajero puede sumar más.
          mascota_ids: (() => {
            const primera = m.find((x) => aceptaEspecie(c, x.especie));
            return primera ? [primera.id] : [];
          })(),
        }));
      })
      .catch((e) => vivo && setError(e.message))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [cuidadorId]);

  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const marcarMascota = (id) => (e) => setForm((f) => ({
    ...f,
    mascota_ids: e.target.checked ? [...f.mascota_ids, id] : f.mascota_ids.filter((x) => x !== id),
  }));

  const porHora = esPorHora(form.servicio);
  // Si la hora de fin queda antes de la de inicio, se corre a una hora después.
  const cambiarHoraInicio = (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, hora_inicio: v, hora_fin: f.hora_fin > v ? f.hora_fin : (HORAS[HORAS.indexOf(v) + 1] ?? '') }));
  };

  // Vista previa del total, con la misma cuenta que hace el servidor: tarifa × noches u horas × mascotas.
  const resumen = useMemo(() => {
    const s = cuidador?.servicios.find((x) => x.servicio === form.servicio);
    if (!s || !form.fecha_inicio) return null;
    const unidades = porHora
      ? horasEntre(form.hora_inicio, form.hora_fin)
      : (form.fecha_fin ? dias(form.fecha_inicio, form.fecha_fin) : 0);
    const cantidad = form.mascota_ids.length;
    if (unidades < 1 || cantidad < 1) return null;
    return { unidades, cantidad, tarifa: s.tarifa, total: s.tarifa * unidades * cantidad };
  }, [cuidador, form, porHora]);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (form.mascota_ids.length === 0) {
      setError(t('reservas.elige_mascota'));
      return;
    }
    setEnviando(true);
    try {
      const datos = porHora
        ? { ...form, fecha_fin: form.fecha_inicio }
        : { ...form, hora_inicio: undefined, hora_fin: undefined };
      setCreada(await crearReserva({ ...datos, cuidador_id: cuidadorId }));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <main className="rs-pagina"><p className="rs-texto">{t('reservas.cargando')}</p></main>;
  if (!cuidador) {
    return (
      <main className="rs-pagina">
        <p className="rs-aviso rs-aviso--error">{error || t('reservas.cuidador_no_encontrado')}</p>
        <Link to="/inicio">{t('reservas.volver_busqueda')}</Link>
      </main>
    );
  }

  if (creada) {
    return (
      <main className="rs-pagina">
        <h1 className="rs-titulo">{t('reservas.solicitud_enviada')}</h1>
        <p className="rs-texto">
          {t('reservas.plazo_respuesta', { nombre: cuidador.nombre, fecha: fechaHora(creada.responder_antes) })}
        </p>
        <Link className="btn-primary" to="/reservas">{t('reservas.ver_mis_reservas')}</Link>
      </main>
    );
  }

  const unidad = SERVICIOS[form.servicio]?.unidad ?? 'noche';

  return (
    <main className="rs-pagina">
      {/* Si se llegó desde el perfil se retrocede; así el historial no se repite (perfil → reserva → perfil → ...). */}
      <Link className="rs-volver" to={`/cuidadores/${cuidadorId}`} replace
        onClick={(e) => { if (location.state?.desdePerfil) { e.preventDefault(); navigate(-1); } }}>
        {t('reservas.volver_perfil')}
      </Link>
      <h1 className="rs-titulo">{t('reservas.reservar_con', { nombre: cuidador.nombre })}</h1>

      {mascotas.length === 0 ? (
        <section className="rs-vacio">
          <span className="rs-vacio-icono"><IconPata /></span>
          <h2>{t('reservas.registra_mascota')}</h2>
          <p>{t('reservas.necesita_saber', { nombre: cuidador.nombre.split(' ')[0] })}</p>
          <Link className="btn-primary rs-vacio-boton" to="/mascotas/nueva">{t('reservas.agregar_mascota')}</Link>
          <small>{t('reservas.solo_un_minuto')}</small>
        </section>
      ) : (
        <form className="rs-form" onSubmit={enviar}>
          <div>
            <label className="label" htmlFor="servicio">{t('reservas.servicio')}</label>
            <Desplegable id="servicio" className="input" value={form.servicio} onChange={cambiar('servicio')}>
              {cuidador.servicios.map((s) => (
                <option key={s.servicio} value={s.servicio}>
                  {nombreServicio(s.servicio)} · {precio(s.tarifa, cuidador.moneda)} / {textoUnidad(s.unidad)}
                </option>
              ))}
            </Desplegable>
          </div>

          <fieldset className="rs-mascotas">
            <legend className="label">{t('reservas.mascotas_campo')}</legend>
            {mascotas.map((m) => {
              const acepta = aceptaEspecie(cuidador, m.especie);
              return (
                <label key={m.id} className={`rs-mascota${acepta ? '' : ' rs-mascota--no'}`}>
                  <input type="checkbox" checked={form.mascota_ids.includes(m.id)} disabled={!acepta}
                    onChange={marcarMascota(m.id)} />
                  <span>
                    <strong>{m.nombre}</strong>
                    <small>{textoEspecie(m.especie)}{acepta ? '' : ` · ${t('reservas.especie_no_aceptada')}`}</small>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {porHora ? (
            <>
              <div>
                <label className="label" htmlFor="dia">{t('reservas.dia')}</label>
                <input id="dia" type="date" className="input" min={hoyISO()} value={form.fecha_inicio}
                  onChange={cambiar('fecha_inicio')} required />
              </div>
              <div className="rs-fila">
                <div>
                  <label className="label" htmlFor="hora-inicio">{t('reservas.desde')}</label>
                  <Desplegable id="hora-inicio" className="input" value={form.hora_inicio} onChange={cambiarHoraInicio} required>
                    <option value="" disabled>{t('reservas.hora')}</option>
                    {HORAS.slice(0, -1).map((h) => <option key={h} value={h}>{h}</option>)}
                  </Desplegable>
                </div>
                <div>
                  <label className="label" htmlFor="hora-fin">{t('reservas.hasta')}</label>
                  <Desplegable id="hora-fin" className="input" value={form.hora_fin} onChange={cambiar('hora_fin')} required
                    disabled={!form.hora_inicio}>
                    <option value="" disabled>{t('reservas.hora')}</option>
                    {HORAS.filter((h) => h > form.hora_inicio && horasEntre(form.hora_inicio, h) <= 12)
                      .map((h) => <option key={h} value={h}>{h}</option>)}
                  </Desplegable>
                </div>
              </div>
            </>
          ) : (
            <div className="rs-fila">
              <div>
                <label className="label" htmlFor="desde">{t('reservas.entrada')}</label>
                <input id="desde" type="date" className="input" min={hoyISO()} value={form.fecha_inicio}
                  onChange={cambiar('fecha_inicio')} required />
              </div>
              <div>
                <label className="label" htmlFor="hasta">{t('reservas.salida')}</label>
                <input id="hasta" type="date" className="input" min={form.fecha_inicio || hoyISO()} value={form.fecha_fin}
                  onChange={cambiar('fecha_fin')} required />
              </div>
            </div>
          )}

          <div>
            <label className="label" htmlFor="nota">{t('reservas.nota')}</label>
            <textarea id="nota" className="input rs-nota" maxLength={500} value={form.nota} onChange={cambiar('nota')} />
          </div>

          {resumen && (
            <p className="rs-resumen">
              {t(resumen.cantidad === 1 ? 'reservas.n_mascota' : 'reservas.n_mascotas', { n: resumen.cantidad })} ×{' '}
              {resumen.unidades} {textoUnidad(unidad, resumen.unidades)} × {precio(resumen.tarifa, cuidador.moneda)} ={' '}
              <strong>{precio(resumen.total, cuidador.moneda)}</strong>
            </p>
          )}

          {error && <p className="rs-aviso rs-aviso--error" role="alert">{error}</p>}

          <button type="submit" className="btn-primary" disabled={enviando || form.mascota_ids.length === 0}>
            {enviando ? t('reservas.enviando') : t('reservas.enviar_solicitud')}
          </button>
          <p className="rs-texto">{t('reservas.pago_al_confirmar')}</p>
        </form>
      )}
    </main>
  );
}
