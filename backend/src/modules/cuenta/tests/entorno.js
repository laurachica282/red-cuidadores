// Debe importarse PRIMERO: apunta el pool compartido (db.js, que usa verificarToken del módulo auth)
// a la base de pruebas y fija el secreto de los tokens, antes de que cualquier módulo se cargue.
const database = process.env.TEST_DB_NAME ?? 'red_cuidadores_test';
if (!database.endsWith('_test')) {
  throw new Error(`TEST_DB_NAME debe terminar en _test (recibido: ${database})`);
}

process.env.DB_HOST = process.env.TEST_DB_HOST ?? '127.0.0.1';
process.env.DB_PORT = process.env.TEST_DB_PORT ?? '5432';
process.env.DB_NAME = database;
process.env.DB_USER = process.env.TEST_DB_USER ?? 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? '';
process.env.JWT_SECRET ??= 'secreto-solo-para-pruebas';
