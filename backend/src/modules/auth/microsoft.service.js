import { createRemoteJWKSet, jwtVerify } from 'jose';

// Claves públicas con las que Microsoft firma los id_token (cuentas personales y de organizaciones).
// jose las descarga una vez y las guarda; si Microsoft las rota, las vuelve a pedir.
const CLAVES = createRemoteJWKSet(new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys'));

// Inquilino de las cuentas personales de Microsoft (Outlook, Hotmail, Live).
const INQUILINO_PERSONAL = '9188040d-6c67-4c5b-b112-36a304b66dad';

export const microsoftConfigurado = () => Boolean(process.env.MICROSOFT_CLIENT_ID);

// En cuentas de organización el administrador puede poner cualquier correo sin verificarlo ("nOAuth").
// Solo se confía en el correo si es una cuenta personal o si Microsoft lo marca como verificado (xms_edov).
const correoConfiable = (p) => p.tid === INQUILINO_PERSONAL || p.xms_edov === true || p.xms_edov === 1 || p.xms_edov === '1';

// Verifica el id_token (firma, vencimiento, audience y emisor) y devuelve el perfil para entrarConProveedor.
// Lanza si el token no es válido.
export async function verificarCredencialMicrosoft(idToken) {
  const { payload: p } = await jwtVerify(idToken, CLAVES, { audience: process.env.MICROSOFT_CLIENT_ID });
  // Con el endpoint "common" el emisor depende del inquilino de la cuenta: debe coincidir con su tid.
  if (!p.tid || p.iss !== `https://login.microsoftonline.com/${p.tid}/v2.0`) {
    throw new Error('El emisor del token de Microsoft no es válido');
  }
  const correo = typeof p.email === 'string' ? p.email : null;
  if (!p.sub || !correo) throw new Error('El token de Microsoft no trae sub o correo');
  return { sub: p.sub, correo, nombre: p.name, correoVerificado: correoConfiable(p) };
}
