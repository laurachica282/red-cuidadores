import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useIdioma } from '@/modules/region';
import { IconEscudo } from './Iconos.jsx';
import '../i18n.js';

const MARGEN = 16;

// HU-13 en versión corta: "Verificado". Al pasar el mouse (o tocarla en el celular) explica qué significa.
export default function InsigniaVerificado({ venceEn, nombre }) {
  const [abierta, setAbierta] = useState(false);
  const caja = useRef(null);
  const globo = useRef(null);
  const [desplazar, setDesplazar] = useState(0);
  const id = useId();
  const { t, fecha } = useIdioma();

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
        <IconEscudo width="15" height="15" /> {t('busqueda.verificado')}
      </button>
      {abierta && (
        <span id={id} ref={globo} role="tooltip" className="bs-insignia-globo"
          style={{ left: -desplazar, '--flecha': `${22 + desplazar}px` }}>
          <strong>{t('busqueda.antecedentesVerificados')}</strong>
          <span>{t('busqueda.revisamos', { nombre: nombre ?? t('busqueda.esteCuidador') })}</span>
          {venceEn && <small>{t('busqueda.vigenteHasta', { fecha: fecha(venceEn) })}</small>}
        </span>
      )}
    </span>
  );
}
