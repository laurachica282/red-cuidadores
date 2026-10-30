// Reglas del módulo en un solo lugar, para que no queden números sueltos por el código.

// HU-02/HU-06/HU-40: códigos de 6 dígitos.
export const CODIGO = {
  vigenciaMinutos: 10,
  maxIntentos: 5,
  reenvioSegundos: 60,
};

// HU-09: foto de perfil.
export const FOTO = {
  maxBytes: 2 * 1024 * 1024,
  extensiones: { jpeg: 'jpg', png: 'png', webp: 'webp' },
};

// HU-32.
export const EVENTOS_NOTIFICACION = ['reservas', 'reportes', 'mensajes', 'promociones'];
export const CANALES = ['push', 'correo', 'sms'];
export const PREFERENCIAS_POR_DEFECTO = {
  reservas: { push: true, correo: true, sms: false },
  reportes: { push: true, correo: true, sms: false },
  mensajes: { push: true, correo: false, sms: false },
  promociones: { push: false, correo: false, sms: false },
};

// HU-39: motivos para desactivar (se guarda el código, el texto lo pone la interfaz).
export const MOTIVOS_DESACTIVACION = ['ya_no_uso', 'privacidad', 'mala_experiencia', 'encontre_alternativa', 'otro'];

// RN-4: paz y salvo. Cada módulo dueño del dato registra su verificación (ver integraciones.js).
export const VERIFICACIONES_PAZ_Y_SALVO = {
  reservas_activas: 'Reservas activas',
  pagos_pendientes: 'Pagos pendientes',
  disputas_abiertas: 'Disputas abiertas',
  saldo_sin_liquidar: 'Saldo sin liquidar',
};

// HU-33.
export const MAX_COMENTARIO_RESENA = 1000;
