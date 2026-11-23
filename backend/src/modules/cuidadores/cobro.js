// Datos de cobro del cuidador: a dónde se le paga. Reglas por país (usuarios.pais).
// Cuenta bancaria: banco de una lista corta, ahorros o corriente y número con el formato del país.
// Billetera: la billetera digital común del país con su identificador.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const REGLAS_COBRO = {
  CO: {
    bancos: ['Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA Colombia', 'Banco de Occidente', 'Banco Popular', 'Scotiabank Colpatria', 'Banco AV Villas', 'Banco Caja Social', 'Itaú Colombia'],
    numero: { valida: (n) => /^\d{9,16}$/.test(n), error: 'El número de cuenta debe tener entre 9 y 16 dígitos', formato: 'cuenta' },
    billeteras: {
      Nequi: { valida: (n) => /^3\d{9}$/.test(n), error: 'Escribe el celular de Nequi: 10 dígitos que empiezan por 3', formato: 'celular' },
      Daviplata: { valida: (n) => /^3\d{9}$/.test(n), error: 'Escribe el celular de Daviplata: 10 dígitos que empiezan por 3', formato: 'celular' },
    },
  },
  MX: {
    bancos: ['BBVA México', 'Banorte', 'Santander México', 'Banamex', 'HSBC México', 'Scotiabank México', 'Banco Azteca', 'Inbursa'],
    numero: { valida: (n) => /^\d{18}$/.test(n), error: 'La CLABE debe tener 18 dígitos', formato: 'clabe' },
    billeteras: {
      'Mercado Pago': {
        valida: (n) => /^\d{10}$/.test(n) || /^\d{18}$/.test(n) || EMAIL.test(n),
        error: 'Escribe el celular (10 dígitos), el correo o la CLABE (18 dígitos) de tu cuenta de Mercado Pago',
        formato: 'mercadopago',
      },
    },
  },
  BR: {
    bancos: ['Banco do Brasil', 'Itaú Unibanco', 'Bradesco', 'Caixa Econômica Federal', 'Santander Brasil', 'Nubank', 'Banco Inter'],
    // Agência / conta con dígito: 1234/12345-6 o 1234-5/12345-6.
    numero: { valida: (n) => /^\d{4}(-\d)?\/\d{3,12}-[\dX]$/i.test(n), error: 'Escribe agência y conta así: 1234/12345-6', formato: 'agencia' },
    billeteras: {
      Pix: {
        // CPF, CNPJ, celular, correo o clave aleatoria.
        valida: (n) => /^\d{11}$/.test(n) || /^\d{14}$/.test(n) || /^\+55\d{10,11}$/.test(n) || EMAIL.test(n) || UUID.test(n),
        error: 'La clave Pix debe ser un CPF (11 dígitos), CNPJ (14), celular (+55…), correo o clave aleatoria',
        formato: 'pix',
      },
    },
  },
  US: {
    bancos: ['Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'U.S. Bank', 'Capital One', 'PNC Bank'],
    // Routing (9 dígitos) y número de cuenta (4 a 17 dígitos).
    numero: { valida: (n) => /^\d{9}\/\d{4,17}$/.test(n), error: 'Escribe el routing (9 dígitos) y el número de cuenta (4 a 17 dígitos)', formato: 'routing' },
    billeteras: {
      PayPal: { valida: (n) => EMAIL.test(n), error: 'Escribe el correo de tu cuenta de PayPal', formato: 'correo' },
    },
  },
  ES: {
    bancos: ['Banco Santander', 'BBVA', 'CaixaBank', 'Banco Sabadell', 'Bankinter', 'ING', 'Unicaja'],
    numero: { valida: (n) => /^ES\d{22}$/.test(n), error: 'El IBAN debe empezar por ES y tener 22 dígitos después', formato: 'iban' },
    billeteras: {
      Bizum: { valida: (n) => /^[67]\d{8}$/.test(n), error: 'Escribe el móvil de Bizum: 9 dígitos que empiezan por 6 o 7', formato: 'movil' },
    },
  },
};

