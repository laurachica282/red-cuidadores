import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { IconEscudo } from './Iconos.jsx';

const MARGEN = 16;

const fechaLarga = (t) => new Date(t).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

// HU-13 en versión corta: "Verificado". Al pasar el mouse (o tocarla en el celular) explica qué significa.
export default function InsigniaVerificado({ venceEn, nombre }) {
  const [abierta, setAbierta] = useState(false);
  const caja = useRef(null);
  const globo = useRef(null);
  const [desplazar, setDesplazar] = useState(0);
  const id = useId();

  // Si el globo se sale por la derecha de la pantalla, se corre a la izquierda lo necesario.
  useLayoutEffect(() => {
    if (!abierta || !globo.current) return;
    const { right } = globo.current.getBoundingClientRect();
    const sobra = right - (window.innerWidth - MARGEN);
    setDesplazar((d) => Math.max(0, d + sobra));
  }, [abierta]);

  // Se cierra al tocar fuera o con Escape.
  useEffect(() => {
    if (!abierta) return undefined;
    const fuera = (e) => { if (!caja.current?.contains(e.target)) setAbierta(false); };
    const tecla = (e) => { if (e.key === 'Escape') setAbierta(false); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierta]);

  return (
    <span className="bs-insignia" ref={caja} onMouseEnter={() => setAbierta(true)} onMouseLeave={() => setAbierta(false)}>
      <button type="button" className="bs-insignia-boton" aria-expanded={abierta} aria-describedby={abierta ? id : undefined}
        onClick={() => setAbierta((a) => !a)}>
        <IconEscudo width="15" height="15" /> Verificado
      </button>
      {abierta && (
        <span id={id} ref={globo} role="tooltip" className="bs-insignia-globo"
          style={{ left: -desplazar, '--flecha': `${22 + desplazar}px` }}>
          <strong>Antecedentes verificados</strong>
          <span>
            Revisamos el documento de identidad, una selfie y el certificado de antecedentes de {nombre ?? 'este cuidador'}.
          </span>
          {venceEn && <small>La verificación está vigente hasta el {fechaLarga(venceEn)}. Se renueva cada 12 meses.</small>}
        </span>
      )}
    </span>
  );
}
