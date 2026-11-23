// Datos de cobro de demostración para los cuidadores demo (correo @demo.redcuidadores.co) que no tienen.
// Solo inserta (ON CONFLICT DO NOTHING): no cambia los datos que alguien ya guardó.
//
//   node src/db/cobro_demo.js
//
// poblar.js usa datoCobroDemo() para que las cargas nuevas también tengan sus datos de cobro.
// Los números son inventados pero válidos para el país (CLABE, IBAN, CPF y DNI con su dígito de control).
import { pathToFileURL } from 'node:url';
import { pool } from '../db.js';
import { REGLAS_COBRO, leerDatosCobro } from '../modules/cuidadores/cobro.js';

const DOMINIO = 'demo.redcuidadores.co';

// Azar reproducible a partir de una semilla (el id del cuidador): misma persona, mismos datos.
export function azarDesde(semilla) {
  let estado = Number(semilla) | 0;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Códigos de banco reales de cada país (para que la CLABE, el IBAN o el routing se vean bien).
const CLABE_BANCO = { 'BBVA México': '012', Banorte: '072', 'Santander México': '014', Banamex: '002', 'HSBC México': '021', 'Scotiabank México': '044', 'Banco Azteca': '127', Inbursa: '036' };
const IBAN_BANCO = { 'Banco Santander': '0049', BBVA: '0182', CaixaBank: '2100', 'Banco Sabadell': '0081', Bankinter: '0128', ING: '1465', Unicaja: '2103' };
const ROUTING = { Chase: '021000021', 'Bank of America': '026009593', 'Wells Fargo': '121000248', Citibank: '021000089', 'U.S. Bank': '091000022', 'Capital One': '051405515', 'PNC Bank': '043000096' };

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function herramientas(r) {
  const uno = (lista) => lista[Math.floor(r() * lista.length)];
  const digitos = (n) => Array.from({ length: n }, () => Math.floor(r() * 10)).join('');
  const letras = (n) => Array.from({ length: n }, () => uno(LETRAS)).join('');
  return { uno, digitos, letras, prob: (p) => r() < p };
}

// CLABE: 3 de banco + 3 de plaza + 11 de cuenta + dígito de control (pesos 3, 7, 1).
function clabe(banco, digitos) {
  const base = `${CLABE_BANCO[banco]}${digitos(3)}${digitos(11)}`;
  const suma = [...base].reduce((s, d, i) => s + ((Number(d) * [3, 7, 1][i % 3]) % 10), 0);
  return `${base}${(10 - (suma % 10)) % 10}`;
}

// IBAN español: ES + 2 de control + entidad (4) + oficina (4) + DC (2) + cuenta (10).
function iban(banco, digitos) {
  const dc = (texto) => {
    const pesos = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];
    const s = [...texto.padStart(10, '0')].reduce((t, d, i) => t + Number(d) * pesos[i], 0);
    const v = 11 - (s % 11);
    return v === 11 ? 0 : v === 10 ? 1 : v;
  };
  const entidad = IBAN_BANCO[banco];
  const oficina = digitos(4);
  const cuenta = digitos(10);
  const bban = `${entidad}${oficina}${dc(`00${entidad}${oficina}`)}${dc(cuenta)}${cuenta}`;
  // ES = 14 28; control = 98 - (bban + 142800 mod 97).
  const resto = [...`${bban}142800`].reduce((m, d) => (m * 10 + Number(d)) % 97, 0);
  return `ES${String(98 - resto).padStart(2, '0')}${bban}`;
}

// CPF con sus dos dígitos verificadores.
function cpf(digitos) {
  const n = [...digitos(9)].map(Number);
  for (const largo of [9, 10]) {
    const s = n.slice(0, largo).reduce((t, d, i) => t + d * (largo + 1 - i), 0);
    n.push(((s * 10) % 11) % 10);
  }
  return n.join('');
}

// DNI: 8 dígitos y la letra de control.
const dni = (digitos) => {
  const numero = digitos(8);
  return `${numero}${'TRWAGMYFPDXBNJZSQVHLCKE'[Number(numero) % 23]}`;
};

const sinTildes = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '');

