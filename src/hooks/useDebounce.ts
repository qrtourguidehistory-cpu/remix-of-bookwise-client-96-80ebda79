import { useEffect, useState } from "react";

/**
 * Hook para prevenir múltiples llamadas rápidas
 * Útil para prevenir consultas duplicadas en botones
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para prevenir múltiples clicks en botones
 * Retorna una función que solo se ejecuta si no hay una ejecución en curso
 */
export function usePreventDuplicateCalls<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number = 500
): T {
  const [isExecuting, setIsExecuting] = useState(false);

  const wrappedFn = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (isExecuting) {
      console.log("⏸️ Prevención de llamada duplicada");
      return Promise.resolve() as ReturnType<T>;
    }

    setIsExecuting(true);
    try {
      const result = await fn(...args);
      return result;
    } finally {
      setTimeout(() => {
        setIsExecuting(false);
      }, delay);
    }
  };

  return wrappedFn as T;
}

