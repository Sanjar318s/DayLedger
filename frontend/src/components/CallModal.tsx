import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../context/CallContext';
import { useLocale } from '../context/LocaleContext';
import { useSound } from '../context/SoundContext';

function startRingtone(ctx: AudioContext, gainNode: GainNode) {
  const now = ctx.currentTime;
  const loopDuration = 3.2;

  function scheduleCycle(startTime: number) {
    const notes: [number, number, number][] = [
      [392, 0, 0.18],
      [0, 0.25, 0.05],
      [392, 0.35, 0.18],
      [0, 0.55, 0.05],
      [440, 0.85, 0.18],
      [0, 1.1, 0.05],
      [440, 1.2, 0.18],
      [0, 1.4, 0.05],
      [523, 1.7, 0.18],
      [0, 1.95, 0.05],
      [523, 2.05, 0.18],
      [0, 2.25, 0.05],
      [440, 2.55, 0.18],
      [0, 2.8, 0.05],
      [440, 2.9, 0.18],
      [0, 3.1, 0.1],
    ];
    notes.forEach(([freq, offset, dur]) => {
      if (freq > 0) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = startTime + offset;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(1, t + 0.025);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g);
        g.connect(gainNode);
        osc.start(t);
        osc.stop(t + dur + 0.01);
      }
    });
  }

  scheduleCycle(now);

  const interval = setInterval(() => {
    const next = ctx.currentTime + 0.05;
    const aligned = Math.ceil(next / loopDuration) * loopDuration;
    scheduleCycle(aligned);
  }, loopDuration * 1000);

  return { interval };
}

function stopRingtone(ctx: AudioContext, interval: ReturnType<typeof setInterval>) {
  clearInterval(interval);
  ctx.close().catch(() => {});
}

export default function CallModal() {
  const { t } = useLocale();
  const { volume, muted } = useSound();
  const {
    status, callType, peerNickname,
    localStream, remoteStream, isMuted, isCameraOff,
    acceptCall, rejectCall, endCall, toggleMute, toggleCamera,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (status !== 'incoming') return;
    if (muted || volume === 0) return;

    const ctx = new AudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(ctx.destination);
    const vol = Math.pow(volume / 100, 2);
    gainNode.gain.value = vol;

    const { interval } = startRingtone(ctx, gainNode);

    return () => stopRingtone(ctx, interval);
  }, [status, muted, volume]);

  return (
    <AnimatePresence>
      {status !== 'idle' && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative bg-gray-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ width: remoteStream ? 640 : 360, maxWidth: '95vw' }}
          >
            {/* Remote audio (hidden, ensures playback in all cases) */}
            {remoteStream && (
              <audio
                ref={remoteAudioRef}
                autoPlay playsInline
              />
            )}

            {/* Remote video */}
            {remoteStream && (
              <video
                ref={remoteVideoRef}
                autoPlay playsInline
                className="w-full aspect-video object-cover bg-black"
              />
            )}

            {/* Waiting animation */}
            {status === 'outgoing' && !remoteStream && (
              <div className="flex flex-col items-center justify-center gap-4 p-12 text-white">
                <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-lg font-semibold">{t('calling')} {peerNickname || '...'}</p>
                <p className="text-sm text-white/60">{callType === 'video' ? t('videoCall') : t('call')}</p>
              </div>
            )}

            {/* Incoming call */}
            {status === 'incoming' && (
              <div className="flex flex-col items-center justify-center gap-6 p-12 text-white">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{t('incomingCall')}</p>
                  <p className="text-sm text-white/60">{peerNickname || '...'}</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={rejectCall}
                    className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                    aria-label={t('decline')}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                      <line x1="23" y1="1" x2="1" y2="23"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  </button>
                  <button
                    onClick={acceptCall}
                    className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
                    aria-label={t('acceptCall')}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Connected — remote video already shows above */}
            {status === 'connected' && !remoteStream && (
              <div className="flex items-center justify-center p-12 text-white/60 text-sm">
                {t('connecting')}
              </div>
            )}

            {/* Controls bar (outgoing or connected) */}
            {(status === 'outgoing' || status === 'connected') && (
              <div className="flex items-center justify-center gap-4 p-4 bg-black/40">
                {callType === 'video' && (
                  <button
                    onClick={toggleCamera}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isCameraOff ? 'bg-red-500/80' : 'bg-white/20 hover:bg-white/30'
                    }`}
                    aria-label={t('toggleCamera')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  </button>
                )}
                <button
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isMuted ? 'bg-red-500/80' : 'bg-white/20 hover:bg-white/30'
                  }`}
                  aria-label={t('toggleMute')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                    {isMuted ? (
                      <>
                        <polyline points="1 1 23 23"/><path d="M9 9v1a3 3 0 0 0 3 3h1"/><path d="M12 15v4"/><path d="M15 12v-1a3 3 0 0 0-3-3"/><rect x="9" y="2" width="6" height="4" rx="1"/>
                      </>
                    ) : (
                      <>
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </>
                    )}
                  </svg>
                </button>
                <button
                  onClick={endCall}
                  className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                  aria-label={t('endCall')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                    <line x1="23" y1="1" x2="1" y2="23"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Local video (picture-in-picture) */}
            {localStream && status === 'connected' && callType === 'video' && (
              <div className="absolute top-4 right-4 w-32 aspect-video rounded-lg overflow-hidden border-2 border-white/20 shadow-lg bg-black">
                <video
                  ref={localVideoRef}
                  autoPlay playsInline muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
