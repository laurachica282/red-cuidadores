import { ErrorHttp } from './errores.js';
import { VERIFICACIONES_PAZ_Y_SALVO } from './config.js';

// Puntos de unión con módulos que son de otros responsables. El módulo cuenta no importa
// archivos internos de nadie (regla del proyecto): cada dueño registra aquí lo suyo desde
// su propio módulo, y mientras no lo haga hay un comportamiento seguro por defecto.
//
//   import { integraciones } from '../cuenta/index.js';
//   integraciones.registrarReservas({ obtener: async (id) => ({ id, viajeroId, cuidadorId, estado }) });
//
export function crearIntegraciones() {
  let reservas = {
    // HU-33: sin módulo de reservas no hay forma de saber si el servicio se completó.
    async obtener() {
      throw new ErrorHttp(503, 'Las reseñas estarán disponibles cuando el módulo de reservas esté activo');
    },
  };
  const verificadores = new Map();
  let cerrarSesiones = async () => {};
  let antecedentesVigentes = async () => true;

  return {
    // Laura (reservas y pagos). obtener(reservaId) -> { id, viajeroId, cuidadorId, estado } | null.
    // Una reserva terminada debe tener estado 'completada'.
    registrarReservas(impl) {
      reservas = impl;
    },

    // Laura (HU-38). codigo: una clave de VERIFICACIONES_PAZ_Y_SALVO.
    // consultar({ usuarioId, rol }) -> número de pendientes, o { cantidad, detalle }.
    registrarVerificacionPazYSalvo(codigo, consultar) {
      if (!(codigo in VERIFICACIONES_PAZ_Y_SALVO)) throw new Error(`Verificación desconocida: ${codigo}`);
      verificadores.set(codigo, consultar);
    },

    // Diego (HU-08). Se llama al desactivar la cuenta, para cerrar sus sesiones por dispositivo.
    registrarCierreDeSesiones(fn) {
      cerrarSesiones = fn;
    },

    // Vanesa (HU-13). antecedentesVigentes(usuarioId) -> boolean. Lo usa HU-40 al reactivar.
    registrarAntecedentes(fn) {
      antecedentesVigentes = fn;
    },

    // --- uso interno del módulo cuenta ---
    reservas: { obtener: (id) => reservas.obtener(id) },
    cerrarSesiones: (usuarioId) => cerrarSesiones(usuarioId),
    antecedentesVigentes: (usuarioId) => antecedentesVigentes(usuarioId),

    // Las cuatro verificaciones de RN-4, con cuántos pendientes tiene el usuario en cada una
    // (0 si está al día o si ningún módulo registró todavía esa verificación).
    async verificacionesPazYSalvo(usuario) {
      const lista = [];
      for (const [codigo, titulo] of Object.entries(VERIFICACIONES_PAZ_Y_SALVO)) {
        const r = verificadores.has(codigo) ? await verificadores.get(codigo)(usuario) : 0;
        const cantidad = typeof r === 'number' ? r : (r?.cantidad ?? 0);
        lista.push({ codigo, titulo, cantidad, ...(cantidad > 0 && r?.detalle ? { detalle: r.detalle } : {}) });
      }
      return lista;
    },

    async pendientesPazYSalvo(usuario) {
      return (await this.verificacionesPazYSalvo(usuario)).filter((v) => v.cantidad > 0);
    },

    // Verificaciones que todavía ningún módulo registró: el paz y salvo no las está mirando.
    verificacionesSinRegistrar() {
      return Object.keys(VERIFICACIONES_PAZ_Y_SALVO).filter((c) => !verificadores.has(c));
    },
  };
}
