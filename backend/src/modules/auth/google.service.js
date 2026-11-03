import { OAuth2Client } from 'google-auth-library';

const cliente = new OAuth2Client();

export const googleConfigurado = () => Boolean(process.env.GOOGLE_CLIENT_ID);

// Verifica el id_token (firma, vencimiento y audience) y devuelve el perfil para entrarConProveedor.
// Lanza si el token no es válido.
export async function verificarCredencialGoogle(credential) {
  const ticket = await cliente.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
  const p = ticket.getPayload();
  if (!p?.sub || !p.email) throw new Error('El token de Google no trae sub o correo');
  return { sub: p.sub, correo: p.email, nombre: p.name, correoVerificado: p.email_verified === true };
}
