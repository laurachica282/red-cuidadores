import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import CapaMapa from './CapaMapa.jsx';

const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Encuadra el mapa para que se vean todos los pines y el punto de búsqueda (al cargar o al pedirlo con `version`).
// Avisa la zona visible solo cuando la persona mueve o acerca el mapa; si lo encuadra la app avisa null (= todos).
function Encuadrar({ puntos, version, onVista }) {
  const map = useMap();
  const automatico = useRef(false);

  useMapEvents({
    moveend: () => {
      if (automatico.current) {
        automatico.current = false;
        onVista(null);
      } else {
        onVista(map.getBounds());
      }
    },
  });

  useEffect(() => {
    automatico.current = true;
    if (puntos.length === 1) map.setView(puntos[0], 14);
    else if (puntos.length > 1) map.fitBounds(puntos, { padding: [36, 36], maxZoom: 15 });
  }, [map, puntos, version]);
  return null;
}

// Mockup 1: mapa con el precio de cada cuidador. Tocar un pin abre su perfil.
// onVista(bounds | null): zona del mapa que la persona está mirando, para filtrar la lista.
export default function MapaResultados({ cuidadores, punto, precio, enlacePerfil, resaltado, version, onVista }) {
  const navigate = useNavigate();
  const conUbicacion = cuidadores.filter((c) => c.ubicacion);

  // Se encuadra de nuevo solo cuando cambian los puntos, no en cada render.
  const clave = [...conUbicacion.map((c) => [c.ubicacion.lat, c.ubicacion.lng]), ...(punto ? [[punto.lat, punto.lng]] : [])]
    .map((p) => p.join(','))
    .join('|');
  const puntos = useMemo(() => (clave ? clave.split('|').map((p) => p.split(',').map(Number)) : []), [clave]);

  if (conUbicacion.length === 0) return null;

  return (
    <div className="bs-mapa">
      <MapContainer center={puntos[0]} zoom={13} scrollWheelZoom>
        <CapaMapa />
        <Encuadrar puntos={puntos} version={version} onVista={onVista} />
        {punto && (
          <CircleMarker center={[punto.lat, punto.lng]} radius={8}
            pathOptions={{ color: '#fff', weight: 3, fillColor: '#00a896', fillOpacity: 1 }} />
        )}
        {conUbicacion.map((c) => (
          <Marker key={c.id} position={[c.ubicacion.lat, c.ubicacion.lng]}
            zIndexOffset={resaltado === c.id ? 1000 : 0}
            title={c.nombre}
            icon={L.divIcon({
              className: '',
              html: `<span class="bs-pin-precio${resaltado === c.id ? ' bs-pin-precio--activo' : ''}">${escapar(precio(c.tarifa, c.moneda))}</span>`,
              iconSize: null,
            })}
            eventHandlers={{ click: () => navigate(enlacePerfil(c)) }} />
        ))}
      </MapContainer>
    </div>
  );
}
