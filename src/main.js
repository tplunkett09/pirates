import { PORTS, SHIPS, CAPS, NAT, REGIONS } from './data/world.js';
import { spawnParticle, updateParticles, drawParticles, particles } from './particles.js';
// Plain URL so this runs on GitHub Pages with no build step (a bundler-style PNG import only works with Vite/webpack)
const mapSrc = new URL('./assets/Worldmap.png', import.meta.url).href;

const C = document.getElementById('c'), X = C.getContext('2d'), W = 800, H = 520;
const OV = document.getElementById('ov'), HUD = document.getElementById('hud'), MSG = document.getElementById('msg');
const ACT = document.getElementById('actb');

const fogC = document.createElement('canvas'); fogC.width = W; fogC.height = H;
const fogX = fogC.getContext('2d');

let CAP = 60, svT = 0, G, P, S, windA, mode, cur, prices, B, K = {}, msgT = 0, stormForce = 0, shake = 0, dbg = false, PZ = null, WOK = null;
const GOODS = ['Food', 'Sugar', 'Tobacco'], BASE = [10, 24, 35], R = Math.random, PI = Math.PI;

const WW = 20000, WH = 10000, NS = 30, cam = { x: 0, y: 0 };
let mapW = 4000, mapH = 2000;
// Water test tuning (press M in game to see what counts as land). Raise WATER_GB if teal shallows are blocked;
// lower it (or raise WATER_RB) if green coasts count as open water.
const WATER_RB = 20, WATER_GB = 25;
let collisionMask = null;

ACT.hidden = false; HUD.hidden = false; MSG.hidden = false;
const edUI = document.querySelector('div[style*="🗺️"]');
if (edUI && edUI.parentElement) edUI.parentElement.remove();

const mapImg = new Image();
let mapLoaded = false;
mapImg.onload = () => { 
  mapLoaded = true; mapW = mapImg.width; mapH = mapImg.height;
  const mc = document.createElement('canvas'); mc.width = mapW; mc.height = mapH;
  const mctx = mc.getContext('2d', { willReadFrequently: true });
  mctx.drawImage(mapImg, 0, 0, mapW, mapH);
  const data = mctx.getImageData(0, 0, mapW, mapH).data;
  collisionMask = new Uint8Array(mapW * mapH);
  for(let i = 0; i < mapW * mapH; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
    const isWater = (b > r + WATER_RB && b >= g - WATER_GB);
    collisionMask[i] = isWater ? 0 : 1; 
  }
};
mapImg.src = mapSrc; 

function isLand(x, y) {
  if (x < 0 || y < 0 || x >= WW || y >= WH) return true;
  if (!collisionMask) return false;
  let imgX = Math.floor(x * (mapW / WW));
  let imgY = Math.floor(y * (mapH / WH));
  return collisionMask[imgY * mapW + imgX] === 1;
}

function landScore(x, y, r) { const d = r * 0.7; return isLand(x, y) + isLand(x + r, y) + isLand(x - r, y) + isLand(x, y + r) + isLand(x, y - r) + isLand(x + d, y + d) + isLand(x - d, y - d) + isLand(x + d, y - d) + isLand(x - d, y + d); }
function isLandArea(x, y, radius = 10) {
  const diag = radius * 0.7; 
  return isLand(x, y) || isLand(x + radius, y) || isLand(x - radius, y) || 
         isLand(x, y + radius) || isLand(x, y - radius) || isLand(x + diag, y + diag) ||
         isLand(x - diag, y - diag) || isLand(x + diag, y - diag) || isLand(x - diag, y + diag);
}

function nearestUnlocked(x, y) { let b = REGIONS[0], m = 1e9; REGIONS.forEach(r => { if (!G.unlockedRegions.includes(r.id)) return; const d = Math.hypot(x - r.x, y - r.y); if (d < m) { m = d; b = r; } }); return b; }
// ---- ship routing: coarse flow field built from the collision mask ----
const GC = 40, GX = WW / GC | 0, GY = WH / GC | 0, FLOWC = new Map();
function buildWok() {
  WOK = new Uint8Array(GX * GY); FLOWC.clear();
  for (let cy = 0; cy < GY; cy++) for (let cx = 0; cx < GX; cx++) WOK[cy * GX + cx] = isLandArea(cx * GC + 20, cy * GC + 20, 10) ? 0 : 1;
  PORTS.forEach(p => { if (isLandArea(p.x, p.y, 6)) console.warn('Port on land or coast:', p.name, p.x, p.y); });
}
const wok = (cx, cy) => cx >= 0 && cy >= 0 && cx < GX && cy < GY && WOK[cy * GX + cx] === 1;
function flowFor(p) {
  let d = FLOWC.get(p); if (d) return d;
  d = new Int16Array(GX * GY).fill(-1); const q = [], pcx = p.x / GC | 0, pcy = p.y / GC | 0;
  for (let cy = pcy - 4; cy <= pcy + 4; cy++) for (let cx = pcx - 4; cx <= pcx + 4; cx++) if (wok(cx, cy) && Math.hypot(cx * GC + 20 - p.x, cy * GC + 20 - p.y) < 140) { d[cy * GX + cx] = 0; q.push(cx, cy); }
  for (let i = 0; i < q.length; i += 2) {
    const x = q[i], y = q[i + 1], v = d[y * GX + x];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const a = x + dx, b = y + dy;
      if ((dx || dy) && wok(a, b) && d[b * GX + a] < 0 && (!dx || !dy || (wok(x + dx, y) && wok(x, y + dy)))) { d[b * GX + a] = v + 1; q.push(a, b); }
    }
  }
  FLOWC.set(p, d); return d;
}
function clearLine(x0, y0, x1, y1) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 12); for (let i = 1; i < n; i++) { const t = i / n; if (isLandArea(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 9)) return false; } return true; }
function canReach(x, y, p) { if (!WOK) return true; const d = flowFor(p), cx = x / GC | 0, cy = y / GC | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const a = cx + dx, b = cy + dy; if (a >= 0 && b >= 0 && a < GX && b < GY && d[b * GX + a] >= 0) return true; } return false; }
function waterNear(p) { // open water beside a port (ports sit on the coast, so spawning exactly on one can trap a ship)
  const cx = p.x / GC | 0, cy = p.y / GC | 0, c = [];
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if (wok(cx + dx, cy + dy)) c.push([(cx + dx) * GC + 20, (cy + dy) * GC + 20]);
  c.sort((a, b) => Math.hypot(a[0] - p.x, a[1] - p.y) - Math.hypot(b[0] - p.x, b[1] - p.y));
  const q = c[R() * Math.min(6, c.length) | 0]; return q ? { x: q[0], y: q[1] } : null;
}
function pickDest(a, b, x, y, o) { const sh = l => l.slice().sort(() => R() - .5); for (const c of sh(a).concat(sh(b))) if (c !== o && canReach(x, y, c)) return c; return null; }
function aim(s) {
  if (!WOK) return [s.w.x, s.w.y];
  const d = flowFor(s.w); let x = s.x / GC | 0, y = s.y / GC | 0;
  if (x < 0 || y < 0 || x >= GX || y >= GY) return [s.w.x, s.w.y];
  let v = d[y * GX + x]; s.fv = v;
  if (v < 0) { let bv = 1e9, bx = x, by = y; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < GX && b < GY) { const u = d[b * GX + a]; if (u >= 0 && u < bv) { bv = u; bx = a; by = b; } } } if (bv === 1e9) return [s.w.x, s.w.y]; x = bx; y = by; v = bv; }
  const path = [];
  for (let k = 0; k < 7 && v > 0; k++) {   // follow the flow field downhill, preferring the neighbour closest to the port
    let bx = x, by = y, bv = v, bd = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy; if ((dx || dy) && a >= 0 && b >= 0 && a < GX && b < GY) { const u = d[b * GX + a]; if (u >= 0 && u < v && (!dx || !dy || (d[y * GX + a] >= 0 && d[b * GX + x] >= 0))) { const dd = Math.hypot(a * GC + 20 - s.w.x, b * GC + 20 - s.w.y); if (u < bv || (u === bv && dd < bd)) { bv = u; bd = dd; bx = a; by = b; } } } }
    if (bv === v) break; x = bx; y = by; v = bv; path.push([x * GC + 20, y * GC + 20]);
  }
  if (v === 0) path.push([s.w.x, s.w.y]);
  if (!path.length) return [s.w.x, s.w.y];
  for (let i = path.length - 1; i > 0; i--) if (clearLine(s.x, s.y, path[i][0], path[i][1])) return path[i];   // cut corners only where the line is clear
  return path[0];
}
const bribeCost = n => 250 + 200 * (-G.rep[n] - 1), fireCd = c => Math.round(40 + 1800 / (c + 8));
const boardRange = () => (SHIPS[G.ship].L + SHIPS[B.s.t].L) + 25;   // ships are drawn 2.2x, so the old fixed 70px was often less than one hull length
const enemyGuns = () => Math.max(0, SHIPS[B.s.t].guns + (B.s.cap ? B.s.cap.g : 0) - B.e.gl);
const nrm = a => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };
const hostile = n => n === 'PI' || G.rep[n] < 0;
const cargoN = () => G.cargo.reduce((a, b) => a + b, 0);
function say(t) { MSG.textContent = t; msgT = 300; }

