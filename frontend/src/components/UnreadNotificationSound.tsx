import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSound } from '../context/SoundContext';

function playBeep(volume: number) {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const vol = Math.pow(volume / 100, 2) * 0.25;

    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
      osc.onended = () => ctx.close();
    });
  } catch {}
}

declare global {
  interface Window {
    __playNotificationSound?: () => void;
  }
}

export default function UnreadNotificationSound() {
  const { user } = useAuth();
  const { volume, muted } = useSound();
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);

  useEffect(() => {
    volumeRef.current = volume;
    mutedRef.current = muted;
  }, [volume, muted]);

  useEffect(() => {
    window.__playNotificationSound = () => {
      if (mutedRef.current || volumeRef.current === 0) return;
      playBeep(volumeRef.current);
    };
    return () => {
      delete window.__playNotificationSound;
    };
  }, []);

  return null;
}
