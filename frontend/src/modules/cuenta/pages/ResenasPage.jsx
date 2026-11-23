import { useIdioma } from '@/modules/region';
import '../i18n.js';
import Aviso from '../components/Aviso.jsx';
import Estrellas from '../components/Estrellas.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { listarMisResenas } from '../services/cuentaService.js';
import { fecha } from '../utils/textos.js';

// HU-33: las reseñas que el usuario ha escrito. Calificar se hace desde la reserva terminada
// (RUTAS.nuevaResenaPatron).
export default function ResenasPage() {
  const { t, locale } = useIdioma();
  const { datos, cargando, error } = useCarga(listarMisResenas);
  const resenas = datos?.resenas ?? [];

  return (
    <Pantalla titulo={t('cuenta.menu.resenas')}>
      {cargando && <p className="cu-cargando">{t('cuenta.cargando')}</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}
      {datos && resenas.length === 0 && (
        <p className="cu-vacio">
          {t('cuenta.resenas.vacio1')}<br />
          {t('cuenta.resenas.vacio2')}
        </p>
      )}
      {resenas.length > 0 && (
        <ul className="cu-lista">
          {resenas.map((r) => (
            <li key={r.id} className="cu-item">
              <div className="cu-item-fila">
                <p className="cu-item-titulo">{r.cuidador_nombre}</p>
                <Estrellas valor={r.calificacion} tamano={18} />
              </div>
              {r.comentario && <p className="cu-item-texto">{r.comentario}</p>}
              <p className="cu-item-meta">{fecha(r.creado_en, locale)}</p>
            </li>
          ))}
        </ul>
      )}
    </Pantalla>
  );
}
