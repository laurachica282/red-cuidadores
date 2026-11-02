// Mismas reglas que el backend (modules/cuenta/validacion.js), para avisar antes de enviar.
// El backend siempre vuelve a validar: esto es solo comodidad.
// Cada función devuelve el mensaje de error, o '' si el valor está bien.

export const validarNombre = (v) => {
  const t = v.trim();
  if (t.length < 2) return 'El nombre es muy corto (mínimo 2 caracteres)';
  if (t.length > 120) return 'El nombre es muy largo (máximo 120 caracteres)';
  return '';
};

export const validarTelefono = (v) => {
  const t = v.trim();
  if (!t) return '';
  return /^\+?[0-9][0-9\s-]{5,18}[0-9]$/.test(t) ? '' : 'El teléfono solo lleva números, espacios o guiones';
};

export const validarCiudad = (v) => {
  const t = v.trim();
  if (!t) return '';
  return t.length < 2 ? 'La ciudad es muy corta' : t.length > 80 ? 'La ciudad es muy larga' : '';
};

export const validarCorreo = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) && v.trim().length <= 160 ? '' : 'Escribe un correo válido';

export const validarCodigo = (v) => (/^\d{6}$/.test(v.trim()) ? '' : 'El código tiene 6 dígitos');

// Solo deja dígitos y corta a 6, para pegar o escribir el código sin errores.
export const limpiarCodigo = (v) => v.replace(/\D/g, '').slice(0, 6);

// carlos@correo.com -> ca•••••@correo.com (como en el mockup de verificación)
export const enmascarar = (correo) => {
  const [usuario, dominio] = String(correo).split('@');
  if (!dominio) return '•••';
  const visibles = usuario.slice(0, Math.min(2, usuario.length - 1));
  return `${visibles}${'•'.repeat(Math.max(usuario.length - visibles.length, 3))}@${dominio}`;
};
