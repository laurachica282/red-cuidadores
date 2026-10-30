import { useAuth } from '@/modules/auth';

export default function BuscarPage() {
  const { usuario, cerrarSesion } = useAuth();
  return (
    <main className="page">
      <h1>Hola, {usuario.nombre}</h1>
      <p style={{ color: 'var(--slate)' }}>Pantalla de búsqueda pendiente · mockup 1</p>
      <button className="btn-primary" onClick={cerrarSesion}>Cerrar sesión</button>
    </main>
  );
}