function init() {
  G = { gold: 500, crew: 30, hull: 80, maxHull: 80, ship: 0, gl: 0, fleet: [], up: [0, 0, 0, 0, 0], cargo: [0, 0, 0], rep: { ES: -1, EN: 0, FR: 0, NL: 0 }, day: 0, sunk: 0, unlockedRegions: ['caribbean'], beat: [] };
  PORTS.forEach(p => { p.gar = p.g0; p.wealth = p.w0; p.gov = p.cap = false; });
  P = { x: 5196, y: 4045, a: 0, vx: 0, vy: 0, roll: 0 }; 
  windA = R() * 6; S = []; 
  const attemptSpawn = setInterval(() => {
    if (collisionMask) { if (!WOK) buildWok(); for (let i = 0; i < NS; i++) spawn(true); clearInterval(attemptSpawn); }
  }, 100);
  B = null; mode = 'sea'; OV.hidden = true; particles.length = 0;
  say('Sail under the English flag. Spain is your enemy.');
}

function isUnlocked(x, y) { return REGIONS.some(r => G.unlockedRegions.includes(r.id) && Math.hypot(x - r.x, y - r.y) < r.r); }
function getCurrentRegion(x, y) {
  let closest = REGIONS[0], minDist = Infinity;
  REGIONS.forEach(r => { let d = Math.hypot(x - r.x, y - r.y); if(d < minDist) { minDist = d; closest = r; }});
  return closest;
}

function spawn(init) {
  let x, y, region, o = null;
  let attempts = 0;
  
  if (init) { 
    region = REGIONS.find(r => r.id === 'caribbean');
    do { 
      x = region.x + (R() - 0.5) * 2 * region.r; y = region.y + (R() - 0.5) * 2 * region.r; 
      attempts++;
    } while ((Math.hypot(x - P.x, y - P.y) < 600 || Math.hypot(x - region.x, y - region.y) > region.r || isLandArea(x, y, 15) || (WOK && !wok(x / GC | 0, y / GC | 0))) && attempts < 200); 
    
    // FAILSAFE: If it loops 200 times and can't find water, abort the spawn so the browser doesn't freeze!
    if (attempts >= 200) return; 
    
  } else { 
    region = nearestUnlocked(P.x, P.y);
    const c = PORTS.filter(q => q.region === region.id && Math.hypot(q.x - P.x, q.y - P.y) > 800); 
    if (!c.length) return; 
    o = c[R() * c.length | 0]; const wn = waterNear(o); if (!wn) return; x = wn.x; y = wn.y; 
  }
  
  let n = ['ES', 'ES', 'EN', 'FR', 'NL', 'PI'][R() * 6 | 0];
  const tr = !S.some(q => q.tr) && R() < .02; if (tr) n = 'ES'; // at most one Spanish treasure galleon at a time
  const TY = { ES: [4, 3, 1, 2], EN: [3, 2, 0], FR: [3, 1, 0], NL: [1, 2, 1], PI: [0, 2, 0, 3] }[n];
  const pool = n === 'PI' && R() < .45 ? CAPS.filter(c => c.region === region.id && !G.beat.includes(c.name)) : [];
  const cp = pool.length ? pool[R() * pool.length | 0] : null;
  const t = cp ? cp.t : tr ? 4 : TY[R() * TY.length | 0], d = SHIPS[t];
  const rp = PORTS.filter(p => p.region === region.id), own = rp.filter(p => p.n === n), pl = (n !== 'PI' && own.length && R() < .6) ? own : rp;
  const destPort = pickDest(pl, rp, x, y, o); if (!destPort) return;
  
  S.push({ x, y, a: R() * 6.3, n, t, cap: cp, tr, gold: tr ? Math.round(800 + R() * 1200) : 0, hold: Math.round((d.cargo * .6 + d.hull * .5) * (tr ? .9 : .4 + .6 * R())), roll: 0, hp: Math.round(d.hull * (cp ? cp.hp : .5 + R() * .5)), maxHp: d.hull, crew: Math.round(d.crew * (cp ? .55 + R() * .2 : .3 + R() * .4)), w: destPort, cd: 0 });
}

const gunsNow = () => Math.max(0, (SHIPS[G.ship].guns + 2 * G.up[0]) - G.gl), spdM = () => SHIPS[G.ship].spd * (1 + .12 * G.up[1]);
function recalc() { const d = SHIPS[G.ship]; G.maxHull = d.hull + 40 * G.up[2]; CAP = d.cargo + 30 * G.up[3]; if (G.hull > G.maxHull) G.hull = G.maxHull; }

