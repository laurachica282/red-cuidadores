import nodemailer from 'nodemailer';

const smtpConfigurado = () =>
  ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'].every((v) => process.env[v]);

// Correo de soporte que recibe las emergencias (HU-28). Sin él, el aviso queda en la consola.
export const correoSoporte = () => process.env.SOPORTE_CORREO || null;

// Envía un correo. Sin SMTP (desarrollo) lo muestra en consola. Devuelve true si se envió.
export async function avisar(correo, asunto, texto) {
  if (!correo) return false;
  try {
    if (!smtpConfigurado()) {
      console.log(`[seguimiento] Para ${correo} · ${asunto}\n${texto}`);
      return true;
    }
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await t.sendMail({ from: process.env.MAIL_FROM, to: correo, subject: asunto, text: texto });
    return true;
  } catch (e) {
    // Un correo que falla no debe impedir registrar la emergencia.
    console.error('[seguimiento] No se pudo enviar el correo:', e.message);
    return false;
  }
}
