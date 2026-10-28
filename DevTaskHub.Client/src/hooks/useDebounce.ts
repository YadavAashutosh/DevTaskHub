import { useState, useEffect } from 'react';

/**
 * Custom hook jo rapidly changing values (jaise search input) ko debounce karta hai.
 * Har keystroke par filtering ya API call trigger hone se rokkta hai.
 *
 * @param value The raw input value
 * @param delay Milliseconds to wait (Default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Timer set karein jo delay ke baad value update karega
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: Agar user delay khatam hone se pehle dobara type kare, timer cancel hoga
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}