// ---------- graphics: bright cartoon-Caribbean look (animated seas, drifting clouds, towns, billowing sails) ----------
const REVEAL = 290;   // world px: ships closer than this show names and special markings (fully by 240, fading out by 340)
const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
const clouds = Array.from({ length: 16 }, () => ({ x: R() * 1500, y: R() * 1500, s: 40 + R() * 60, o: [R(), R(), R(), R()] }));
let splashes = [], flashes = [], tick = 0;
function drawWaves(ox, oy, skipLand) {
  const T = tick * .03, sp = 56; X.lineCap = 'round'; X.lineWidth = 1.4;
  for (let gy = Math.floor(oy / sp) - 1; gy <= (oy + H) / sp + 1; gy++) for (let gx = Math.floor(ox / sp) - 1; gx <= (ox + W) / sp + 1; gx++) {
    const h = hash(gx, gy), wx = gx * sp + h * sp, wy = gy * sp + hash(gy, gx) * sp;
    if (skipLand && isLand(wx, wy)) continue;
    const ph = Math.sin(T + h * 6.28), al = Math.max(0, ph) * .42; if (al < .06) continue;
    X.strokeStyle = `rgba(255,255,255,${al})`;
    const px = wx - ox + Math.cos(windA) * ph * 6, py = wy - oy + Math.sin(windA) * ph * 6, len = 4 + h * 7, an = windA + (hash(gy, gx) - .5) * 1.1, sn = Math.sin(an), cs = Math.cos(an);
    X.beginPath(); X.moveTo(px - len * sn, py + len * cs); X.quadraticCurveTo(px + cs * 4, py + sn * 4, px + len * sn, py - len * cs); X.stroke();
  }
}
function drawClouds(shadow) {
  const dx = Math.cos(windA), dy = Math.sin(windA);
  clouds.forEach(c => {
    const sx = (((c.x + dx * tick * .22 - cam.x * 1.15) % 1500) + 1500) % 1500 - 350 + (shadow ? 38 : 0), sy = (((c.y + dy * tick * .22 - cam.y * 1.15) % 1500) + 1500) % 1500 - 450 + (shadow ? 46 : 0);
    X.fillStyle = shadow ? 'rgba(0,25,45,.16)' : 'rgba(255,255,255,.34)';
    c.o.forEach((o, i) => { X.beginPath(); X.arc(sx + (i - 1.5) * c.s * .55, sy + (o - .5) * c.s * .3, c.s * (.45 + o * .3), 0, 7); X.fill(); });
  });
}
function drawPort(p) {
  const x = p.x, y = p.y, h = hash(p.x, p.y), col = NAT[p.n][1], bad = p.n !== 'PI' && G.rep[p.n] < 0;
  X.fillStyle = '#7a5a34'; X.fillRect(x - 3, y - 2, 20, 4);
  for (let i = 0; i < 5; i++) { const hx = x - 18 + i * 7 + (hash(i, h) - .5) * 4, hy = y - 8 - (hash(h, i) * 8 | 0); X.fillStyle = ['#f2e6c9', '#e8c9a0', '#f0d9b5'][i % 3]; X.fillRect(hx, hy, 7, 6); X.fillStyle = ['#c0392b', '#b5651d', '#a93226'][(i + (h * 3 | 0)) % 3]; X.beginPath(); X.moveTo(hx - 1, hy); X.lineTo(hx + 3.5, hy - 4); X.lineTo(hx + 8, hy); X.fill(); }
  X.fillStyle = '#9a9a9a'; X.fillRect(x - 6, y - 20, 12, 11); X.fillStyle = '#707070'; X.fillRect(x - 6, y - 23, 3, 4); X.fillRect(x + 3, y - 23, 3, 4);
  X.strokeStyle = '#3a2a1a'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(x, y - 20); X.lineTo(x, y - 36); X.stroke();
  const w = Math.sin(tick * .15 + h * 6) * 2; X.fillStyle = col; X.strokeStyle = '#000'; X.lineWidth = .8; X.beginPath(); X.moveTo(x, y - 36); X.quadraticCurveTo(x + 6, y - 37 + w, x + 13, y - 34 + w); X.lineTo(x + 13, y - 29 + w); X.quadraticCurveTo(x + 6, y - 32 + w, x, y - 30); X.closePath(); X.fill(); X.stroke();
  if (p.gov) { X.strokeStyle = '#fff'; X.lineWidth = 2; X.beginPath(); X.arc(x, y - 8, 22, 0, 7); X.stroke(); }
  X.font = 'bold 12px serif'; const tw = X.measureText(p.name).width + 10;
  X.fillStyle = 'rgba(245,230,190,.9)'; X.fillRect(x - tw / 2, y + 5, tw, 15); X.strokeStyle = '#5a3d1e'; X.lineWidth = 1; X.strokeRect(x - tw / 2, y + 5, tw, 15);
  X.fillStyle = bad ? '#a11' : '#2a1a0a'; X.fillText(p.name, x, y + 17);
}
function drawCompass() {
  const cx = 62, cy = H - 62, r = 44; X.save(); X.translate(cx, cy);
  X.fillStyle = 'rgba(240,225,185,.9)'; X.strokeStyle = '#5a3d1e'; X.lineWidth = 3; X.beginPath(); X.arc(0, 0, r, 0, 7); X.fill(); X.stroke();
  X.fillStyle = '#5a3d1e'; X.font = 'bold 12px serif'; X.textAlign = 'center'; X.fillText('N', 0, -r + 14);
  X.save(); X.rotate(windA); X.strokeStyle = '#1b6ca8'; X.fillStyle = '#1b6ca8'; X.lineWidth = 4; X.beginPath(); X.moveTo(-24, 0); X.lineTo(14, 0); X.stroke(); X.beginPath(); X.moveTo(26, 0); X.lineTo(10, -9); X.lineTo(10, 9); X.closePath(); X.fill(); X.restore();
  X.save(); X.rotate(P.a); X.fillStyle = '#a33'; X.beginPath(); X.moveTo(12, 0); X.lineTo(-7, -6); X.lineTo(-7, 6); X.closePath(); X.fill(); X.restore();
  X.fillStyle = '#5a3d1e'; X.font = '10px serif'; X.fillText('wind', 0, r - 6); X.restore();
}
function vignette() { const g = X.createRadialGradient(W / 2, H / 2, H * .38, W / 2, H / 2, W * .72); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,18,30,.42)'); X.fillStyle = g; X.fillRect(0, 0, W, H); }
function drawEffects() {
  splashes = splashes.filter(q => q.t < 24); flashes = flashes.filter(f => f.t < 6);
  splashes.forEach(q => { q.t++; X.strokeStyle = `rgba(255,255,255,${1 - q.t / 24})`; X.lineWidth = 2; X.beginPath(); X.arc(q.x, q.y, 2 + q.t * .6, 0, 7); X.stroke(); });
  flashes.forEach(f => { f.t++; X.fillStyle = `rgba(255,${210 - f.t * 25},60,${1 - f.t / 6})`; X.beginPath(); X.arc(f.x, f.y, 11 - f.t, 0, 7); X.fill(); });
}
function drawShip(x, y, a, col, sc = 1, t = 0, roll = 0, hpRatio = 1) {
  const d = SHIPS[t], L = d.L, W = d.W, wf = .5 + .5 * Math.cos(a - windA), wd = windA - a, side = Math.sin(wd) >= 0 ? 1 : -1;
  X.save(); X.translate(x, y); X.rotate(a); X.scale(sc, sc);
  X.fillStyle = 'rgba(0,30,50,.28)'; X.beginPath(); X.ellipse(2, 4, L * .55, W * .62, 0, 0, 7); X.fill();
  X.fillStyle = 'rgba(255,255,255,.3)'; X.beginPath(); X.ellipse(L * .1, 0, L * .6, W * .75, 0, 0, 7); X.fill();
  X.scale(1, 1 - Math.abs(roll) * .3); X.transform(1, roll * .2, 0, 1, 0, 0);
  const hull = () => { X.beginPath(); X.moveTo(L / 2 + 3, 0); X.quadraticCurveTo(L * .28, W / 2, -L * .1, W / 2); X.lineTo(-L / 2, W * .4); X.lineTo(-L / 2, -W * .4); X.lineTo(-L * .1, -W / 2); X.quadraticCurveTo(L * .28, -W / 2, L / 2 + 3, 0); X.closePath(); };
  hull(); X.fillStyle = d.c; X.fill(); X.lineWidth = 1.2; X.strokeStyle = '#1a0f06'; X.stroke();
  X.save(); hull(); X.clip(); X.fillStyle = 'rgba(0,0,0,.18)'; X.fillRect(-L, W * .12, L * 2, W); X.restore();
  X.fillStyle = '#c9a56b'; X.beginPath(); X.ellipse(-L * .05, 0, L * .4, W * .33, 0, 0, 7); X.fill();
  X.strokeStyle = 'rgba(70,40,15,.45)'; X.lineWidth = .6; for (let k = -1; k <= 1; k++) { X.beginPath(); X.moveTo(-L * .38, k * W * .14); X.lineTo(L * .3, k * W * .14); X.stroke(); }
  if (t >= 2) { X.fillStyle = '#e0c48a'; X.fillRect(-L * .46, -W * .28, L * .16, W * .56); X.strokeStyle = '#3a2410'; X.strokeRect(-L * .46, -W * .28, L * .16, W * .56); }
  if (t === 4) { X.fillStyle = '#e8c03a'; X.fillRect(-L / 2, -W * .12, 2, W * .24); }
  X.fillStyle = '#111'; for (let i = 0; i < d.guns; i++) { const gx = -L * .3 + L * .55 * (d.guns > 1 ? i / (d.guns - 1) : .5); X.fillRect(gx - 1, W / 2 - 2.2, 2, 2.6); X.fillRect(gx - 1, -W / 2 - .4, 2, 2.6); }
  X.strokeStyle = '#3a2410'; X.lineWidth = 1.4; X.beginPath(); X.moveTo(L / 2, 0); X.lineTo(L / 2 + 10, 0); X.stroke();
  X.strokeStyle = 'rgba(60,40,20,.5)'; X.lineWidth = .5; d.m.forEach(mx => { X.beginPath(); X.moveTo(L / 2 + 8, 0); X.lineTo(mx, 0); X.moveTo(-L / 2, 0); X.lineTo(mx, 0); X.moveTo(mx, -W * .45); X.lineTo(mx, W * .45); X.stroke(); });
  d.m.forEach((mx, i) => {
    const fa = d.fa && i === d.m.length - 1, sw = W * (fa ? .5 : .68), bl = 1.5 + 3.5 * wf;
    X.fillStyle = '#f7f0dc'; X.strokeStyle = '#8a7a58'; X.lineWidth = .9; X.beginPath();
    if (fa) { const bs = side * (3 + 5 * wf); X.moveTo(mx + L * .14, 0); X.quadraticCurveTo(mx - L * .06, bs * 2, mx - L * .3, bs * .8); X.lineTo(mx - L * .3, 0); X.closePath(); }
    else { X.moveTo(mx - 1.5, -sw); X.quadraticCurveTo(mx + bl * 2.2, 0, mx - 1.5, sw); X.lineTo(mx - 3.5, sw); X.quadraticCurveTo(mx - 3.5 + bl * .4, 0, mx - 3.5, -sw); X.closePath(); }
    X.fill(); X.stroke();
    if (!fa) { X.strokeStyle = col; X.globalAlpha = .85; X.lineWidth = 1.8; X.beginPath(); X.moveTo(mx + bl * .45, -sw * .85); X.lineTo(mx + bl * .45, sw * .85); X.stroke(); X.globalAlpha = 1; }
    X.fillStyle = '#2a1a0c'; X.beginPath(); X.arc(mx, 0, 1.7, 0, 7); X.fill();
  });
  const fm = d.m[d.m.length >> 1], fw = Math.sin(tick * .22 + fm) * 1.8, fx = Math.cos(wd), fy = Math.sin(wd);
  X.fillStyle = col; X.strokeStyle = '#000'; X.lineWidth = .5; X.beginPath(); X.moveTo(fm, 0); X.lineTo(fm + fx * 12 - fy * fw, fy * 12 + fx * fw); X.lineTo(fm + fx * 9 + fy * 3, fy * 9 - fx * 3); X.closePath(); X.fill(); X.stroke();
  X.fillStyle = col; X.fillRect(-L / 2 - 4, -2, 5, 4);
  X.restore();
  if (hpRatio < 0.4 && R() < 0.3) spawnParticle('fire', x + (R() - 0.5) * L, y + (R() - 0.5) * W, 0, 0);
}

