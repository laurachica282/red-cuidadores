import { ErrorHttp } from '../errores.js';
import { monedaDelPais } from '../regiones.js';

// HU-35, RN-6 y mockup 17. Idioma, país y moneda: la moneda sale del país, pero el usuario puede elegir otra.
// "El cambio de país solo aplica a reservas nuevas": aquí solo se cambia la preferencia del usuario;
// cada reserva guarda su propia moneda al crearse, así que las anteriores no se mueven.
export function crearRegionService({ pool }) {
  return {
    async actualizar(usuarioId, { pais, moneda, idioma }) {
      const r = await pool.query(
        `UPDATE usuarios
            SET pais   = COALESCE($2, pais),
                moneda = COALESCE($3, moneda),
                idioma = COALESCE($4, idioma)
          WHERE id = $1
          RETURNING pais, idioma, moneda`,
        // Si cambia el país sin elegir moneda, se usa la del país nuevo.
        [usuarioId, pais ?? null, moneda ?? (pais ? monedaDelPais(pais) : null), idioma ?? null],
      );
      if (!r.rows[0]) throw new ErrorHttp(404, 'No encontramos tu cuenta');
      return r.rows[0];
    },
  };
}
