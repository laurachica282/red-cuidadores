import { CODIGO } from './config.js';
import { enmascarar } from './correo.js';

const firma = '\n\nRed de Cuidadores';

export const plantillas = {
  codigoCambioCorreo: (codigo) => ({
    asunto: 'Confirma tu nuevo correo',
    texto: `Tu código para confirmar el nuevo correo es ${codigo}.\nVence en ${CODIGO.vigenciaMinutos} minutos. Si no fuiste tú, ignora este mensaje.${firma}`,
  }),
  avisoCambioSolicitado: (correoNuevo) => ({
    asunto: 'Se pidió cambiar el correo de tu cuenta',
    texto: `Alguien pidió cambiar el correo de tu cuenta a ${enmascarar(correoNuevo)}.\nSi fuiste tú, confirma el código que enviamos a esa dirección. Si no, cambia tu contraseña de inmediato.${firma}`,
  }),
  avisoCorreoCambiado: (correoNuevo) => ({
    asunto: 'El correo de tu cuenta fue cambiado',
    texto: `El correo de tu cuenta ahora es ${enmascarar(correoNuevo)}.\nSi no fuiste tú, contacta a soporte.${firma}`,
  }),
  codigoReactivacion: (codigo) => ({
    asunto: 'Código para reactivar tu cuenta',
    texto: `Tu código para reactivar tu cuenta es ${codigo}.\nVence en ${CODIGO.vigenciaMinutos} minutos. Si no fuiste tú, ignora este mensaje.${firma}`,
  }),
  avisoDesactivada: () => ({
    asunto: 'Tu cuenta fue desactivada',
    texto: `Tu cuenta quedó desactivada y tu perfil ya no es visible. Tus datos se conservan: puedes reactivarla cuando quieras desde la pantalla de inicio de sesión.${firma}`,
  }),
  avisoReactivada: () => ({
    asunto: 'Tu cuenta fue reactivada',
    texto: `Tu cuenta volvió a estar activa. Si no fuiste tú, contacta a soporte.${firma}`,
  }),
};
