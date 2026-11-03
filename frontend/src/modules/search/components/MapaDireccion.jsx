import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import CapaMapa from './CapaMapa.jsx';
import BuscadorDirecciones from './BuscadorDirecciones.jsx';
import { direccionDe } from '../services/busquedaService.js';
import { CENTRO_POR_DEFECTO, obtenerMiUbicacion } from '../ubicacion.js';
import { IconUbicacion } from './Iconos.jsx';

const pin = L.divIcon({ className: 'bs-pin-direccion', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] });

// Lleva el mapa al punto elegido.
function Seguir({ punto }) {
  const map = useMap();
  useEffect(() => {
    if (punto) map.flyTo([punto.lat, punto.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [map, punto]);
  return null;
}

function AlTocar({ onTocar }) {
  useMapEvents({ click: (e) => onTocar(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Escribe una dirección y se ubica en el mapa, o toca/arrastra el pin y se escribe la dirección.
// valor / onCambiar: { etiqueta, barrio, ciudad, lat, lng } | null.
// Lo usa la búsqueda (dónde busca el viajero) y puede usarlo el perfil del cuidador (dónde vive).
export default function MapaDireccion({ valor, onCambiar, placeholder = 'Escribe una dirección o barrio' }) {
  const [texto, setTexto] = useState(valor?.etiqueta ?? '');
  const [ubicando, setUbicando] = useState(false);
  const [error, setError] = useState('');

  const elegir = (d) => {
    setError('');
    onCambiar(d);
  };

  // Punto tocado o arrastrado en el mapa → su dirección.
  const ubicarPunto = async (lat, lng) => {
    setUbicando(true);
    onCambiar({ etiqueta: 'Ubicando…', barrio: null, ciudad: null, lat, lng });
    try {
      const { direccion } = await direccionDe(lat, lng);
      const d = direccion ?? { etiqueta: 'Punto en el mapa', barrio: null, ciudad: null, lat, lng };
      setTexto(d.etiqueta);
      setError('');
      onCambiar(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setUbicando(false);
    }
  };

  const usarMiUbicacion = async () => {
    setUbicando(true);
    try {
      const p = await obtenerMiUbicacion();
      await ubicarPunto(p.lat, p.lng);
    } catch (e) {
      setUbicando(false);
      setError(e.message);
    }
  };

  const centro = valor ?? CENTRO_POR_DEFECTO;

  return (
    <div className="bs-mapa-direccion">
      <BuscadorDirecciones texto={texto} onTexto={setTexto} onElegir={elegir} placeholder={placeholder} cerca={valor ?? undefined} />

      <button type="button" className="bs-enlace bs-mi-ubicacion" onClick={usarMiUbicacion} disabled={ubicando}>
        <IconUbicacion width="18" height="18" /> Usar mi ubicación actual
      </button>
      {error && <p className="bs-error" role="alert">{error}</p>}

      <div className="bs-mapa bs-mapa--editable">
        <MapContainer center={[centro.lat, centro.lng]} zoom={valor ? 15 : 12} scrollWheelZoom>
          <CapaMapa />
          <AlTocar onTocar={ubicarPunto} />
          <Seguir punto={valor} />
          {valor && (
            <Marker position={[valor.lat, valor.lng]} icon={pin} draggable
              eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); ubicarPunto(p.lat, p.lng); } }} />
          )}
        </MapContainer>
      </div>
      <p className="bs-ayuda">Toca el mapa o arrastra el pin para ajustar el punto.</p>
    </div>
  );
}
