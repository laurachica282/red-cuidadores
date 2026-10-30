import nodemailer from 'nodemailer';

const escapar = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const smtpConfigurado = () =>
  ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'].every((v) => process.env[v]);

const html = (nombre, codigo) => `
<div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#0b1f3a">
  <h2 style="margin:0 0 12px">Revisa tu correo</h2>
  <p>Hola ${escapar(nombre)}, usa este código para verificar tu cuenta en Red de Cuidadores:</p>
  <p style="font-size:36px;font-weight:700;letter-spacing:8px;text-align:center;margin:24px 0">${escapar(codigo)}</p>
  <p>El código vence en 10 minutos.</p>
  <p style="font-size:13px;color:#4a5d70">Nunca compartas este código con nadie, ni siquiera con nosotros. Si no lo pediste, ignora este mensaje.</p>
</div>`;

// Sin credenciales SMTP imprime el código en consola (desarrollo).
export async function enviarCodigo(correo, nombre, codigo) {
  if (!smtpConfigurado()) {
    console.log(`[correo] SMTP sin configurar. Código para ${correo}: ${codigo}`);
    return;
  }

  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporte.sendMail({
    from: process.env.MAIL_FROM,
    to: correo,
    subject: `Tu código de verificación: ${codigo}`,
    text: `Tu código de verificación es ${codigo}. Vence en 10 minutos. No lo compartas con nadie.`,
    html: html(nombre, codigo),
  });
}
