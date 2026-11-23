import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Desplegable.css';

// Reemplazo de <select> con la lista estilada (la lista nativa la dibuja el sistema y no se puede estilar).
// Se usa igual que un select: <Desplegable id value onChange className="input"> <option value="x">X</option> </Desplegable>
// onChange recibe { target: { value, name, id } }, como el evento de un select.

const textoDe = (nodo) => {
  if (nodo == null || typeof nodo === 'boolean') return '';
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(textoDe).join('');
  if (isValidElement(nodo)) return textoDe(nodo.props.children);
  return '';
};

const leerOpciones = (children) => Children.toArray(children)
  .filter((c) => isValidElement(c) && c.type === 'option')
  .map((c) => ({ valor: String(c.props.value ?? textoDe(c.props.children)), texto: textoDe(c.props.children), deshabilitada: Boolean(c.props.disabled) }));

export default function Desplegable({
  id, name, value, onChange, children, className = 'input', disabled = false, required = false, ...resto
}) {
  const idLista = useId();
  const opciones = leerOpciones(children);
  const valor = String(value ?? '');
  const elegida = opciones.find((o) => o.valor === valor);
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(-1);
  const [pos, setPos] = useState(null);
  const boton = useRef(null);
  const lista = useRef(null);
  const busqueda = useRef({ texto: '', hasta: 0 });

  const habilitadas = opciones.map((o, i) => (o.deshabilitada ? -1 : i)).filter((i) => i >= 0);

  const ubicar = () => {
    const r = boton.current?.getBoundingClientRect();
    if (!r) return;
    const alto = Math.min(280, opciones.length * 44 + 12);
    const abajo = window.innerHeight - r.bottom;
    const arriba = abajo < alto + 8 && r.top > abajo;
    setPos({ left: r.left, width: r.width, top: arriba ? undefined : r.bottom + 6, bottom: arriba ? window.innerHeight - r.top + 6 : undefined });
  };

  const abrir = () => {
    if (disabled || opciones.length === 0) return;
    ubicar();
    const i = opciones.findIndex((o) => o.valor === valor);
    setActiva(i >= 0 && !opciones[i].deshabilitada ? i : habilitadas[0] ?? -1);
    setAbierto(true);
  };
  const cerrar = (enfocar = true) => { setAbierto(false); if (enfocar) boton.current?.focus(); };

  const elegir = (i) => {
    const o = opciones[i];
    if (!o || o.deshabilitada) return;
    if (o.valor !== valor) onChange?.({ target: { value: o.valor, name, id }, currentTarget: { value: o.valor, name, id } });
    cerrar();
  };

  // Cierra al tocar fuera; se reubica si la página se mueve.
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => {
      if (!boton.current?.contains(e.target) && !lista.current?.contains(e.target)) cerrar(false);
    };
    document.addEventListener('pointerdown', fuera);
    window.addEventListener('resize', ubicar);
    window.addEventListener('scroll', ubicar, true);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      window.removeEventListener('resize', ubicar);
      window.removeEventListener('scroll', ubicar, true);
    };
  });

  // La opción activa siempre a la vista.
  useLayoutEffect(() => {
    if (abierto && activa >= 0) lista.current?.children[activa]?.scrollIntoView({ block: 'nearest' });
  }, [abierto, activa]);

  const mover = (paso) => {
    if (habilitadas.length === 0) return;
    const pos = habilitadas.indexOf(activa);
    const siguiente = pos < 0 ? 0 : Math.min(habilitadas.length - 1, Math.max(0, pos + paso));
    setActiva(habilitadas[siguiente]);
  };

  // Escribir una letra salta a la primera opción que empieza así.
  const buscar = (letra) => {
    const ahora = Date.now();
    const b = busqueda.current;
    b.texto = (ahora < b.hasta ? b.texto : '') + letra.toLowerCase();
    b.hasta = ahora + 700;
    const i = opciones.findIndex((o) => !o.deshabilitada && o.texto.toLowerCase().startsWith(b.texto));
    if (i >= 0) { if (abierto) setActiva(i); else elegir(i); }
  };

  const teclado = (e) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); if (abierto) mover(1); else abrir(); break;
      case 'ArrowUp': e.preventDefault(); if (abierto) mover(-1); else abrir(); break;
      case 'Home': if (abierto) { e.preventDefault(); setActiva(habilitadas[0]); } break;
      case 'End': if (abierto) { e.preventDefault(); setActiva(habilitadas[habilitadas.length - 1]); } break;
      case 'Enter': case ' ':
        e.preventDefault();
        if (abierto) elegir(activa); else abrir();
        break;
      case 'Escape': if (abierto) { e.preventDefault(); cerrar(); } break;
      case 'Tab': if (abierto) cerrar(false); break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) buscar(e.key);
    }
  };

  return (
    <div className="dsp">
      <button
        {...resto}
        ref={boton}
        id={id}
        type="button"
        className={`${className} dsp-boton${abierto ? ' dsp-boton--abierto' : ''}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-activedescendant={abierto && activa >= 0 ? `${idLista}-${activa}` : undefined}
        disabled={disabled}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={teclado}
      >
        <span className={`dsp-texto${elegida && elegida.valor !== '' ? '' : ' dsp-texto--vacio'}`}>{elegida?.texto ?? ''}</span>
        <svg className="dsp-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {/* Select nativo oculto: conserva `required` y `name` para la validación del formulario. */}
      <select className="dsp-nativo" name={name} value={valor} required={required} disabled={disabled}
        tabIndex={-1} aria-hidden="true" onChange={() => {}} onFocus={() => boton.current?.focus()}>
        {opciones.map((o) => <option key={o.valor} value={o.valor} disabled={o.deshabilitada}>{o.texto}</option>)}
      </select>

      {abierto && pos && createPortal(
        <ul ref={lista} id={idLista} role="listbox" className="dsp-lista"
          style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}>
          {opciones.map((o, i) => (
            <li
              key={o.valor}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={o.valor === valor}
              aria-disabled={o.deshabilitada || undefined}
              className={`dsp-opcion${i === activa ? ' dsp-opcion--activa' : ''}${o.valor === valor ? ' dsp-opcion--elegida' : ''}${o.deshabilitada ? ' dsp-opcion--off' : ''}`}
              onPointerEnter={() => !o.deshabilitada && setActiva(i)}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => elegir(i)}
            >
              <span>{o.texto}</span>
              {o.valor === valor && (
                <svg className="dsp-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              )}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
}
