// RN-6 y HU-35: país y moneda. La moneda por defecto sale del país; el usuario puede cambiarla.
// La parametrización de pasarelas por país (HU-20) es del módulo de pagos; esto solo cubre
// la preferencia del usuario.
export const PAISES = [
  { codigo: 'CO', nombre: 'Colombia', moneda: 'COP' },
  { codigo: 'MX', nombre: 'México', moneda: 'MXN' },
  { codigo: 'PE', nombre: 'Perú', moneda: 'PEN' },
  { codigo: 'CL', nombre: 'Chile', moneda: 'CLP' },
  { codigo: 'AR', nombre: 'Argentina', moneda: 'ARS' },
  { codigo: 'BR', nombre: 'Brasil', moneda: 'BRL' },
  { codigo: 'EC', nombre: 'Ecuador', moneda: 'USD' },
  { codigo: 'PA', nombre: 'Panamá', moneda: 'USD' },
  { codigo: 'US', nombre: 'Estados Unidos', moneda: 'USD' },
  { codigo: 'ES', nombre: 'España', moneda: 'EUR' },
];

export const MONEDAS = [...new Set(PAISES.map((p) => p.moneda))];
export const CODIGOS_PAIS = PAISES.map((p) => p.codigo);

export const monedaDelPais = (codigo) => PAISES.find((p) => p.codigo === codigo)?.moneda;
