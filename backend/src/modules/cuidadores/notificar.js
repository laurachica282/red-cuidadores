import nodemailer from 'nodemailer';

const smtpConfigurado = () =>
  ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'].every((v) => process.env[v]);

// Avisa por correo. Sin SMTP configurado imprime el aviso en consola (desarrollo).
export async function notificar(correo, asunto, texto) {
  try {
    if (!smtpConfigurado()) {
      console.log(`[aviso] Para ${correo} · ${asunto}: ${texto}`);
      return;
    }
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await t.sendMail({ from: process.env.MAIL_FROM, to: correo, subject: asunto, text: texto });
  } catch (e) {
    // Un fallo de correo no debe tumbar la aprobación o el rechazo.
    console.error('[aviso] No se pudo enviar el correo:', e.message);
  }
}
