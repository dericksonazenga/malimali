import { useState, useEffect, useCallback, Dispatch, SetStateAction } from "react";

/**
 * Like useState but persists to sessionStorage so form data survives
 * navigation between pages. Data is cleared on tab/browser close.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const storageKey = `form_draft_${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored !== null) return JSON.parse(stored);
    } catch {}
    return defaultValue;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {}
  }, [value, storageKey]);

  const clear = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setValue(defaultValue);
  }, [storageKey, defaultValue]);

  return [value, setValue, clear];
}
