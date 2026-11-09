import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { crearReserva, misMascotas, obtenerCuidador } from '../services/reservasService.js';
import { SERVICIOS, dias, fechaHora, hoyISO, precio } from '../utils.js';
import { IconPata } from '@/shared/components/Icons.jsx';
import './reservas.css';

export default function NuevaReservaPage() {
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
    mascota_id: '',
    fecha_inicio: params.get('desde') ?? '',
    fecha_fin: params.get('hasta') ?? '',
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
          mascota_id: m[0] ? String(m[0].id) : '',
        }));
      })
      .catch((e) => vivo && setError(e.message))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [cuidadorId]);

  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  // Vista previa del total, con la misma cuenta que hace el servidor.
  const resumen = useMemo(() => {
    const s = cuidador?.servicios.find((x) => x.servicio === form.servicio);
    if (!s || !form.fecha_inicio || !form.fecha_fin) return null;
    const n = dias(form.fecha_inicio, form.fecha_fin);
    const unidades = form.servicio === 'alojamiento' ? n : n + 1;
    if (n < 0 || unidades < 1) return null;
    return { unidades, tarifa: s.tarifa, total: s.tarifa * unidades };
  }, [cuidador, form]);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      setCreada(await crearReserva({ ...form, cuidador_id: cuidadorId }));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <main className="rs-pagina"><p className="rs-texto">Cargando…</p></main>;
  if (!cuidador) {
    return (
      <main className="rs-pagina">
        <p className="rs-aviso rs-aviso--error">{error || 'No encontramos a este cuidador.'}</p>
        <Link to="/inicio">Volver a la búsqueda</Link>
      </main>
    );
  }

  if (creada) {
    return (
      <main className="rs-pagina">
        <h1 className="rs-titulo">Solicitud enviada</h1>
        <p className="rs-texto">
          {cuidador.nombre} tiene hasta el {fechaHora(creada.responder_antes)} para responder. Si no responde,
          la solicitud vence.
        </p>
        <Link className="btn-primary" to="/reservas">Ver mis reservas</Link>
      </main>
    );
  }

  const unidad = SERVICIOS[form.servicio]?.unidad ?? 'noche';

  return (
    <main className="rs-pagina">
      {/* Si se llegó desde el perfil se retrocede; así el historial no se repite (perfil → reserva → perfil → ...). */}
      <Link className="rs-volver" to={`/cuidadores/${cuidadorId}`} replace
        onClick={(e) => { if (location.state?.desdePerfil) { e.preventDefault(); navigate(-1); } }}>
        ← Volver al perfil
      </Link>
      <h1 className="rs-titulo">Reservar con {cuidador.nombre}</h1>

      {mascotas.length === 0 ? (
        <section className="rs-vacio">
          <span className="rs-vacio-icono"><IconPata /></span>
          <h2>Primero registra a tu mascota</h2>
          <p>
            {cuidador.nombre.split(' ')[0]} necesita saber a quién va a cuidar: especie, raza, vacunas e indicaciones médicas.
          </p>
          <Link className="btn-primary rs-vacio-boton" to="/mascotas/nueva">Agregar mascota</Link>
          <small>Solo toma un minuto. Luego vuelve aquí para terminar tu reserva.</small>
        </section>
      ) : (
        <form className="rs-form" onSubmit={enviar}>
          <div>
            <label className="label" htmlFor="servicio">Servicio</label>
            <select id="servicio" className="input" value={form.servicio} onChange={cambiar('servicio')}>
              {cuidador.servicios.map((s) => (
                <option key={s.servicio} value={s.servicio}>
                  {SERVICIOS[s.servicio]?.texto ?? s.servicio} · {precio(s.tarifa, cuidador.moneda)} / {s.unidad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="mascota">Mascota</label>
            <select id="mascota" className="input" value={form.mascota_id} onChange={cambiar('mascota_id')}>
              {mascotas.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre} ({m.especie})</option>
              ))}
            </select>
          </div>

          <div className="rs-fila">
            <div>
              <label className="label" htmlFor="desde">Entrada</label>
              <input id="desde" type="date" className="input" min={hoyISO()} value={form.fecha_inicio}
                onChange={cambiar('fecha_inicio')} required />
            </div>
            <div>
              <label className="label" htmlFor="hasta">Salida</label>
              <input id="hasta" type="date" className="input" min={form.fecha_inicio || hoyISO()} value={form.fecha_fin}
                onChange={cambiar('fecha_fin')} required />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="nota">Nota para el cuidador (opcional)</label>
            <textarea id="nota" className="input rs-nota" maxLength={500} value={form.nota} onChange={cambiar('nota')} />
          </div>

          {resumen && (
            <p className="rs-resumen">
              {resumen.unidades} {unidad}{resumen.unidades === 1 ? '' : 's'} × {precio(resumen.tarifa, cuidador.moneda)} ={' '}
              <strong>{precio(resumen.total, cuidador.moneda)}</strong>
            </p>
          )}

          {error && <p className="rs-aviso rs-aviso--error" role="alert">{error}</p>}

          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </button>
          <p className="rs-texto">El pago se hace cuando el cuidador confirme.</p>
        </form>
      )}
    </main>
  );
}