import { useEffect, useRef } from 'react';

/**
 * Interactive Network Plexus Background
 * Features:
 * - Floating nodes (white dots)
 * - Proximity-based connections (lines)
 * - Mouse attraction
 * - Click shockwave effect
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

interface Shockwave {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
}

export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w: number, h: number;
    let particles: Particle[] = [];
    let shockwaves: Shockwave[] = [];
    const particleCount = 120;
    const connectionDistance = 140;
    const mouseRadius = 200;

    const createParticle = (): Particle => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 1.5 + 1.5,
    });

    const createShockwave = (x: number, y: number): Shockwave => ({
      x, y, r: 0, maxR: 300, alpha: 0.5
    });

    const updateParticle = (p: Particle) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      if (mouse.current.active) {
        const dx = mouse.current.x - p.x;
        const dy = mouse.current.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < mouseRadius) {
          const force = (mouseRadius - dist) / mouseRadius;
          p.vx += dx * force * 0.0005;
          p.vy += dy * force * 0.0005;
        }
      }

      p.vx *= 0.995;
      p.vy *= 0.995;
    };

    const drawParticle = (p: Particle) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
    };

    const init = () => {
      w = canvas.width = globalThis.innerWidth;
      h = canvas.height = globalThis.innerHeight;
      particles = Array.from({ length: particleCount }, createParticle);
    };

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0a192f';
      ctx.fillRect(0, 0, w, h);

      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.25;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        updateParticle(p);
        drawParticle(p);
      });

      shockwaves = shockwaves.filter(s => {
        s.r += 10;
        s.alpha -= 0.015;
        if (s.alpha > 0) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${s.alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          return true;
        }
        return false;
      });

      requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handleClick = (e: MouseEvent) => {
      shockwaves.push(createShockwave(e.clientX, e.clientY));
      particles.forEach(p => {
        const dx = p.x - e.clientX;
        const dy = p.y - e.clientY;
        const dist = Math.hypot(dx, dy);
        if (dist < 300) {
          const force = (300 - dist) / 20;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      });
    };

    const handleMouseLeave = () => {
      mouse.current.active = false;
    };

    globalThis.addEventListener('resize', init);
    globalThis.addEventListener('mousemove', handleMouseMove);
    globalThis.addEventListener('mousedown', handleClick);
    globalThis.addEventListener('mouseleave', handleMouseLeave);

    init();
    animate();

    return () => {
      globalThis.removeEventListener('resize', init);
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('mousedown', handleClick);
      globalThis.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[-1] w-full h-full"
    />
  );
}

