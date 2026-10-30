import { useCallback, useEffect, useState } from 'react';

// Carga datos al abrir una pantalla y expone { datos, cargando, error, recargar }.
// `clave` identifica lo que se carga (por ejemplo un id de la ruta): si cambia, vuelve a cargar.
// Ignora la respuesta si la pantalla se cerró o la clave cambió antes de que llegara.
export function useCarga(cargar, clave = '') {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: '' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    cargar()
      .then((datos) => { if (vigente) setEstado({ datos, cargando: false, error: '' }); })
      .catch((err) => { if (vigente) setEstado((e) => ({ ...e, cargando: false, error: err.message })); });
    return () => { vigente = false; };
    // `cargar` suele ser una función nueva en cada render; lo que decide recargar es la clave.
  }, [clave, version]); // eslint-disable-line

  const recargar = useCallback(() => {
    setEstado((e) => ({ ...e, cargando: true, error: '' }));
    setVersion((v) => v + 1);
  }, []);

  return { ...estado, recargar };
}
