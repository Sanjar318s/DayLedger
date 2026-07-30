import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number; y: number; z: number;
  size: number; speed: number;
  r: number; g: number; b: number;
  vx: number; vy: number;
  isPrimary: boolean;
}

export default function DashboardBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const timeRef = useRef(0);
  const rafRef = useRef(0);

  const getThemeColors = useCallback(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'red') return { primary: '239, 68, 68', secondary: '220, 38, 38' };
    if (theme === 'dark') return { primary: '129, 143, 248', secondary: '99, 102, 241' };
    return { primary: '99, 102, 241', secondary: '79, 70, 229' };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = getThemeColors();
    const count = Math.min(100, Math.floor(window.innerWidth * 0.05));
    const [pr, pg, pb] = colors.primary.split(', ').map(Number);
    const [sr, sg, sb] = colors.secondary.split(', ').map(Number);
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 400 - 200,
      size: Math.random() * 5 + 2,
      speed: Math.random() * 0.8 + 0.2,
      r: Math.random() > 0.4 ? pr : sr,
      g: Math.random() > 0.4 ? pg : sg,
      b: Math.random() > 0.4 ? pb : sb,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      isPrimary: Math.random() > 0.4,
    }));

    let lastTime = 0;
    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 16, 3);
      lastTime = now;
      timeRef.current = now / 1000;
      const { width, height } = canvas;

      ctx.clearRect(0, 0, width, height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const hasMouse = mx > 0 && my > 0;

      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (hasMouse) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 300 && dist > 1) {
            p.vx += (dx / dist) * 0.08 * (300 - dist) / 300;
            p.vy += (dy / dist) * 0.08 * (300 - dist) / 300;
          }
        }

        p.vx *= 0.99;
        p.vy *= 0.99;

        const maxSpeed = 3;
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > maxSpeed) {
          p.vx = (p.vx / spd) * maxSpeed;
          p.vy = (p.vy / spd) * maxSpeed;
        }

        const wrapMargin = 150;
        if (p.x < -wrapMargin) p.x = width + wrapMargin;
        if (p.x > width + wrapMargin) p.x = -wrapMargin;
        if (p.y < -wrapMargin) p.y = height + wrapMargin;
        if (p.y > height + wrapMargin) p.y = -wrapMargin;

        if (p.z < -200) p.z = 200;
        if (p.z > 200) p.z = -200;

        const zFactor = 1 + p.z / 400;
        const px = (p.x - width / 2) * zFactor + width / 2;
        const py = (p.y - height / 2) * zFactor + height / 2;
        const pz = p.size * zFactor;

        const pulse = 0.6 + Math.sin(timeRef.current * p.speed * 1.5 + i * 0.3) * 0.4;
        const alpha = Math.max(0.15, zFactor * 0.3) * pulse;

        ctx.beginPath();
        ctx.arc(px, py, pz, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(px, py, 0, px, py, pz * 3);
        gradient.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha * 0.6})`);
        gradient.addColorStop(0.5, `rgba(${p.r},${p.g},${p.b},${alpha * 0.2})`);
        gradient.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = dx * dx + dy * dy;
          const maxDist = 15000;

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.12;
            const avgR = Math.floor((a.r + b.r) / 2);
            const avgG = Math.floor((a.g + b.g) / 2);
            const avgB = Math.floor((a.b + b.b) / 2);
            ctx.beginPath();
            ctx.moveTo(
              (a.x - width / 2) * (1 + a.z / 400) + width / 2,
              (a.y - height / 2) * (1 + a.z / 400) + height / 2,
            );
            ctx.lineTo(
              (b.x - width / 2) * (1 + b.z / 400) + width / 2,
              (b.y - height / 2) * (1 + b.z / 400) + height / 2,
            );
            ctx.strokeStyle = `rgba(${avgR},${avgG},${avgB},${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('mouseleave', onLeave);

    const observer = new MutationObserver(() => {
      const c = getThemeColors();
      const [pr, pg, pb] = c.primary.split(', ').map(Number);
      const [sr, sg, sb] = c.secondary.split(', ').map(Number);
      for (const p of particlesRef.current) {
        if (Math.random() > 0.5) {
          p.r = Math.random() > 0.4 ? pr : sr;
          p.g = Math.random() > 0.4 ? pg : sg;
          p.b = Math.random() > 0.4 ? pb : sb;
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('mouseleave', onLeave);
      observer.disconnect();
    };
  }, [getThemeColors]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%)',
        }}
      />
    </>
  );
}

