import { useQuery } from '@tanstack/react-query';
import { getActiveFrame } from '../api/frames';
import { parseCss } from '../utils/cssParser';
import { motion } from 'framer-motion';

function extractBorderColor(css: string): string {
  const colorMatch = css.match(/#([0-9a-fA-F]{3}){1,2}\b/);
  if (colorMatch) return colorMatch[0];
  const rgbMatch = css.match(/rgba?\([^)]+\)/);
  if (rgbMatch) return rgbMatch[0];
  return '#6366f1';
}

interface Props {
  avatarUrl?: string | null;
  nickname?: string | null;
  email?: string;
  size?: number;
  showFrame?: boolean;
  frameCss?: string | null;
  gameGlow?: boolean;
}

export default function Avatar({ avatarUrl, nickname, email, size = 36, showFrame = true, frameCss, gameGlow = true }: Props) {
  const { data: activeFrame } = useQuery({
    queryKey: ['activeFrame'],
    queryFn: () => getActiveFrame().then(res => res.data),
    enabled: showFrame && !frameCss,
  });

  const css = frameCss || activeFrame?.css_style;
  const frameStyle = css ? parseCss(css) : {};
  const hasFrame = showFrame && css;

  const color = css && gameGlow ? extractBorderColor(css) : null;

  const glowShadows = color
    ? `0 0 15px 5px ${color}66, 0 0 35px 10px ${color}33`
    : undefined;

  const content = avatarUrl ? (
    <img
      src={avatarUrl}
      alt="avatar"
      className="w-full h-full rounded-full object-cover"
      draggable={false}
    />
  ) : (
    <div className="w-full h-full rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold select-none">
      {nickname?.[0] || email?.[0]?.toUpperCase() || '?'}
    </div>
  );

  return (
    <motion.div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'content-box' as const,
        ...(showFrame ? frameStyle : {}),
        boxShadow: hasFrame && gameGlow && color
          ? `${frameStyle.boxShadow || ''}${frameStyle.boxShadow ? ', ' : ''}${glowShadows}`
          : (frameStyle.boxShadow || undefined),
      }}
      whileHover={{ scale: 1.05 }}
      animate={hasFrame && gameGlow && color ? {
        boxShadow: [
          `${frameStyle.boxShadow || ''}${frameStyle.boxShadow ? ', ' : ''}0 0 12px 4px ${color}66, 0 0 30px 8px ${color}33`,
          `${frameStyle.boxShadow || ''}${frameStyle.boxShadow ? ', ' : ''}0 0 20px 8px ${color}88, 0 0 50px 16px ${color}44`,
          `${frameStyle.boxShadow || ''}${frameStyle.boxShadow ? ', ' : ''}0 0 12px 4px ${color}66, 0 0 30px 8px ${color}33`,
        ],
      } : undefined}
      transition={hasFrame && gameGlow && color ? {
        duration: 2.5,
        repeat: Infinity,
        ease: 'easeInOut',
      } : undefined}
    >
      {content}
    </motion.div>
  );
}
