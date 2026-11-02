import { useCallback, useEffect, useState } from 'react';

// Cuenta regresiva en segundos, para el reenvío de códigos (HU-06 y HU-40: cada 60 s).
export function useCuentaRegresiva() {
  const [restante, setRestante] = useState(0);

  useEffect(() => {
    if (restante <= 0) return undefined;
    const id = setTimeout(() => setRestante((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [restante]);

  const iniciar = useCallback((segundos) => setRestante(segundos), []);
  return [restante, iniciar];
}
