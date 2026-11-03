import { useEffect } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Mapa base de OpenStreetMap. Su licencia exige mostrar el crédito; el prefijo "Leaflet" no es obligatorio.
export default function CapaMapa() {
  const map = useMap();
  useEffect(() => { map.attributionControl.setPrefix(false); }, [map]);
  return (
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  );
}