function seaUpdate() {
  windA += (R() - .5) * .006;
  let turn = 0;
  if (K.a || K.arrowleft) { P.a -= .04; turn = -1; }
  if (K.d || K.arrowright) { P.a += .04; turn = 1; }
  P.roll += (turn * 0.8 - P.roll) * 0.1;
  let sp = 1.7 * spdM() * (.3 + .7 * (1 + Math.cos(P.a - windA)) / 2);
  
  if (!isUnlocked(P.x, P.y)) {
    stormForce = Math.min(stormForce + 0.1, 4); 
    const cr = nearestUnlocked(P.x, P.y), pa = Math.atan2(cr.y - P.y, cr.x - P.x), px = P.x + Math.cos(pa) * stormForce, py = P.y + Math.sin(pa) * stormForce;
    if (!isLandArea(px, py, 10)) { P.x = px; P.y = py; }
    shake = 12;
    if(msgT === 0) say('A storm blocks the unknown! Unlock maps in port.');
  } else { stormForce = 0; }

  let nx = P.x + Math.cos(P.a) * sp; let ny = P.y + Math.sin(P.a) * sp;
  const sc0 = landScore(P.x, P.y, 5), free = (x, y) => { const c = landScore(x, y, 5); return c === 0 || c < sc0; };
  if (free(nx, ny)) { P.x = nx; P.y = ny; } else if (free(nx, P.y)) P.x = nx; else if (free(P.x, ny)) P.y = ny; else sp = 0.5;
  P.x = Math.max(20, Math.min(WW - 20, P.x)); P.y = Math.max(20, Math.min(WH - 20, P.y));
  if (sp > 0.5 && R() < 0.5 && !isLand(P.x, P.y)) spawnParticle('wake', P.x - Math.cos(P.a) * 15, P.y - Math.sin(P.a) * 15, P.a + PI + (R()-0.5), sp * 0.2);
  G.day += .015; if (++svT > 600) { svT = 0; saveGame(); } 
  
  S.forEach(s => {
    const [tx, ty] = aim(s);
    let targetA = nrm(Math.atan2(ty - s.y, tx - s.x) - s.a);
    let turnSpeed = Math.max(-.05, Math.min(.05, targetA));
    
    // Whisker Raycasts
    const lookAhead = 40; 
    const hitCenter = isLandArea(s.x + Math.cos(s.a) * lookAhead, s.y + Math.sin(s.a) * lookAhead, 10);
    const hitLeft = isLandArea(s.x + Math.cos(s.a - 0.8) * lookAhead, s.y + Math.sin(s.a - 0.8) * lookAhead, 10);
    const hitRight = isLandArea(s.x + Math.cos(s.a + 0.8) * lookAhead, s.y + Math.sin(s.a + 0.8) * lookAhead, 10);

    // trust the route when the straight line to the next waypoint is clear; the whiskers only take over when it isn't
    const blocked = (hitCenter || hitLeft || hitRight) && !clearLine(s.x, s.y, tx, ty);
    if (blocked) {
      if (hitLeft && !hitRight) turnSpeed = 0.08; 
      else if (hitRight && !hitLeft) turnSpeed = -0.08; 
      else turnSpeed = targetA >= 0 ? 0.08 : -0.08; 
    }
    
    if (!blocked) {   // predict the closest approach to the player and swerve early so we never run into them
      const sv0 = 1.1 * SHIPS[s.t].spd, psp = 1.7 * spdM() * (.3 + .7 * (1 + Math.cos(P.a - windA)) / 2);
      const rx = P.x - s.x, ry = P.y - s.y, vx = Math.cos(P.a) * psp - Math.cos(s.a) * sv0, vy = Math.sin(P.a) * psp - Math.sin(s.a) * sv0, vv = vx * vx + vy * vy;
      const tc = vv > 1e-6 ? -(rx * vx + ry * vy) / vv : 0, d0 = Math.hypot(rx, ry), br = nrm(Math.atan2(ry, rx) - s.a);
      if (d0 < 70 && Math.abs(br) < 2.2) turnSpeed = (br > 0 ? -1 : 1) * .08;   // already close: turn hard away
      else if (tc > 0 && tc < 240 && d0 < 360) {
        const cx = rx + vx * tc, cy = ry + vy * tc, cd = Math.hypot(cx, cy);
        if (cd < 80) { const lat = -cx * Math.sin(s.a) + cy * Math.cos(s.a), u = (1 - cd / 80) * .5 + (1 - tc / 240) * .5; turnSpeed = (lat > 0 ? -1 : 1) * Math.min(.08, .03 + .07 * u); }
      }
    }
    s.a += turnSpeed; s.roll += ((turnSpeed > 0 ? 1 : -1) * 0.6 - s.roll) * 0.1;
    const sv = 1.1 * SHIPS[s.t].spd; 
    let snx = s.x + Math.cos(s.a) * sv; let sny = s.y + Math.sin(s.a) * sv;
    
    const sc0 = landScore(s.x, s.y, 7), fr = (x, y) => { const c = landScore(x, y, 7); return c === 0 || c < sc0; };
    if (fr(snx, sny)) { s.x = snx; s.y = sny; } else if (fr(snx, s.y)) s.x = snx; else if (fr(s.x, sny)) s.y = sny; else s.a += targetA >= 0 ? 0.15 : -0.15;
    if (s.px === undefined) { s.px = s.x; s.py = s.y; s.ck = 0; s.sk = 0; }
    if (++s.ck >= 120) {   // moved less than 30px in 2 seconds: pick a new route; if that fails, sail away (it respawns at a port)
      s.ck = 0;
      const prog = s.pfv === undefined ? 9 : s.pfv - s.fv;
      if (Math.hypot(s.x - s.px, s.y - s.py) < 30 || (s.fv > 1 && prog < 1)) {
        s.sk++; const o2 = pickDest(PORTS.filter(q => q.region === s.w.region && q !== s.w), [], s.x, s.y, s.w); if (o2) s.w = o2; s.a += PI;
        if (s.sk >= 2) { if (Math.hypot(P.x - s.x, P.y - s.y) > 500) s.in = 1; else { s.a = R() * 6.28; s.sk = 1; } }
      } else s.sk = 0;
      s.px = s.x; s.py = s.y; s.pfv = s.fv;
    }
    if (sv > 0.5 && R() < 0.3) spawnParticle('wake', s.x - Math.cos(s.a) * 10, s.y - Math.sin(s.a) * 10, s.a + PI, sv * 0.2);
    
    if (Math.hypot(s.x - s.w.x, s.y - s.w.y) < 35) s.in = 1;
    
    s.cd = Math.max(0, (s.cd || 0) - 1);
    if (Math.hypot(P.x - s.x, P.y - s.y) < 25 && s.cd === 0) engage(s);
  });
  
  S = S.filter(s => !s.in); if (S.length < NS && R() < .03 && collisionMask) spawn();
  if (K[' ']) { K[' '] = 0; act(); }
}

