import { correoConfigurado, enviarCorreo } from '../../shared/mailer.js';

// Correo de soporte que recibe las emergencias (HU-28). Sin él, el aviso queda en la consola.
export const correoSoporte = () => process.env.SOPORTE_CORREO || null;

// Envía un correo. Sin SMTP (desarrollo) lo muestra en consola. Devuelve true si se envió.
export async function avisar(correo, asunto, texto) {
  if (!correo) return false;
  try {
    if (!correoConfigurado()) {
      console.log(`[seguimiento] Para ${correo} · ${asunto}\n${texto}`);
      return true;
    }
    await enviarCorreo({ para: correo, asunto, texto });
    return true;
  } catch (e) {
    // Un correo que falla no debe impedir registrar la emergencia.
    console.error('[seguimiento] No se pudo enviar el correo:', e.message);
    return false;
  }
}
