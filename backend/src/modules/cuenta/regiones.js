// RN-6, HU-35 y mockup 17 (idioma, país y moneda). La moneda por defecto sale del país; el usuario
// puede elegir otra. La parametrización de pasarelas por país (HU-20) es del módulo de pagos;
// esto solo cubre la preferencia del usuario.
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

export const MONEDAS = [
  { codigo: 'COP', nombre: 'Peso colombiano' },
  { codigo: 'MXN', nombre: 'Peso mexicano' },
  { codigo: 'PEN', nombre: 'Sol peruano' },
  { codigo: 'CLP', nombre: 'Peso chileno' },
  { codigo: 'ARS', nombre: 'Peso argentino' },
  { codigo: 'BRL', nombre: 'Real brasileño' },
  { codigo: 'USD', nombre: 'Dólar estadounidense' },
  { codigo: 'EUR', nombre: 'Euro' },
];

// Idiomas de HU-34 (la traducción de la interfaz es del módulo de Vanesa; aquí solo se guarda la elección).
export const IDIOMAS = [
  { codigo: 'es', nombre: 'Español' },
  { codigo: 'en', nombre: 'English' },
  { codigo: 'pt', nombre: 'Português' },
];

export const CODIGOS_PAIS = PAISES.map((p) => p.codigo);
export const CODIGOS_MONEDA = MONEDAS.map((m) => m.codigo);
export const CODIGOS_IDIOMA = IDIOMAS.map((i) => i.codigo);

export const monedaDelPais = (codigo) => PAISES.find((p) => p.codigo === codigo)?.moneda;