function engage(s) { if (!hostile(s.n)) G.rep[s.n] = -1; startBattle(s); }
function act() { if (mode !== 'sea') return; const h = near(); if (!h) return; if (h.port) openPort(h.port); else engage(h.ship); }
function near() {
  let p = PORTS.find(p => Math.hypot(P.x - p.x, P.y - p.y) < 45); if (p) return { port: p, t: '⚓ Enter ' + p.name };
  let s = S.find(s => Math.hypot(P.x - s.x, P.y - s.y) < 55); if (s) return { ship: s, t: '⚔ Attack ' + (s.cap ? '☠ ' + s.cap.name : s.tr ? '★ Treasure ' + SHIPS[s.t].name : NAT[s.n][0] + ' ' + SHIPS[s.t].name) };
}

function seaDraw() {
  cam.x = Math.max(0, Math.min(WW - W, P.x - W / 2)); cam.y = Math.max(0, Math.min(WH - H, P.y - H / 2));
  if (shake > .5) { cam.x += (R() - .5) * shake; cam.y += (R() - .5) * shake; shake *= .9; }
  X.filter = 'saturate(1.3) contrast(1.05)';
  if (mapLoaded) { X.drawImage(mapImg, cam.x * (mapW / WW), cam.y * (mapH / WH), W * (mapW / WW), H * (mapH / WH), 0, 0, W, H); } 
  else { X.fillStyle = '#1f5f86'; X.fillRect(0, 0, W, H); }
  X.filter = 'none'; drawWaves(cam.x, cam.y, true); drawClouds(true);
  if (dbg && collisionMask) { X.fillStyle = 'rgba(255,0,0,.35)'; for (let yy = 0; yy < H; yy += 8) for (let xx = 0; xx < W; xx += 8) if (isLand(cam.x + xx, cam.y + yy)) X.fillRect(xx, yy, 8, 8); }
  
  X.save(); X.translate(-cam.x, -cam.y); X.textAlign = 'center';
  PORTS.forEach(p => { if (p.x > cam.x - 80 && p.x < cam.x + W + 80 && p.y > cam.y - 80 && p.y < cam.y + H + 80) drawPort(p); });
  
  drawParticles(X);
  if (dbg) PORTS.forEach(p => { if (isLandArea(p.x, p.y, 6)) { X.fillStyle = '#f00'; X.fillText('LAND: ' + p.name, p.x, p.y + 24); } });
  S.forEach(q => {
    // far away every ship looks like an ordinary ship of its nation; names, treasure and captain markings fade in as you close
    const rev = Math.max(0, Math.min(1, (REVEAL + 50 - Math.hypot(q.x - P.x, q.y - P.y)) / 100)), known = rev >= .5;
    drawShip(q.x, q.y, q.a, known && q.tr ? '#ffd700' : NAT[q.n][1], known && q.tr ? 1.25 : 1, q.t, q.roll, q.hp / q.maxHp);
    if (rev > 0 && (q.tr || q.cap)) { X.globalAlpha = rev; X.fillStyle = q.tr ? '#ffd700' : '#fff'; X.font = 'bold 11px system-ui'; X.fillText(q.tr ? '★ Treasure galleon' : '☠ ' + q.cap.name, q.x, q.y - 22); X.globalAlpha = 1; }
  });
  drawShip(P.x, P.y, P.a, NAT.EN[1], 1.15, G.ship, P.roll, G.hull / G.maxHull);
  X.restore();
  drawClouds(false);

  fogX.clearRect(0, 0, W, H); fogX.fillStyle = 'rgba(15, 20, 25, 0.85)'; fogX.fillRect(0, 0, W, H);
  fogX.globalCompositeOperation = 'destination-out';
  REGIONS.forEach(r => {
    if (G.unlockedRegions.includes(r.id)) {
      fogX.beginPath(); let cx = r.x - cam.x, cy = r.y - cam.y;
      let grd = fogX.createRadialGradient(cx, cy, r.r * 0.7, cx, cy, r.r);
      grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      fogX.fillStyle = grd; fogX.arc(cx, cy, r.r, 0, PI * 2); fogX.fill();
    }
  });
  fogX.globalCompositeOperation = 'source-over'; X.drawImage(fogC, 0, 0);
  vignette(); drawCompass();
}

