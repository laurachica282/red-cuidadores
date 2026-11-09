const base = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const IconAtras = (p) => <svg {...base} {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>;
export const IconChat = (p) => <svg {...base} {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>;
export const IconAlerta = (p) => (
  <svg {...base} {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
);
export const IconCamara = (p) => (
  <svg {...base} {...p}><path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const IconReloj = (p) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
export const IconTelefono = (p) => (
  <svg {...base} {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>
);
export const IconEnviar = (p) => <svg {...base} {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>;
export const IconMas = (p) => <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const IconCerrar = (p) => <svg {...base} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>;
export const IconFlecha = (p) => <svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>;
export const IconCruz = (p) => <svg {...base} {...p}><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" /></svg>;
export const IconCheck = (p) => <svg {...base} strokeWidth="2.2" {...p}><path d="m5 12 5 5 9-10" /></svg>;
export const IconCampana = (p) => (
  <svg {...base} {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
);
export const IconCalendario = (p) => (
  <svg {...base} {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M9 15l2 2 4-4" /></svg>
);