// Opciones que ve el formulario del país (sin las funciones de validación).
export function opcionesCobro(pais) {
  const r = REGLAS_COBRO[pais];
  if (!r) return null;
  return {
    bancos: r.bancos,
    formatoCuenta: r.numero.formato,
    billeteras: Object.entries(r.billeteras).map(([nombre, b]) => ({ nombre, formato: b.formato })),
  };
}

// Quita espacios y puntos; el IBAN en mayúsculas; los correos en minúsculas.
// En EE. UU. el routing y la cuenta quedan separados por "/".
function normalizarNumero(texto, pais, tipo) {
  const t = String(texto ?? '').trim();
  if (t.includes('@')) return t.toLowerCase();
  if (UUID.test(t)) return t.toLowerCase();
  let n = t.replace(/[\s.]/g, '');
  if (tipo === 'cuenta_bancaria' && pais === 'ES') n = n.toUpperCase();
  if (tipo === 'cuenta_bancaria' && pais === 'US') n = n.replace(/[-|]/g, '/');
  if (tipo === 'billetera' && pais === 'BR' && /^\+?55[\d()-]+$/.test(n)) n = `+${n.replace(/\D/g, '')}`;
  if (tipo === 'billetera' && pais === 'BR' && /^[\d.\-/]+$/.test(t)) n = t.replace(/\D/g, '');
  return n;
}

// Valida el cuerpo del PUT. Devuelve { error } o { datos } listos para guardar.
export function leerDatosCobro(body, pais, anterior) {
  const reglas = REGLAS_COBRO[pais];
  if (!reglas) return { error: 'Todavía no recibimos pagos en tu país' };
  const tipo = String(body.tipo ?? '');
  if (!['cuenta_bancaria', 'billetera'].includes(tipo)) return { error: 'Elige si te pagamos a una cuenta bancaria o a una billetera' };
  const titular = String(body.titular ?? '').trim().replace(/\s+/g, ' ');
  if (titular.length < 3 || titular.length > 120) return { error: 'Escribe el nombre completo del titular' };
  const documento = String(body.documento ?? '').trim().replace(/[\s.]/g, '').toUpperCase();
  if (!/^[A-Z0-9-]{5,30}$/.test(documento)) return { error: 'Escribe el número de documento del titular (solo letras, números y guiones)' };
  const entidad = String(body.entidad ?? '').trim();

  let tipoCuenta = null;
  let regla;
  if (tipo === 'cuenta_bancaria') {
    if (!reglas.bancos.includes(entidad)) return { error: 'Elige tu banco de la lista' };
    tipoCuenta = String(body.tipoCuenta ?? '');
    if (!['ahorros', 'corriente'].includes(tipoCuenta)) return { error: 'Elige si la cuenta es de ahorros o corriente' };
    regla = reglas.numero;
  } else {
    regla = reglas.billeteras[entidad];
    if (!regla) return { error: 'Elige tu billetera de la lista' };
  }

  // Si no escribe el número y ya tenía uno en la misma entidad, se conserva (en pantalla solo ve los últimos 4).
  let numero = normalizarNumero(body.numero, pais, tipo);
  if (!numero && anterior && anterior.tipo === tipo && anterior.entidad === entidad) numero = anterior.numero;
  if (!numero) return { error: tipo === 'billetera' ? 'Escribe el dato de tu billetera' : 'Escribe el número de la cuenta' };
  if (!regla.valida(numero)) return { error: regla.error };

  return { datos: { tipo, titular, documento, entidad, tipoCuenta, numero } };
}

// Número oculto: ••••1234. Los correos dejan ver la primera letra y el dominio.
export function enmascarar(numero) {
  const n = String(numero ?? '');
  if (n.includes('@')) {
    const [local, dominio] = n.split('@');
    return `${local.slice(0, 1)}•••@${dominio}`;
  }
  return `••••${n.replace(/[^0-9A-Za-z]/g, '').slice(-4)}`;
}