function startBattle(s) {
  K.f = K.b = 0; splashes = []; flashes = [];
  B = { s, fc: 0, p: { x: 160, y: 260, a: 0, cd: [0, 0], roll: 0 }, e: { x: 640, y: 260, a: PI, hp: s.hp, maxHp: s.maxHp, crew: s.crew, gl: s.gl || 0, cd: [0, 0], roll: 0 }, balls: [] };
  mode = 'battle'; say('Battle! Q/E broadsides, B board, F flee.');
}
function fire(o, side, own) {
  const n = own ? gunsNow() : enemyGuns(); if (n < 1) return;
  o.cd[side > 0 ? 1 : 0] = 1; flashes.push({ x: o.x + Math.cos(o.a + side * PI / 2) * 20, y: o.y + Math.sin(o.a + side * PI / 2) * 20, t: 0 });
  const life = own ? Math.round(60 * (1 + .15 * G.up[4])) : 60, step = n > 1 ? .7 / ((n + 1) * (n - 1)) : 0;
  for (let i = 0; i < n; i++) {
    const a = o.a + side * PI / 2 + (i - (n - 1) / 2) * step;
    B.balls.push({ x: o.x, y: o.y, vx: Math.cos(a) * 5.5, vy: Math.sin(a) * 5.5, l: life, own });
    spawnParticle('smoke', o.x + Math.cos(a) * 10, o.y + Math.sin(a) * 10, a, 1);
  }
}
function battleUpdate() {
  const p = B.p, e = B.e, cap = B.s.cap; if (B.fc > 0) B.fc--;
  let turn = 0;
  if (K.a || K.arrowleft) { p.a -= .032; turn = -1; }
  if (K.d || K.arrowright) { p.a += .032; turn = 1; }
  p.roll += (turn * 0.8 - p.roll) * 0.1;
  if (K.q && !p.cd[0]) fire(p, -1, 1); if (K.e && !p.cd[1]) fire(p, 1, 1);
  const dist = Math.hypot(p.x - e.x, p.y - e.y), t = Math.atan2(p.y - e.y, p.x - e.x);
  let want = t; if (dist < 320) want = Math.abs(nrm((t + PI / 2) - e.a)) < Math.abs(nrm((t - PI / 2) - e.a)) ? t + PI / 2 : t - PI / 2;
  e.a += Math.max(-.026, Math.min(.026, nrm(want - e.a)));
  e.roll += ((nrm(want - e.a) > 0 ? 1 : -1) * 0.6 - e.roll) * 0.1;
  const rel = nrm(t - e.a);
  if (dist < 300) {
    if (Math.abs(rel - PI / 2) < .3 && !e.cd[1] && R() < .3) fire(e, 1, 0);
    if (Math.abs(rel + PI / 2) < .3 && !e.cd[0] && R() < .3) fire(e, -1, 0);
  }
  [p, e].forEach(o => {
    const me = o === p, v = me ? 1.3 * spdM() : 1.3 * SHIPS[B.s.t].spd * (cap ? cap.spd : 1), rate = (me ? 1 : cap ? cap.rate : 1) / fireCd(me ? G.crew : e.crew);
    o.x = Math.max(10, Math.min(W - 10, o.x + Math.cos(o.a) * v)); o.y = Math.max(10, Math.min(H - 10, o.y + Math.sin(o.a) * v));
    o.cd = o.cd.map(c => Math.max(0, c - rate));
    if (R() < 0.4) spawnParticle('wake', o.x - Math.cos(o.a) * 15, o.y - Math.sin(o.a) * 15, o.a + PI, v * 0.2);
  });
  B.balls = B.balls.filter(b => {
    b.x += b.vx; b.y += b.vy; b.l--;
    const tg = b.own ? e : p;
    if (Math.hypot(b.x - tg.x, b.y - tg.y) < 26) {
      spawnParticle('explosion', b.x, b.y, 0, 0);
      if (b.own) {
        e.hp -= 5; B.s.hp = e.hp; e.crew = Math.max(1, e.crew - (R() * 1.5 | 0));
        const eg = SHIPS[B.s.t].guns + (cap ? cap.g : 0); let lost = 0;
        if (R() < .15 && e.gl < eg) { e.gl++; lost = 1; }
        if (eg - e.gl <= 1 && R() < (lost ? .55 : .1) * (cap ? .35 : 1)) B.sur = 1;
      } else {
        G.hull -= 4; if (R() < .3) G.crew = Math.max(1, G.crew - 1);
        if (R() < .15 && G.gl < SHIPS[G.ship].guns + 2 * G.up[0]) G.gl++;
      }
      return false;
    }
    if (b.l <= 0) { splashes.push({ x: b.x, y: b.y, t: 0 }); return false; }
    return true;
  });
  if (K.f) { K.f = 0; if (flee()) return; }
  if (K.b) { K.b = 0; if (dist < boardRange()) return board(); say('Too far to board. Close in until the green ring appears.'); }
  if (B.sur && e.hp > 0) return surrender();
  if (e.hp <= 0) return win(.5, 'You sank the ship!');
  if (G.hull <= 0) return gameOver('Your ship went down.');
}
function flee() {
  if (B.fc > 0) { say('Still under fire. Wait a moment.'); return false; }
  B.fc = 150; const d = Math.hypot(B.p.x - B.e.x, B.p.y - B.e.y);
  if (R() < Math.min(.9, .35 + .5 * (spdM() - 1) + Math.max(0, d - 150) / 800)) { endBattle(false); say('You slip away!'); return true; }
  G.hull -= 5; say('Escape failed! They rake your stern.'); return false;
}
function endBattle(sunk) { if (sunk) B.s.in = 1; else B.s.cd = 150; mode = 'sea'; B = null; particles.length = 0; }
function win(f, t) {
  const s = B.s, c = s.cap, loot = Math.round((60 + R() * 140) * f * SHIPS[s.t].loot * (c ? c.loot : 1)) + Math.round((s.gold || 0) * f);
  G.gold += loot; G.sunk++; if (c && !G.beat.includes(c.name)) G.beat.push(c.name);
  const want = Math.round((s.hold || 0) * Math.min(1, f)), take = Math.max(0, Math.min(CAP - cargoN(), want)), w = [R(), R(), R()], tw = w[0] + w[1] + w[2];
  const got = w.map(x => Math.floor(take * x / tw)); got[0] += take - got[0] - got[1] - got[2]; got.forEach((n, i) => G.cargo[i] += n);
  const goods = got.map((n, i) => n ? '+' + n + ' ' + GOODS[i] : '').filter(Boolean).join(', ');
  endBattle(true);
  say((c ? '☠ ' + c.name + ' is defeated! ' : s.tr ? '★ Treasure galleon taken! ' : '') + t + ' +' + loot + ' gold' + (goods ? ', ' + goods : '') + (take < want ? ' (hold full)' : ''));
}
function board() {
  let a = G.crew, b = B.e.crew; while (a > 0 && b > 0) { b -= Math.ceil(a * .12 * R() + 1); a -= Math.ceil(b * .12 * R() + 1); }
  if (b <= 0) { G.crew = Math.max(1, a); const s = B.s, eh = B.e.hp, eg = B.e.gl; win(1, 'Boarding won!'); prize(s, eh, eg); }
  else { G.crew = Math.max(3, Math.floor(G.crew * .3)); G.gold = Math.floor(G.gold / 2); endBattle(false); say('Boarding failed. You lost men and gold.'); }
}
function surrender() { const s = B.s, eh = B.e.hp, eg = B.e.gl; win(.6, 'They strike their colors!'); prize(s, eh, eg); }
function prize(q, eh, gl) {
  const d = SHIPS[q.t]; PZ = { t: q.t, hp: Math.max(15, Math.round(eh)), gl: Math.min(gl || 0, d.guns) };
  const v = Math.round(d.price * .3), o = Math.floor(SHIPS[G.ship].price * .4); mode = 'menu'; OV.hidden = false;
  OV.innerHTML = `<div class="card"><h2>${q.cap ? '☠ ' + q.cap.ship : 'Prize'}: ${d.name} taken!</h2><p>${MSG.textContent}</p><p>Hull ${PZ.hp}/${d.hull} · guns ${d.guns - PZ.gl}/${d.guns}. Upgrades stay with the ship they were bought for, so switching means giving up yours.</p><button onclick="keepPrize(${o})">Make it my flagship (sell yours for ${o}g)</button><button class="alt" onclick="sellPrize(${v})">Sell it (${v}g)</button></div>`;
}
window.keepPrize = o => { G.gold += o; G.ship = PZ.t; G.up = [0, 0, 0, 0, 0]; G.gl = PZ.gl; recalc(); G.hull = Math.min(G.maxHull, PZ.hp); G.crew = Math.min(G.crew, SHIPS[G.ship].crew); while (cargoN() > CAP) G.cargo[G.cargo.findIndex(v => v > 0)]--; setSail(); };
window.sellPrize = v => { G.gold += v; setSail(); };
function gameOver(t) {
  mode = 'over'; OV.hidden = false;
  OV.innerHTML = `<div class="card"><h2>Game over</h2><p>${t}</p><p>Fortune: <b>${G.gold}</b> gold · ships taken: ${G.sunk}</p>${hasSave() ? '<button class="alt" onclick="loadGame()">Load last save</button>' : ''}<button onclick="newGame()">New game</button></div>`;
}
function battleDraw() {
  X.fillStyle = '#1b6a96'; X.fillRect(0, 0, W, H); const gr = X.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(0,20,40,.28)'); X.fillStyle = gr; X.fillRect(0, 0, W, H);
  drawWaves(0, 0, false); drawParticles(X); drawEffects();
  B.balls.forEach(b => { X.fillStyle = '#111'; X.beginPath(); X.arc(b.x, b.y, 3, 0, 7); X.fill(); });
  const e = B.e, cap = B.s.cap;
  drawShip(e.x, e.y, e.a, cap ? '#e11' : B.s.tr ? '#ffd700' : NAT[B.s.n][1], 2.2, B.s.t, e.roll, Math.max(0, e.hp) / e.maxHp);
  drawShip(B.p.x, B.p.y, B.p.a, NAT.EN[1], 2.2, G.ship, B.p.roll, Math.max(0, G.hull) / G.maxHull);
  const bd = Math.hypot(B.p.x - e.x, B.p.y - e.y), brg = boardRange();
  if (bd < brg * 2) { const near = bd < brg; X.strokeStyle = near ? '#4cd964' : 'rgba(255,214,10,.6)'; X.lineWidth = 3; X.setLineDash(near ? [] : [8, 6]); X.beginPath(); X.arc(e.x, e.y, brg, 0, 7); X.stroke(); X.setLineDash([]); if (near) { X.fillStyle = '#4cd964'; X.font = 'bold 16px system-ui'; X.textAlign = 'center'; X.fillText('⚓ Press B to board!', W / 2, H - 34); } }
  X.font = '13px system-ui'; X.fillStyle = '#fff'; X.textAlign = 'left';
  X.fillText(`Your ${SHIPS[G.ship].name} · hull ${Math.max(0, G.hull | 0)} · crew ${G.crew}`, 12, 22);
  X.textAlign = 'right';
  X.fillText(`${cap ? '☠ ' + cap.name + '’s ' + cap.ship : B.s.tr ? '★ Treasure ' + SHIPS[B.s.t].name : NAT[B.s.n][0] + ' ' + SHIPS[B.s.t].name} · hull ${Math.max(0, e.hp | 0)} · crew ${e.crew} · guns ${enemyGuns()}`, W - 12, 22);
  X.textAlign = 'left'; X.font = '11px system-ui';
  X.fillText(`Guns ${gunsNow()}/${SHIPS[G.ship].guns + 2 * G.up[0]} per side · reload ${(fireCd(G.crew) / 60).toFixed(1)}s (more crew = faster) · F flee · B board`, 12, H - 12);
  [['Q  port guns', B.p.cd[0]], ['E  starboard guns', B.p.cd[1]]].forEach(([t, c], i) => { const y = 32 + i * 20; X.fillStyle = 'rgba(0,0,0,.5)'; X.fillRect(12, y, 160, 15); X.fillStyle = c ? '#f0b429' : '#4cd964'; X.fillRect(12, y, 160 * (1 - c), 15); X.fillStyle = '#fff'; X.fillText(t + (c ? '' : ' · READY'), 17, y + 11); });
}

