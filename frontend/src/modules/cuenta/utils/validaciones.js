// Mismas reglas que el backend (modules/cuenta/validacion.js), para avisar antes de enviar.
// El backend siempre vuelve a validar: esto es solo comodidad.
// Cada función devuelve la clave del mensaje de error (se traduce con t()), o '' si el valor está bien.

export const validarNombre = (v) => {
  const t = v.trim();
  if (t.length < 2) return 'cuenta.val.nombreCorto';
  if (t.length > 120) return 'cuenta.val.nombreLargo';
  return '';
};

export const validarTelefono = (v) => {
  const t = v.trim();
  if (!t) return '';
  return /^\+?[0-9][0-9\s-]{5,18}[0-9]$/.test(t) ? '' : 'cuenta.val.telefono';
};

export const validarCiudad = (v) => {
  const t = v.trim();
  if (!t) return '';
  return t.length < 2 ? 'cuenta.val.ciudadCorta' : t.length > 80 ? 'cuenta.val.ciudadLarga' : '';
};

export const validarCorreo = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) && v.trim().length <= 160 ? '' : 'cuenta.val.correo';

export const validarCodigo = (v) => (/^\d{6}$/.test(v.trim()) ? '' : 'cuenta.val.codigo');

// Solo deja dígitos y corta a 6, para pegar o escribir el código sin errores.
export const limpiarCodigo = (v) => v.replace(/\D/g, '').slice(0, 6);

// carlos@correo.com -> ca•••••@correo.com (como en el mockup de verificación)
export const enmascarar = (correo) => {
  const [usuario, dominio] = String(correo).split('@');
  if (!dominio) return '•••';
  const visibles = usuario.slice(0, Math.min(2, usuario.length - 1));
  return `${visibles}${'•'.repeat(Math.max(usuario.length - visibles.length, 3))}@${dominio}`;
};
