export const particles = [];

export function spawnParticle(type, x, y, angle = 0, speed = 0) {
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const r = Math.random;

  if (type === 'wake') {
    particles.push({ type, x, y, vx: vx * 0.3, vy: vy * 0.3, life: 1, maxLife: 40 + r() * 30, size: 2 + r() * 3, color: 'rgba(230, 240, 255,' });
  } else if (type === 'smoke') {
    particles.push({ type, x, y, vx: vx + (r() - 0.5) * 1.5, vy: vy + (r() - 0.5) * 1.5, life: 1, maxLife: 30 + r() * 40, size: 4 + r() * 5, color: 'rgba(150, 150, 150,' });
  } else if (type === 'fire') {
    particles.push({ type, x, y, vx: vx + (r() - 0.5), vy: vy + (r() - 0.5) - 0.5, life: 1, maxLife: 20 + r() * 15, size: 3 + r() * 4, color: r() > 0.5 ? 'rgba(255, 80, 0,' : 'rgba(255, 180, 0,' });
  } else if (type === 'explosion') {
    for(let i=0; i<5; i++) {
      particles.push({ type, x, y, vx: vx + (r() - 0.5) * 4, vy: vy + (r() - 0.5) * 4, life: 1, maxLife: 15 + r() * 20, size: 5 + r() * 8, color: 'rgba(220, 60, 20,' });
    }
  }
}

export function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life++;
    
    if (p.type === 'smoke' || p.type === 'explosion') p.size += 0.15;
    if (p.type === 'wake') p.size += 0.1;
    if (p.type === 'fire') { p.size -= 0.1; p.y -= 0.3; } 
    
    if (p.life >= p.maxLife || p.size <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(ctx) {
  particles.forEach(p => {
    const alpha = Math.max(0, 1 - (p.life / p.maxLife));
    ctx.fillStyle = p.color + alpha + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
    ctx.fill();
  });
}