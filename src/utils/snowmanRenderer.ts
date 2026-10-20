export interface SnowmanRenderOptions {
  score: number;
  x: number;
  y: number;
  scale?: number;
  showDetails?: boolean;
}

export function drawSnowman(ctx: CanvasRenderingContext2D, options: SnowmanRenderOptions): void {
  const { score, x, y, scale = 1.0 } = options;

  // Base sizing formula based on score:
  // Starts with base size ~18px, scales smoothly with score up to ~45px
  const growthFactor = Math.min(2.4, 0.8 + Math.sqrt(Math.max(0, score)) * 0.12);
  const s = scale * growthFactor;

  const baseRadius = 16 * s;
  const midRadius = 12 * s;
  const headRadius = 8.5 * s;

  ctx.save();
  ctx.translate(x, y);

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(0, 4 * s, baseRadius * 1.3, baseRadius * 0.45, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 30, 45, 0.28)';
  ctx.fill();

  // Stick arms (for score >= 15)
  if (score >= 15) {
    ctx.strokeStyle = '#5a3d28';
    ctx.lineWidth = Math.max(1.5, 2 * s);
    ctx.lineCap = 'round';

    // Left arm
    ctx.beginPath();
    ctx.moveTo(-midRadius * 0.8, -baseRadius * 0.9);
    ctx.lineTo(-midRadius * 1.8, -baseRadius * 1.4);
    ctx.lineTo(-midRadius * 2.1, -baseRadius * 1.7);
    ctx.stroke();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(midRadius * 0.8, -baseRadius * 0.9);
    ctx.lineTo(midRadius * 1.8, -baseRadius * 1.3);
    ctx.lineTo(midRadius * 2.2, -baseRadius * 1.1);
    ctx.stroke();
  }

  // 1. Bottom Snowball (Base)
  const baseGrad = ctx.createRadialGradient(-baseRadius * 0.3, -baseRadius * 0.3, 2, 0, 0, baseRadius);
  baseGrad.addColorStop(0, '#ffffff');
  baseGrad.addColorStop(0.7, '#e0f2fe');
  baseGrad.addColorStop(1, '#93c5fd');

  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fillStyle = baseGrad;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#bae6fd';
  ctx.stroke();

  // 2. Middle Snowball (Torso)
  const midY = -baseRadius * 0.85;
  const midGrad = ctx.createRadialGradient(-midRadius * 0.3, midY - midRadius * 0.3, 2, 0, midY, midRadius);
  midGrad.addColorStop(0, '#ffffff');
  midGrad.addColorStop(0.7, '#e0f2fe');
  midGrad.addColorStop(1, '#93c5fd');

  ctx.beginPath();
  ctx.arc(0, midY, midRadius, 0, Math.PI * 2);
  ctx.fillStyle = midGrad;
  ctx.fill();
  ctx.stroke();

  // Buttons (for score >= 5)
  if (score >= 5) {
    ctx.fillStyle = '#1e293b';
    const buttonCount = score >= 30 ? 3 : 2;
    for (let b = 0; b < buttonCount; b++) {
      ctx.beginPath();
      ctx.arc(0, midY - (b - 0.5) * (midRadius * 0.45), Math.max(1.2, 1.6 * s), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Head Snowball
  const headY = midY - midRadius * 0.85;
  const headGrad = ctx.createRadialGradient(-headRadius * 0.3, headY - headRadius * 0.3, 1, 0, headY, headRadius);
  headGrad.addColorStop(0, '#ffffff');
  headGrad.addColorStop(0.7, '#e0f2fe');
  headGrad.addColorStop(1, '#93c5fd');

  ctx.beginPath();
  ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
  ctx.fillStyle = headGrad;
  ctx.fill();
  ctx.stroke();

  // Coal Eyes
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-headRadius * 0.35, headY - headRadius * 0.15, Math.max(1, 1.4 * s), 0, Math.PI * 2);
  ctx.arc(headRadius * 0.35, headY - headRadius * 0.15, Math.max(1, 1.4 * s), 0, Math.PI * 2);
  ctx.fill();

  // Carrot Nose
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(0, headY);
  ctx.lineTo(headRadius * 0.9, headY + 1 * s);
  ctx.lineTo(0, headY + 2.5 * s);
  ctx.closePath();
  ctx.fill();

  // Little Coal Smile
  ctx.fillStyle = '#334155';
  [-0.35, -0.15, 0.15, 0.35].forEach(offset => {
    ctx.beginPath();
    ctx.arc(headRadius * offset, headY + headRadius * 0.45, Math.max(0.7, 0.9 * s), 0, Math.PI * 2);
    ctx.fill();
  });

  // Scarf (for score >= 10)
  if (score >= 10) {
    const scarfColor = score >= 50 ? '#dc2626' : '#16a34a';
    ctx.fillStyle = scarfColor;

    // Scarf neck band
    ctx.beginPath();
    ctx.roundRect(-midRadius * 0.8, headY + headRadius * 0.55, midRadius * 1.6, 4.5 * s, 2 * s);
    ctx.fill();

    // Scarf tail hanging down
    ctx.beginPath();
    ctx.roundRect(midRadius * 0.1, headY + headRadius * 0.85, 3.8 * s, 10 * s, 1.5 * s);
    ctx.fill();

    // Gold stripes on scarf
    ctx.fillStyle = '#facc15';
    ctx.fillRect(midRadius * 0.1, headY + headRadius * 0.85 + 7 * s, 3.8 * s, 1.5 * s);
  }

  // Top Hat or Beanie (for score >= 25)
  if (score >= 25) {
    const hatBaseY = headY - headRadius * 0.75;
    ctx.fillStyle = '#1e293b'; // Black top hat

    // Brim
    ctx.beginPath();
    ctx.ellipse(0, hatBaseY, headRadius * 1.4, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crown
    const hatHeight = 9 * s;
    ctx.fillRect(-headRadius * 0.85, hatBaseY - hatHeight, headRadius * 1.7, hatHeight);

    // Hat ribbon band
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-headRadius * 0.85, hatBaseY - 2.5 * s, headRadius * 1.7, 2.5 * s);

    // Holly sprig on hat
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(headRadius * 0.5, hatBaseY - 3 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(headRadius * 0.5, hatBaseY - 3 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Twinkling Fairy Lights (for score >= 60)
  if (score >= 60) {
    const colors = ['#ef4444', '#eab308', '#3b82f6', '#10b981', '#ec4899'];
    const timeSec = Date.now() / 600;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 1.8 + timeSec;
      const lightX = Math.cos(angle) * (midRadius * 1.05);
      const lightY = midY + Math.sin(angle) * (midRadius * 0.5);

      ctx.beginPath();
      ctx.arc(lightX, lightY, 2.2 * s, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % colors.length];
      ctx.shadowColor = colors[i % colors.length];
      ctx.shadowBlur = 6 * s;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // Golden Star or Crown (for score >= 100)
  if (score >= 100) {
    const starY = headY - headRadius * 0.75 - 13 * s;
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 10 * s;
    ctx.font = `${Math.round(12 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', 0, starY);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}
