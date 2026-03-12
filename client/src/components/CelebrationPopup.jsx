import { useEffect, useRef } from 'react';
import './CelebrationPopup.css';

const CONFETTI_COUNT = 150;

const GOLD_CONFETTI = ['#FFD700', '#DAA520', '#F0D060', '#FFF8C9', '#B8860B', '#FFEC8B'];
const MIXED_CONFETTI = ['#E91E7B', '#0B6E4F', '#FFD700', '#FF6B35', '#00D4FF', '#fff'];

function createConfetti(canvas, colors) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({ length: CONFETTI_COUNT }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: Math.random() * 12 + 5,
    h: Math.random() * 7 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 4 + 2,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
  }));

  let animId;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();

      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.vy += 0.05;

      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
        p.vy = Math.random() * 4 + 2;
      }
    }
    animId = requestAnimationFrame(draw);
  }
  draw();

  return () => cancelAnimationFrame(animId);
}

export default function CelebrationPopup({ type, playerNumber, name, teamName, photoUrl, onClose }) {
  const canvasRef = useRef(null);
  const isWinner = type === 'winner';

  useEffect(() => {
    if (!canvasRef.current) return;
    const colors = isWinner ? GOLD_CONFETTI : MIXED_CONFETTI;
    const cleanup = createConfetti(canvasRef.current, colors);
    return cleanup;
  }, [isWinner]);

  return (
    <div className={`celebration-overlay ${isWinner ? 'winner-bg' : 'runnerup-bg'}`} onClick={onClose}>
      <canvas ref={canvasRef} className="celebration-confetti" />
      <div className="celebration-content">
        <div className="celebration-trophy">{isWinner ? '🏆' : '🥈'}</div>
        <div className={isWinner ? 'celebration-label-winner' : 'celebration-label-runnerup'}>
          {isWinner ? 'WINNER' : 'RUNNER UP'}
        </div>
        <div className="celebration-shapes">&#9675; &#9651; &#9632;</div>
        {photoUrl && (
          <div className={`celebration-photo-wrapper ${isWinner ? 'gold-border' : 'silver-border'}`}>
            <img src={photoUrl} alt={name} className="celebration-photo" />
          </div>
        )}
        <div className="celebration-number">{playerNumber}</div>
        <div className="celebration-name">{name}</div>
        {teamName && <div className="celebration-team">{teamName}</div>}
        <div className="celebration-hint">Click anywhere to dismiss</div>
      </div>
    </div>
  );
}
