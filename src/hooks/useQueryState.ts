import { useRef, useEffect } from "react";

/**
 * Hook para limpiar estado pesado cuando se desmonta el componente
 * Útil para liberar memoria en pantallas principales
 */
export function useQueryState<T>(initialValue: T) {
  const stateRef = useRef<T>(initialValue);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    return () => {
      // Ejecutar todas las funciones de limpieza al desmontar
      cleanupFunctionsRef.current.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          console.warn("Error en función de limpieza:", error);
        }
      });
      cleanupFunctionsRef.current = [];
      
      // Limpiar referencias pesadas
      if (typeof stateRef.current === "object" && stateRef.current !== null) {
        // Limpiar arrays grandes
        if (Array.isArray(stateRef.current)) {
          (stateRef.current as any[]).length = 0;
        }
        // Limpiar objetos grandes
        else {
          Object.keys(stateRef.current).forEach((key) => {
            delete (stateRef.current as any)[key];
          });
        }
      }
      stateRef.current = initialValue;
    };
  }, []);

  const registerCleanup = (cleanup: () => void) => {
    cleanupFunctionsRef.current.push(cleanup);
  };

  return { stateRef, registerCleanup };
}