const UPN = ['Cannons', 'Sails', 'Hull', 'Cargo', 'Range'], UPC = [200, 150, 200, 120, 180];
const UPD = [ l => (SHIPS[G.ship].guns + 2 * l) + ' guns', l => '+' + l * 12 + '% speed', l => (SHIPS[G.ship].hull + 40 * l) + ' max hull', l => (SHIPS[G.ship].cargo + 30 * l) + ' cargo', l => '+' + l * 15 + '% range' ];

function openPort(p) { mode = 'port'; cur = p; prices = GOODS.map((g, i) => Math.round(BASE[i] * p.m[i] * (.9 + R() * .2))); renderPort(); }
function renderPort() {
  OV.hidden = false;
  let t = `<div class="card"><h2>${cur.name} <small>(${NAT[cur.n][0]})</small></h2>`;
  t += `<div style="margin-bottom:12px;">Gold <b>${G.gold}</b> · Crew <b>${G.crew}</b> · Hull <b>${Math.max(0,G.hull|0)}/${G.maxHull}</b> · Cargo ${cargoN()}/${CAP}</div>`;
  if (hostile(cur.n) && cur.n !== 'PI') { OV.innerHTML = t + `<p>${NAT[cur.n][0]} is hostile, so the harbor guns bar you from docking. Garrison: about ${cur.gar}.</p><button onclick="bribe()">Bribe the governor (${bribeCost(cur.n)}g)</button><button class="alt" onclick="setSail()">Set Sail</button></div>`; return; }
  t += `<table>` + GOODS.map((g,i) => `<tr><td>${g} (have ${G.cargo[i]})</td><td>Buy ${prices[i]}g</td><td><button onclick="buy(${i})">+1</button></td><td>Sell ${Math.floor(prices[i]*.85)}g</td><td><button class="alt" onclick="sell(${i})">-1</button></td></tr>`).join('') + `</table>`;
  t += `<button onclick="repair()">Repair hull (3g/pt)</button>${G.gl ? `<button onclick="fixGuns()">Replace ${G.gl} lost guns (${G.gl * 15}g)</button>` : ''}<button onclick="recruit()">Recruit 5 crew (40g)</button>`;
  t += `<h3 style="margin:8px 0 2px;font-size:1rem">Shipwright</h3><table>` + cur.yard.map(i => `<tr><td>${UPN[i]} Lv${G.up[i]}/4</td><td>${UPD[i](G.up[i])}</td><td>${G.up[i]<4 ? `<button onclick="upgrade(${i})">${UPC[i]*(G.up[i]+1)}g</button>` : 'MAX'}</td></tr>`).join('') + '</table>';
  t += `<h3 style="margin:8px 0 2px;font-size:1rem">Shipyard</h3><table>` + cur.ships.map(i => `<tr><td><b>${SHIPS[i].name}</b></td><td>${i === G.ship ? 'Yours' : `<button onclick="buyShip(${i})">${SHIPS[i].price - Math.floor(SHIPS[G.ship].price * 0.5)}g</button>`}</td></tr>`).join('') + '</table>';
  let nextRegion = REGIONS.find(r => !G.unlockedRegions.includes(r.id));
  if (nextRegion) t += `<hr><p>Buy map to <b>${nextRegion.name}</b> (${nextRegion.unlockCost}g)</p><button onclick="unlockRegion('${nextRegion.id}', ${nextRegion.unlockCost})">Unlock Region</button>`;
  t += `<br><button class="alt" style="margin-top:12px; width:100%" onclick="setSail()">Set Sail</button></div>`;
  OV.innerHTML = t;
}

