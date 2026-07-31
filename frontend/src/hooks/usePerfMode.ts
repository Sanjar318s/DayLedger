import { useCallback, useState } from 'react';

export type PerfMode = 'auto' | 'on' | 'off';

const STORAGE_KEY = 'perfMode';

export function detectWeakDevice(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    const cores = navigator.hardwareConcurrency;
    const memory = (navigator as any).deviceMemory as number | undefined;
    if (cores && cores <= 4) return true;
    if (memory && memory <= 4) return true;
  } catch {
    return false;
  }
  return false;
}

export function usePerfMode() {
  const [mode, setMode] = useState<PerfMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'on' || stored === 'off') return stored;
    } catch {
      // localStorage unavailable
    }
    return 'auto';
  });

  const [weakDevice] = useState(detectWeakDevice);

  const reducedMotion = mode === 'on' || (mode === 'auto' && weakDevice);

  const setPerfMode = useCallback((m: PerfMode) => {
    setMode(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return { perfMode: mode, weakDevice, reducedMotion, setPerfMode };
}
