import { correoConfigurado, enviarCorreo } from '../../shared/mailer.js';

// Avisa por correo. Sin correo configurado (Brevo o SMTP) imprime el aviso en consola (desarrollo).
export async function notificar(correo, asunto, texto) {
  try {
    if (!correoConfigurado()) {
      console.log(`[aviso] Para ${correo} · ${asunto}: ${texto}`);
      return;
    }
    await enviarCorreo({ para: correo, asunto, texto });
  } catch (e) {
    // Un fallo de correo no debe tumbar la aprobación o el rechazo.
    console.error('[aviso] No se pudo enviar el correo:', e.message);
  }
}
