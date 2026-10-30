import nodemailer from 'nodemailer';
import { ErrorHttp } from './errores.js';

// Envío de correos. Con SMTP_HOST configurado usa SMTP real; sin él, en desarrollo
// imprime el correo en la consola del backend para poder probar los flujos con código.
// En producción sin SMTP falla en vez de fingir que envió algo.
export function crearCorreo({ env = process.env, log = console } = {}) {
  const transporte = env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT ?? 587),
        secure: Number(env.SMTP_PORT) === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      })
    : null;
  const remitente = env.SMTP_FROM ?? 'Red de Cuidadores <no-responder@red-cuidadores.local>';

  return {
    async enviar({ para, asunto, texto }) {
      if (!transporte) {
        if (env.NODE_ENV === 'production') {
          throw new ErrorHttp(502, 'No pudimos enviar el correo. Inténtalo más tarde.');
        }
        log.info(`\n[correo simulado] Para: ${para}\nAsunto: ${asunto}\n${texto}\n`);
        return;
      }
      try {
        await transporte.sendMail({ from: remitente, to: para, subject: asunto, text: texto });
      } catch (e) {
        log.error(`No se pudo enviar el correo a ${enmascarar(para)}: ${e.message}`);
        throw new ErrorHttp(502, 'No pudimos enviar el correo. Inténtalo más tarde.');
      }
    },
  };
}

// carlos@correo.com -> c****@correo.com (para avisos y registros sin exponer la dirección completa)
export function enmascarar(correo) {
  const [usuario, dominio] = String(correo).split('@');
  if (!dominio) return '***';
  return `${usuario[0]}${'*'.repeat(Math.max(usuario.length - 1, 3))}@${dominio}`;
}
