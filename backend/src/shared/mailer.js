import nodemailer from 'nodemailer';

// Envío de correos compartido por los módulos.
// - Con BREVO_API_KEY: API HTTP de Brevo (Render gratis bloquea los puertos SMTP).
// - Sin ella pero con SMTP_* completo: nodemailer (desarrollo local).
// - Sin ninguno: solo lo deja en consola (desarrollo).
const VARIABLES_SMTP = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'];
const URL_BREVO = 'https://api.brevo.com/v3/smtp/email';
const TIEMPO_MAXIMO_MS = 10_000;

// Devuelve 'brevo', 'smtp' o null según lo que haya configurado.
export function correoConfigurado(env = process.env) {
  if (env.BREVO_API_KEY) return 'brevo';
  if (VARIABLES_SMTP.every((v) => env[v])) return 'smtp';
  return null;
}

// "Nombre <correo@x.com>" -> { name, email }; "correo@x.com" -> { email }
function parsearRemitente(from = '') {
  const m = String(from).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return m[1] ? { name: m[1], email: m[2].trim() } : { email: m[2].trim() };
  return { email: String(from).trim() };
}

async function enviarPorBrevo({ para, nombre, asunto, html, texto }, env) {
  const destinatario = nombre ? { email: para, name: nombre } : { email: para };
  const cuerpo = {
    sender: parsearRemitente(env.MAIL_FROM),
    to: [destinatario],
    subject: asunto,
    textContent: texto,
  };
  if (html) cuerpo.htmlContent = html;

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS);
  let res;
  try {
    res = await fetch(URL_BREVO, {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(cuerpo),
      signal: control.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Brevo: tiempo de espera agotado (10 s)');
    throw e;
  } finally {
    clearTimeout(temporizador);
  }

  if (!res.ok) {
    const crudo = await res.text().catch(() => '');
    let mensaje = crudo;
    try {
      mensaje = JSON.parse(crudo).message || crudo;
    } catch {
      // respuesta no JSON: se usa el texto tal cual
    }
    throw new Error(`Brevo ${res.status}: ${mensaje || res.statusText}`);
  }
}

async function enviarPorSmtp({ para, asunto, html, texto }, env) {
  const transporte = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  const mensaje = { from: env.MAIL_FROM, to: para, subject: asunto, text: texto };
  if (html) mensaje.html = html;
  await transporte.sendMail(mensaje);
}

export async function enviarCorreo({ para, nombre, asunto, html, texto }, { env = process.env } = {}) {
  const modo = correoConfigurado(env);
  const datos = { para, nombre, asunto, html, texto };
  if (modo === 'brevo') return enviarPorBrevo(datos, env);
  if (modo === 'smtp') return enviarPorSmtp(datos, env);
  console.log(`[correo] Sin configurar. Para ${para} · ${asunto}`);
}
