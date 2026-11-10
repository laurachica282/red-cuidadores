// Decoración de las pantallas de acceso: camino de huellitas y perro + gato asomándose.

// Posición (en % de la pantalla) y giro de cada huellita del camino. Alterna pata izquierda/derecha.
const CAMINO = [
  { x: 6, y: 92, r: 20 }, { x: 12, y: 84, r: 30 }, { x: 14, y: 74, r: 15 }, { x: 21, y: 67, r: 35 },
  { x: 22, y: 56, r: 10 }, { x: 30, y: 50, r: 40 }, { x: 70, y: 30, r: 60 }, { x: 77, y: 25, r: 45 },
  { x: 80, y: 16, r: 70 }, { x: 88, y: 12, r: 50 }, { x: 90, y: 3, r: 75 },
];

export function CaminoHuellas() {
  return (
    <div className="huellas-camino" aria-hidden="true">
      {CAMINO.map((h, i) => (
        <span
          key={i}
          className="huella"
          style={{ left: `${h.x}%`, top: `${h.y}%`, '--giro': `${h.r}deg`, animationDelay: `${i * 0.45}s` }}
        />
      ))}
    </div>
  );
}

export function PerroYGato() {
  return (
    <svg className="perro-gato" viewBox="0 0 220 110" aria-hidden="true">
      {/* Gato */}
      <g className="perro-gato__gato">
        <path d="M128 52 L134 22 L152 42 Z" fill="#f4b942" />
        <path d="M196 52 L190 22 L172 42 Z" fill="#f4b942" />
        <path d="M133 46 L136 31 L146 42 Z" fill="#ffd9a0" />
        <path d="M191 46 L188 31 L178 42 Z" fill="#ffd9a0" />
        <ellipse cx="162" cy="72" rx="40" ry="36" fill="#f4b942" />
        <path d="M150 44 q4 8 0 14 M162 40 q4 9 0 16 M174 44 q4 8 0 14" stroke="#e09a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
        <g className="parpadeo">
          <ellipse cx="148" cy="70" rx="4.5" ry="6" fill="#0b1f3a" />
          <ellipse cx="176" cy="70" rx="4.5" ry="6" fill="#0b1f3a" />
        </g>
        <circle cx="149.5" cy="68" r="1.5" fill="#fff" />
        <circle cx="177.5" cy="68" r="1.5" fill="#fff" />
        <path d="M158 80 h8 l-4 4 z" fill="#ff8a65" />
        <path d="M162 84 q-4 6 -9 3 M162 84 q4 6 9 3" stroke="#0b1f3a" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M140 80 h-18 M140 85 l-17 4 M184 80 h18 M184 85 l17 4" stroke="#0b1f3a" strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
        <ellipse cx="141" cy="84" rx="5" ry="3" fill="#ff8a65" opacity=".35" />
        <ellipse cx="183" cy="84" rx="5" ry="3" fill="#ff8a65" opacity=".35" />
      </g>

      {/* Perro */}
      <g className="perro-gato__perro">
        <ellipse cx="66" cy="70" rx="42" ry="38" fill="#c98b5a" />
        <ellipse cx="66" cy="84" rx="24" ry="18" fill="#f3d9bf" />
        <path className="oreja-izq" d="M30 44 q-20 10 -12 46 q10 4 18 -10 z" fill="#7a4a2a" />
        <path className="oreja-der" d="M102 44 q20 10 12 46 q-10 4 -18 -10 z" fill="#7a4a2a" />
        <ellipse cx="80" cy="62" rx="12" ry="11" fill="#7a4a2a" opacity=".85" />
        <g className="parpadeo">
          <ellipse cx="52" cy="64" rx="5" ry="6" fill="#0b1f3a" />
          <ellipse cx="80" cy="64" rx="5" ry="6" fill="#0b1f3a" />
        </g>
        <circle cx="53.5" cy="62" r="1.8" fill="#fff" />
        <circle cx="81.5" cy="62" r="1.8" fill="#fff" />
        <ellipse cx="66" cy="78" rx="8" ry="6" fill="#0b1f3a" />
        <path d="M66 84 v5 q-6 6 -12 1 M66 89 q6 6 12 1" stroke="#0b1f3a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path className="lengua" d="M62 92 q4 12 8 0 z" fill="#ff8a65" />
      </g>

      {/* Patitas apoyadas en el borde */}
      <g>
        <rect x="40" y="98" width="20" height="14" rx="7" fill="#c98b5a" />
        <rect x="74" y="98" width="20" height="14" rx="7" fill="#c98b5a" />
        <rect x="140" y="98" width="18" height="14" rx="7" fill="#f4b942" />
        <rect x="168" y="98" width="18" height="14" rx="7" fill="#f4b942" />
      </g>
    </svg>
  );
}
