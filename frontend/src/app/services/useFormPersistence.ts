/**
 * useFormPersistence
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook que persiste el estado de un formulario en sessionStorage.
 * Los datos se mantienen mientras dure la sesión del navegador.
 *
 * Se borran ÚNICAMENTE cuando:
 *  - El usuario llama explícitamente a clearPersistence() (en Guardar / Cancelar)
 *  - El usuario recarga la página manualmente (sessionStorage se limpia al cerrar la pestaña)
 *
 * Los datos se mantienen cuando:
 *  - El usuario navega entre pestañas / páginas dentro de la SPA
 *  - El usuario vuelve a abrir un modal sin haber guardado ni cancelado
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useFormPersistence<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  // Guardamos el initialValue en un ref para que el clear() siempre use
  // el valor original sin depender de renders posteriores.
  const initialRef = useRef<T>(initialValue);

  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) {
        // Fusionamos con initialValue para que campos nuevos (no presentes en datos viejos)
        // siempre tengan su valor por defecto en lugar de quedar como `undefined`.
        const parsed = JSON.parse(stored) as T;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...initialRef.current, ...parsed } as T;
        }
        return parsed;
      }
    } catch {
      // sessionStorage puede no estar disponible (modo privado restrictivo)
    }
    return initialRef.current;
  });

  // Cada vez que el estado cambia, lo guardamos en sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Ignorar errores de cuota o acceso
    }
  }, [key, state]);

  // clear: elimina de sessionStorage y restaura el valor inicial
  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignorar
    }
    setState(initialRef.current);
  }, [key]);

  return [state, setState, clear];
}

/**
 * hasPersistedData
 * Utilidad para verificar si existe un draft guardado sin montarlo en el estado.
 */
export function hasPersistedData(key: string): boolean {
  try {
    return sessionStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}