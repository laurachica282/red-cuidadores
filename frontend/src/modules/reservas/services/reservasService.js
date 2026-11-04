import { api } from '@/shared/api/client.js';

export const obtenerCuidador = (id) => api(`/busqueda/cuidadores/${id}`);
export const misMascotas = () => api('/mascotas');
export const crearReserva = (datos) => api('/reservas', { metodo: 'POST', cuerpo: datos });
export const reservasMias = () => api('/reservas/mias');
export const reservasRecibidas = () => api('/reservas/recibidas');
export const confirmarReserva = (id) => api(`/reservas/${id}/confirmar`, { metodo: 'POST' });
export const rechazarReserva = (id, motivo) => api(`/reservas/${id}/rechazar`, { metodo: 'POST', cuerpo: { motivo } });
export const cancelarReserva = (id) => api(`/reservas/${id}/cancelar`, { metodo: 'POST' });