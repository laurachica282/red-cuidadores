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

    async pendientesPazYSalvo(usuario) {
      const pendientes = [];
      for (const [codigo, consultar] of verificadores) {
        const r = await consultar(usuario);
        const cantidad = typeof r === 'number' ? r : (r?.cantidad ?? 0);
        if (cantidad > 0) {
          pendientes.push({
            codigo,
            titulo: VERIFICACIONES_PAZ_Y_SALVO[codigo],
            cantidad,
            ...(typeof r === 'object' && r?.detalle ? { detalle: r.detalle } : {}),
          });
        }
      }
      return pendientes;
    },

    // Verificaciones que todavía ningún módulo registró: el paz y salvo no las está mirando.
    verificacionesSinRegistrar() {
      return Object.keys(VERIFICACIONES_PAZ_Y_SALVO).filter((c) => !verificadores.has(c));
    },
  };
}
