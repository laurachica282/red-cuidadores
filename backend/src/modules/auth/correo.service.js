import nodemailer from 'nodemailer';

const escapar = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const smtpConfigurado = () =>
  ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'].every((v) => process.env[v]);

// Textos propios de cada propósito del código.
const TEXTOS = {
  registro: {
    asunto: (codigo) => `Tu código de verificación: ${codigo}`,
    titulo: 'Revisa tu correo',
    frase: 'usa este código para verificar tu cuenta en Red de Cuidadores:',
    plano: (codigo) => `Tu código de verificación es ${codigo}. Vence en 10 minutos. No lo compartas con nadie.`,
  },
  recuperacion: {
    asunto: (codigo) => `Tu código para restablecer la contraseña: ${codigo}`,
    titulo: 'Restablece tu contraseña',
    frase: 'usa este código para restablecer tu contraseña en Red de Cuidadores:',
    plano: (codigo) =>
      `Tu código para restablecer la contraseña es ${codigo}. Vence en 10 minutos. No lo compartas con nadie. Si no lo pediste, ignora este mensaje.`,
  },
};

const html = (nombre, codigo, t) => `
<div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#0b1f3a">
  <h2 style="margin:0 0 12px">${t.titulo}</h2>
  <p>Hola ${escapar(nombre)}, ${t.frase}</p>
  <p style="font-size:36px;font-weight:700;letter-spacing:8px;text-align:center;margin:24px 0">${escapar(codigo)}</p>
  <p>El código vence en 10 minutos.</p>
  <p style="font-size:13px;color:#4a5d70">Nunca compartas este código con nadie, ni siquiera con nosotros. Si no lo pediste, ignora este mensaje.</p>
</div>`;

// Sin credenciales SMTP imprime el código en consola (desarrollo).
export async function enviarCodigo(correo, nombre, codigo, proposito = 'registro') {
  if (!smtpConfigurado()) {
    console.log(`[correo] SMTP sin configurar. Código (${proposito}) para ${correo}: ${codigo}`);
    return;
  }

  const t = TEXTOS[proposito];
  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporte.sendMail({
    from: process.env.MAIL_FROM,
    to: correo,
    subject: t.asunto(codigo),
    text: t.plano(codigo),
    html: html(nombre, codigo, t),
  });
}
