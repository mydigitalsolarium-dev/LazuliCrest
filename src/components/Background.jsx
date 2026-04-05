import { useEffect, useRef } from 'react';

const SYMBOLS = [
  // DNA helix (simplified double-helix path)
  { type: 'dna',      svg: '<path d="M4,0 Q8,4 4,8 Q0,12 4,16 Q8,20 4,24" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M8,0 Q4,4 8,8 Q12,12 8,16 Q4,20 8,24" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="4.5" y1="4" x2="7.5" y2="4" stroke="currentColor" stroke-width="0.8"/><line x1="4.5" y1="12" x2="7.5" y2="12" stroke="currentColor" stroke-width="0.8"/><line x1="4.5" y1="20" x2="7.5" y2="20" stroke="currentColor" stroke-width="0.8"/>' },
  // Antibody Y-shape
  { type: 'antibody', svg: '<path d="M6,14 L6,8 M6,8 L2,2 M6,8 L10,2 M2,2 C0,0 0,3 2,4 M10,2 C12,0 12,3 10,4" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/>' },
  // Water droplet
  { type: 'drop',     svg: '<path d="M6,1 Q10,7 10,10 A4,4 0 0,1 2,10 Q2,7 6,1Z" stroke="currentColor" stroke-width="1" fill="currentColor" fill-opacity="0.3"/>' },
  // Medical shield
  { type: 'shield',   svg: '<path d="M6,1 L11,3 L11,7 C11,10 8.5,13 6,14 C3.5,13 1,10 1,7 L1,3 Z" stroke="currentColor" stroke-width="1" fill="currentColor" fill-opacity="0.15"/><path d="M6,5 L6,9 M4,7 L8,7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' },
];

export default function Background() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W   = canvas.width  = window.innerWidth;
    const H   = canvas.height = window.innerHeight;

    // Particles
    const particles = Array.from({ length: 28 }, (_, i) => ({
      x:    Math.random() * W,
      y:    Math.random() * H,
      vx:   (Math.random() - 0.5) * 0.18,
      vy:   -0.12 - Math.random() * 0.15,
      size: 10 + Math.random() * 14,
      alpha:0.04 + Math.random() * 0.07,
      type: SYMBOLS[i % SYMBOLS.length].type,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.004,
    }));

    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.strokeStyle = '#C084FC';
        ctx.fillStyle   = '#C084FC';
        ctx.lineWidth   = 1;
        // Draw cross (fallback simple symbol)
        if (p.type === 'dna') {
          ctx.beginPath();
          ctx.moveTo(-p.size/4, -p.size/2);
          ctx.quadraticCurveTo(p.size/4, -p.size/4, -p.size/4, 0);
          ctx.quadraticCurveTo(-p.size/2, p.size/4, -p.size/4, p.size/2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.size/4, -p.size/2);
          ctx.quadraticCurveTo(-p.size/4, -p.size/4, p.size/4, 0);
          ctx.quadraticCurveTo(p.size/2, p.size/4, p.size/4, p.size/2);
          ctx.stroke();
        } else if (p.type === 'antibody') {
          ctx.beginPath();
          ctx.moveTo(0, p.size/2); ctx.lineTo(0, 0);
          ctx.moveTo(0, 0); ctx.lineTo(-p.size/3, -p.size/2);
          ctx.moveTo(0, 0); ctx.lineTo(p.size/3, -p.size/2);
          ctx.stroke();
        } else if (p.type === 'drop') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size/2);
          ctx.quadraticCurveTo(p.size/2, 0, 0, p.size/2);
          ctx.quadraticCurveTo(-p.size/2, 0, 0, -p.size/2);
          ctx.fill();
        } else {
          // Shield
          ctx.beginPath();
          ctx.moveTo(0, -p.size/2);
          ctx.lineTo(p.size/2.5, -p.size/3);
          ctx.lineTo(p.size/2.5, 0);
          ctx.quadraticCurveTo(0, p.size/2, -p.size/2.5, 0);
          ctx.lineTo(-p.size/2.5, -p.size/3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        p.x += p.vx; p.y += p.vy; p.rotation += p.rotSpeed;
        if (p.y < -p.size * 2) { p.y = H + p.size; p.x = Math.random() * W; }
        if (p.x < -p.size * 2) p.x = W + p.size;
        if (p.x > W + p.size * 2) p.x = -p.size;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Deep purple gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #050010 0%, #0a0020 30%, #0d0030 60%, #060018 100%)' }}/>
      {/* Radial glows */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 20%, rgba(123,47,190,.22) 0%, transparent 55%), radial-gradient(ellipse at 80% 75%, rgba(109,40,217,.16) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(76,29,149,.1) 0%, transparent 60%)' }}/>
      {/* Canvas particles */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}/>
    </div>
  );
}