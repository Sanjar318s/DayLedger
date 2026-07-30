import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LS_KEY = 'heroDismissed';

function KittenSVG() {
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32 select-none drop-shadow-lg" role="img" aria-label="Котёнок">
      <ellipse cx="60" cy="80" rx="24" ry="20" fill="#F4A261" />
      <path d="M84 75 Q98 65 95 50" stroke="#F4A261" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="46" cy="95" rx="7" ry="4" fill="#F4A261" />
      <ellipse cx="74" cy="95" rx="7" ry="4" fill="#F4A261" />
      <circle cx="60" cy="40" r="20" fill="#F4A261" />
      <polygon points="45,25 40,5 55,22" fill="#F4A261" />
      <polygon points="75,25 80,5 65,22" fill="#F4A261" />
      <polygon points="46,24 42,10 54,23" fill="#E76F51" />
      <polygon points="74,24 78,10 66,23" fill="#E76F51" />
      <ellipse cx="52" cy="38" rx="4" ry="5" fill="#264653" />
      <ellipse cx="68" cy="38" rx="4" ry="5" fill="#264653" />
      <circle cx="53.5" cy="36" r="1.5" fill="white" />
      <circle cx="69.5" cy="36" r="1.5" fill="white" />
      <polygon points="60,43 57,46 63,46" fill="#E76F51" />
      <path d="M55 48 Q58 51 60 48 Q62 51 65 48" stroke="#264653" strokeWidth="1.2" fill="none" />
      <line x1="38" y1="42" x2="28" y2="40" stroke="#264653" strokeWidth="1" strokeLinecap="round" />
      <line x1="38" y1="46" x2="28" y2="48" stroke="#264653" strokeWidth="1" strokeLinecap="round" />
      <line x1="82" y1="42" x2="92" y2="40" stroke="#264653" strokeWidth="1" strokeLinecap="round" />
      <line x1="82" y1="46" x2="92" y2="48" stroke="#264653" strokeWidth="1" strokeLinecap="round" />
      <path d="M52 55 Q60 52 68 55" stroke="#E76F51" strokeWidth="1.5" fill="none" />
      <path d="M50 62 Q60 59 70 62" stroke="#E76F51" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export default function HeroBlock() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(LS_KEY));

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(LS_KEY, '1');
  };

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(dismiss, 4500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -30, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="relative flex flex-col items-center gap-6 px-12 py-10 bg-indigo-600 rounded-3xl shadow-2xl shadow-black/30 border border-indigo-400/30 cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
          >
            <div className="animate-tumble">
              <KittenSVG />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-white drop-shadow-sm">
                Добро пожаловать!
              </h2>
              <p className="mt-1 text-sm text-white/80">
                Нажмите в любом месте, чтобы продолжить
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
