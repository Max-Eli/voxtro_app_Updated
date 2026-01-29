import { useState, useEffect, useCallback } from 'react';

/**
 * A hook that persists state to sessionStorage, preventing data loss on tab switches
 * @param key - Unique key for the sessionStorage item
 * @param initialValue - Initial value if no stored value exists
 * @param debounceMs - Debounce time for saving to storage (default 300ms)
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
  debounceMs: number = 300
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Initialize state from sessionStorage or use initial value
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
    }
    return initialValue;
  });

  // Debounced save to sessionStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        if (state === initialValue || state === '' || state === null || state === undefined) {
          sessionStorage.removeItem(key);
        } else {
          sessionStorage.setItem(key, JSON.stringify(state));
        }
      } catch (error) {
        console.warn(`Error writing sessionStorage key "${key}":`, error);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [key, state, debounceMs, initialValue]);

  // Clear the persisted state (call after successful form submission)
  const clearPersistedState = useCallback(() => {
    sessionStorage.removeItem(key);
    setState(initialValue);
  }, [key, initialValue]);

  return [state, setState, clearPersistedState];
}

/**
 * A simpler version for form fields that just need basic persistence
 */
export function useFormFieldPersistence(
  formId: string,
  fieldName: string,
  initialValue: string = ''
): [string, (value: string) => void, () => void] {
  const key = `form_${formId}_${fieldName}`;
  return usePersistedState(key, initialValue);
}