window.buy = (i) => { if(G.gold >= prices[i] && cargoN() < CAP) { G.gold -= prices[i]; G.cargo[i]++; renderPort(); } };
window.sell = (i) => { if(G.cargo[i] > 0) { G.cargo[i]--; G.gold += Math.floor(prices[i]*.85); renderPort(); } };
window.repair = () => { const n = Math.min(G.maxHull - G.hull, Math.floor(G.gold/3)); if(n>0) { G.hull += n; G.gold -= n*3; renderPort(); } };
window.recruit = () => { if(G.gold >= 40 && G.crew < SHIPS[G.ship].crew) { G.gold -= 40; G.crew += 5; renderPort(); } };
window.upgrade = (i) => { const c = UPC[i] * (G.up[i]+1); if(G.up[i]<4 && G.gold>=c) { G.gold-=c; G.up[i]++; recalc(); if(i===2) G.hull+=40; renderPort(); } };
window.buyShip = (i) => { const c = SHIPS[i].price - Math.floor(SHIPS[G.ship].price * 0.5); if(G.gold >= c) { G.gold-=c; G.ship=i; recalc(); G.hull=G.maxHull; G.gl=0; G.crew=Math.min(G.crew, SHIPS[i].crew); while(cargoN()>CAP) G.cargo[G.cargo.findIndex(v=>v>0)]--; renderPort(); say('You command a new ship!'); } };
window.unlockRegion = function(id, cost) { if (G.gold >= cost) { G.gold -= cost; G.unlockedRegions.push(id); renderPort(); say('A new region of the world is revealed.'); } }
function faceAway(pt) {
  const away = Math.atan2(P.y - pt.y, P.x - pt.x);
  const clear = a => { let d = 0; while (d < 160 && !isLandArea(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, 6)) d += 8; return d; };
  let best = away, bd = -1;
  for (let k = 0; k < 16; k++) { const a = away + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * (PI / 8), c = clear(a); if (c >= 120) { best = a; break; } if (c > bd) { bd = c; best = a; } }
  P.a = best; P.roll = 0;
}
window.setSail = () => { if (mode === 'port' && cur) faceAway(cur); document.getElementById('ov').hidden = true; mode = 'sea'; K = {}; saveGame(); };
window.bribe = () => { const c = bribeCost(cur.n); if (G.gold >= c) { G.gold -= c; G.rep[cur.n] = 0; openPort(cur); } else { renderPort(); OV.querySelector('.card').insertAdjacentHTML('afterbegin', '<p><b>Not enough gold.</b></p>'); } };
window.fixGuns = () => { const n = Math.min(G.gl, Math.floor(G.gold / 15)); G.gl -= n; G.gold -= n * 15; renderPort(); };
window.newGame = () => init();
const SK = 'pirates-save-v3';
function hasSave() { try { return !!localStorage.getItem(SK); } catch (e) { return false; } }
function saveGame(manual) {
  if (mode !== 'sea' && mode !== 'port') { if (manual) say('You can save while sailing or in port.'); return; }
  let ok = true;
  try { localStorage.setItem(SK, JSON.stringify({ G, P, windA, S: S.map(s => ({ x: s.x, y: s.y, a: s.a, n: s.n, t: s.t, hp: s.hp, maxHp: s.maxHp, crew: s.crew, tr: s.tr ? 1 : 0, gold: s.gold || 0, hold: s.hold || 0, k: s.cap ? CAPS.indexOf(s.cap) : -1, w: PORTS.indexOf(s.w) })), ports: PORTS.map(p => ({ gar: p.gar, wealth: p.wealth, gov: !!p.gov, cap: !!p.cap })) })); } catch (e) { ok = false; }
  if (manual) say(ok ? 'Game saved.' : 'Saving is not available here.');
}
window.loadGame = () => {
  try {
    const d = JSON.parse(localStorage.getItem(SK)); G = d.G; P = d.P; windA = d.windA;
    PORTS.forEach((p, i) => Object.assign(p, d.ports[i] || {}));
    S = d.S.map(s => ({ ...s, roll: 0, cd: 0, cap: s.k >= 0 ? CAPS[s.k] : null, w: PORTS[s.w] || PORTS[0] }));
    recalc(); B = null; OV.hidden = true; mode = 'sea'; K = {}; particles.length = 0; say('Game loaded.');
  } catch (e) { init(); }
};
function menu() { mode = 'menu'; OV.hidden = false; OV.innerHTML = '<div class="card"><h2>Pirates: Caribbean</h2><p>A saved voyage was found.</p><button onclick="loadGame()">Continue</button><button class="alt" onclick="newGame()">New game</button></div>'; }

function loop() {
  updateParticles(); tick++; if (K.m) { K.m = 0; dbg = !dbg; }
  if (G.hull <= 0 && mode === 'sea') gameOver('Your ship went down.');
  if (mode === 'sea') { seaUpdate(); seaDraw(); }
  else if (mode === 'battle') { battleUpdate(); if (B) battleDraw(); }
  else if (mode === 'menu' || mode === 'over') seaDraw();
  if (msgT > 0) { msgT--; if (!msgT) MSG.textContent = ''; }
  const h = mode === 'sea' ? near() : null; ACT.hidden = !h; if (h) ACT.textContent = h.t;
  HUD.innerHTML = `<span>⛵ ${SHIPS[G.ship].name}</span><span>💰 ${G.gold}</span><span>👥 ${G.crew}</span><span>🛠 ${Math.max(0, G.hull | 0)}/${G.maxHull}</span><span>🔫 ${gunsNow()}</span>`;
  requestAnimationFrame(loop);
}

addEventListener('keydown', e => { const k = e.key.toLowerCase(); K[k] = 1; if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault(); });   // stop the page scrolling while playing
addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (k !== 'b' && k !== 'f' && k !== ' ') K[k] = 0; });   // one-shot keys stay latched until the game uses them, so a quick tap is never missed
// On-screen touch buttons (index.html: <button data-k="...">). One-shot keys are cleared by the game when used.
document.querySelectorAll('.touch button').forEach(b => { const k = b.dataset.k; b.onpointerdown = e => { e.preventDefault(); K[k] = 1; }; b.onpointerup = b.onpointerleave = () => { if (k !== ' ' && k !== 'b' && k !== 'f') K[k] = 0; }; });
document.getElementById('saveBtn').onclick = () => saveGame(true);

init(); if (hasSave()) menu(); loop();