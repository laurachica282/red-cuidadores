import { api } from '@/shared/api/client.js';

export const obtenerCuidador = (id) => api(`/busqueda/cuidadores/${id}`);
export const misMascotas = () => api('/mascotas');
export const crearReserva = (datos) => api('/reservas', { metodo: 'POST', cuerpo: datos });
export const reservasMias = () => api('/reservas/mias');
export const reservasRecibidas = () => api('/reservas/recibidas');
export const confirmarReserva = (id) => api(`/reservas/${id}/confirmar`, { metodo: 'POST' });
export const rechazarReserva = (id, motivo) => api(`/reservas/${id}/rechazar`, { metodo: 'POST', cuerpo: { motivo } });
export const cancelarReserva = (id) => api(`/reservas/${id}/cancelar`, { metodo: 'POST' });
export const misPagos = () => api('/pagos/mios');
// HU-21: cuánto se devolvería si se cancela hoy.
export const cotizarCancelacion = (id) => api(`/reservas/${id}/cancelacion`);
// El cuidador cancela una reserva que ya aceptó (el viajero recibe el 100 %).
export const cancelarComoCuidador = (id, motivo, detalle) =>
  api(`/reservas/${id}/cancelar-cuidador`, { metodo: 'POST', cuerpo: { motivo, detalle } });
// Administración: cancelaciones de cuidadores (en_revision | revisadas).
export const cancelacionesAdmin = (estado) => api(`/reservas/admin/cancelaciones?estado=${estado}`);
export const revisarCancelacion = (id, datos) =>
  api(`/reservas/admin/cancelaciones/${id}/revisar`, { metodo: 'POST', cuerpo: datos });
