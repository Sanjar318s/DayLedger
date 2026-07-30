import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface SoundContextType {
  volume: number;        // 0–100
  muted: boolean;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
}

const SoundContext = createContext<SoundContextType>({
  volume: 100,
  muted: false,
  setVolume: () => {},
  setMuted: () => {},
});

export const useSound = () => useContext(SoundContext);

export const SoundProvider = ({ children }: { children: ReactNode }) => {
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('soundVolume');
    return saved ? Number(saved) : 100;
  });
  const [muted, setMutedState] = useState(() => {
    const saved = localStorage.getItem('soundMuted');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('soundVolume', String(volume));
    localStorage.setItem('soundMuted', String(muted));
  }, [volume, muted]);

  const setVolume = useCallback((v: number) => setVolumeState(Math.min(100, Math.max(0, v))), []);
  const setMuted = useCallback((m: boolean) => setMutedState(m), []);

  return (
    <SoundContext.Provider value={{ volume, muted, setVolume, setMuted }}>
      {children}
    </SoundContext.Provider>
  );
};
