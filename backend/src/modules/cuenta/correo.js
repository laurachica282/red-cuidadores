import { correoConfigurado, enviarCorreo } from '../../shared/mailer.js';
import { ErrorHttp } from './errores.js';

// Envío de correos con el mailer compartido (API de Brevo si hay BREVO_API_KEY; si no, SMTP con
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y MAIL_FROM). Sin ninguno, en desarrollo imprime
// el correo en la consola del backend para poder probar los flujos con código. En producción sin
// correo configurado falla en vez de fingir que envió algo.
export function crearCorreo({ env = process.env, log = console } = {}) {
  const configurado = correoConfigurado(env);

  return {
    async enviar({ para, asunto, texto }) {
      if (!configurado) {
        if (env.NODE_ENV === 'production') {
          throw new ErrorHttp(502, 'No pudimos enviar el correo. Inténtalo más tarde.');
        }
        log.info(`\n[correo simulado] Para: ${para}\nAsunto: ${asunto}\n${texto}\n`);
        return;
      }
      try {
        await enviarCorreo({ para, asunto, texto }, { env });
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
