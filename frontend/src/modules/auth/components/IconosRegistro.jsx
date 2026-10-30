const base = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const IconFlechaAtras = (p) => (
  <svg {...base} {...p}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
);
export const IconCasa = (p) => (
  <svg {...base} {...p}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></svg>
);
export const IconHuella = (p) => (
  <svg {...base} {...p}><circle cx="5" cy="11" r="1.8" /><circle cx="9" cy="6" r="1.8" /><circle cx="15" cy="6" r="1.8" /><circle cx="19" cy="11" r="1.8" /><path d="M12 11c-3 0-5.5 3-5.5 5.5 0 1.7 1.3 2.5 2.7 2.5 1 0 1.8-.5 2.8-.5s1.8.5 2.8.5c1.4 0 2.7-.8 2.7-2.5C17.5 14 15 11 12 11Z" /></svg>
);
