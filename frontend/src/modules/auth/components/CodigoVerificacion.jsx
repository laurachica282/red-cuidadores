import { useRef } from 'react';
import './CodigoVerificacion.css';

const LARGO = 6;

// `valor` es el texto con los dígitos escritos (hasta 6); `onChange` recibe el texto nuevo.
export default function CodigoVerificacion({ valor, onChange, deshabilitado = false }) {
  const casillas = useRef([]);
  const digitos = Array.from({ length: LARGO }, (_, i) => valor[i] ?? '');

  const enfocar = (i) => casillas.current[Math.min(Math.max(i, 0), LARGO - 1)]?.focus();

  const cambiar = (i, e) => {
    const nuevos = e.target.value.replace(/\D/g, '');
    if (!nuevos) return;
    // Un dígito reemplaza la casilla; si llegan varios (autocompletado) se reparten.
    const base = digitos.slice();
    [...nuevos].slice(0, LARGO - i).forEach((d, k) => { base[i + k] = d; });
    onChange(base.join('').slice(0, LARGO));
    enfocar(i + nuevos.length);
  };

  const teclear = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const base = digitos.slice();
      if (base[i]) {
        base[i] = '';
        onChange(base.join(''));
      } else if (i > 0) {
        base[i - 1] = '';
        onChange(base.join(''));
        enfocar(i - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      enfocar(i - 1);
    } else if (e.key === 'ArrowRight') {
      enfocar(i + 1);
    }
  };

  const pegar = (e) => {
    const pegado = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LARGO);
    if (!pegado) return;
    e.preventDefault();
    onChange(pegado);
    enfocar(pegado.length);
  };

  return (
    <div className="codigo" role="group" aria-label="Código de verificación de 6 dígitos">
      {digitos.map((d, i) => (
        <input
          key={i}
          ref={(el) => { casillas.current[i] = el; }}
          className="codigo-casilla"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={LARGO}
          aria-label={`Dígito ${i + 1}`}
          value={d}
          disabled={deshabilitado}
          onChange={(e) => cambiar(i, e)}
          onKeyDown={(e) => teclear(i, e)}
          onPaste={pegar}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