// Datos de cobro inventados y válidos para el país. r: función de azar (0 a 1).
// Devuelve { tipo, titular, documento, entidad, tipoCuenta, numero } o null si el país no tiene reglas.
export function datoCobroDemo(pais, nombre, r) {
  const reglas = REGLAS_COBRO[pais];
  if (!reglas) return null;
  const { uno, digitos, letras, prob } = herramientas(r);
  const banco = uno(reglas.bancos);
  const tipoCuenta = prob(0.75) ? 'ahorros' : 'corriente';
  const cuentaBancaria = (numero) => ({ tipo: 'cuenta_bancaria', entidad: banco, tipoCuenta, numero });
  const billetera = (entidad, numero) => ({ tipo: 'billetera', entidad, tipoCuenta: null, numero });
  const [nombre1, apellido1 = 'demo'] = sinTildes(nombre).split(' ');

  let cobro;
  let documento;
  switch (pais) {
    case 'CO':
      documento = `${uno(['10', '52', '79', '80', '1020'])}${digitos(7)}`;
      cobro = prob(0.7)
        ? cuentaBancaria(digitos(uno([10, 11])))
        : billetera(uno(['Nequi', 'Daviplata']), `3${uno(['00', '01', '04', '10', '12', '15', '20', '50'])}${digitos(7)}`);
      break;
    case 'MX':
      documento = `${letras(4)}${digitos(6)}${letras(1)}${digitos(2)}`;
      cobro = prob(0.75) ? cuentaBancaria(clabe(banco, digitos)) : billetera('Mercado Pago', `55${digitos(8)}`);
      break;
    case 'BR':
      documento = cpf(digitos);
      cobro = prob(0.6)
        ? cuentaBancaria(`${digitos(4)}/${digitos(uno([5, 6, 8]))}-${digitos(1)}`)
        : billetera('Pix', cpf(digitos));
      break;
    case 'US':
      documento = `9${digitos(2)}-${uno(['70', '78', '83', '88', '90'])}-${digitos(4)}`;
      cobro = prob(0.7)
        ? cuentaBancaria(`${ROUTING[banco]}/${digitos(uno([9, 10, 12]))}`)
        : billetera('PayPal', `${nombre1}.${apellido1}${digitos(2)}@example.com`);
      break;
    case 'ES':
      documento = dni(digitos);
      cobro = prob(0.7) ? cuentaBancaria(iban(banco, digitos)) : billetera('Bizum', `6${digitos(8)}`);
      break;
    default:
      return null;
  }
  // Misma validación que la API: si algo no cuadra, mejor fallar aquí que guardar un dato malo.
  const { datos, error } = leerDatosCobro({ ...cobro, titular: nombre, documento }, pais, null);
  if (error) throw new Error(`Dato de cobro demo inválido (${pais}): ${error}`);
  return datos;
}

// Inserta los datos de cobro de una lista de cuidadores [{ id, nombre, pais }]. Devuelve cuántos insertó.
export async function insertarCobroDemo(db, cuidadores, azar) {
  let insertados = 0;
  for (const c of cuidadores) {
    const d = datoCobroDemo(c.pais?.trim(), c.nombre, azar ?? azarDesde(c.id));
    if (!d) continue;
    const r = await db.query(
      `INSERT INTO datos_cobro (usuario_id, tipo, titular, documento, entidad, tipo_cuenta, numero)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (usuario_id) DO NOTHING`,
      [c.id, d.tipo, d.titular, d.documento, d.entidad, d.tipoCuenta, d.numero]
    );
    insertados += r.rowCount;
  }
  return insertados;
}

async function main() {
  const r = await pool.query(
    `SELECT u.id, u.nombre, u.pais FROM usuarios u
      WHERE u.rol = 'cuidador' AND u.correo LIKE $1
        AND NOT EXISTS (SELECT 1 FROM datos_cobro d WHERE d.usuario_id = u.id)
      ORDER BY u.id`,
    [`%@${DOMINIO}`]
  );
  const n = await insertarCobroDemo(pool, r.rows);
  console.log(`Datos de cobro demo: ${n} cuidadores nuevos (de ${r.rows.length} sin datos).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => pool.end());
}
