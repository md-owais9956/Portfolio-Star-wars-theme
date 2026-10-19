import * as THREE from 'three';
import { SHAFT } from './world.js';

/**
 * The whole battle is ONE deterministic function of story-time T (seconds).
 *   sample(T)  → every actor's pose, saber power, IK targets, camera, fx
 * Scroll position only chooses T. Nothing is event-driven, so scrolling up, down, jumping, or
 * resizing can never duplicate or corrupt an animation. Audio is the only edge-triggered part
 * (see main.js) and it only fires on forward motion.
 *
 * Frame convention for hand presets: +z forward, +y up, +rx toward the character's RIGHT (saber hand).
 */
export const STORY_END = 104;
export const ANCHORS = [['home', 0], ['mind', 9], ['work', 17], ['skills', 31], ['game', 42], ['philosophy', 55], ['humor', 65], ['dark-thoughts', 76], ['contact', 92]];

export const CHAPTERS = [ // caption text — honest about stand-in rigs
  [0, 'Prologue · Vader awaits'],
  [9, 'Vader senses a presence'],
  [17, 'Encounter I · Obi-Wan Kenobi'],
  [31.5, 'Obi-Wan falls'],
  [40, 'Encounter II · Darth Plagueis'],
  [53, 'Plagueis falls'],
  [60, 'Encounter III · Emperor Palpatine'],
  [84, 'Vader turns on his master'],
  [90.6, 'The reactor shaft'],
  [96, 'Epilogue'],
];

const HANDS = { // [rx,y,z], blade dir [rx,y,z]   (rig arm reach ≈ 0.47 m from the shoulder at y≈1.38)
  intro: [[0.36, 1.3, 0.14], [0.14, 1, -0.04]],
  rest: [[0.26, 1.06, 0.26], [0.05, -0.3, 1]],
  guard: [[0.25, 1.22, 0.36], [-0.15, 0.8, 0.6]],
  windup: [[0.4, 1.6, 0.0], [0.35, 0.9, -0.35]],
  chop: [[0.14, 1.38, 0.44], [-0.1, 0.55, 0.85]],
  sweep: [[0.3, 1.14, 0.4], [-0.75, -0.1, 0.65]],
  thrust: [[0.15, 1.32, 0.5], [0, 0.08, 1]],
  overhead: [[0.15, 1.74, 0.2], [0.05, 1, 0.28]],
  low: [[0.2, 1.1, 0.38], [-0.5, 0.45, 0.75]],
  knocked: [[0.45, 1.7, 0.0], [0.9, 0.5, -0.4]],
  push: [[0.1, 1.45, 0.46], [0, 0.9, 0.45]],
  shield: [[0.12, 1.45, 0.4], [0, 0.6, 0.8]],
  reach: [[0.08, 1.62, 0.42], [0, 0.2, 1]],
  throw: [[0.08, 1.55, 0.48], [0, 0.4, 1]],
};

const ease = (t) => t * t * (3 - 2 * t);
const S0 = { x: 0, z: 0, yaw: 0, hand: 'rest', ikw: 0, saber: 0, lean: 0, look: 0, hp: 0, kneel: 0, pitch: 0, roll: 0, y: 0, clash: 0, ang: 0.55, cy: 1.38, defeat: 0, flail: 0, carry: 0 };

function track(init) {
  const keys = []; let cur = { ...S0, ...init, t: 0 }; keys.push({ ...cur });
  const api = { keys, at(t, p = {}) { cur = { ...cur, ...p, t, lin: !!p.lin }; keys.push({ ...cur }); return api; } };
  return api;
}
function sampleTrack(keys, t) {
  if (t <= keys[0].t) return { ...keys[0], handA: keys[0].hand, handB: keys[0].hand, hk: 0 };
  const last = keys[keys.length - 1]; if (t >= last.t) return { ...last, handA: last.hand, handB: last.hand, hk: 0 };
  let lo = 0, hi = keys.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (keys[m].t <= t) lo = m; else hi = m; }
  const a = keys[lo], b = keys[hi]; let k = (t - a.t) / Math.max(1e-6, b.t - a.t); if (!b.lin) k = ease(k);
  const o = {};
  for (const f in S0) o[f] = typeof S0[f] === 'number' ? a[f] + (b[f] - a[f]) * k : null;
  o.handA = a.hand; o.handB = b.hand; o.hk = k; return o;
}
const yawL = (rx, y, z, yaw) => new THREE.Vector3(-rx * Math.cos(yaw) + z * Math.sin(yaw), y, rx * Math.sin(yaw) + z * Math.cos(yaw));
function handLocal(s) {
  const A = HANDS[s.handA || 'rest'], B = HANDS[s.handB || 'rest'], k = s.hk ?? 0;
  const p = A[0].map((v, i) => v + (B[0][i] - v) * k), d = A[1].map((v, i) => v + (B[1][i] - v) * k);
  return { p, d };
}

export function createStory() {
  // ------------------------------------------------------------------ actor tracks
  const D = Math.PI / 2;
  const vader = track({ x: -1.0, z: 0.3, yaw: 0, hand: 'intro', ikw: 1, saber: 1 });
  vader.at(4.6).at(6.4, { yaw: -D, hand: 'rest', look: 0.0 }).at(9, { look: 0.25 }).at(10.5, { look: 0 })
    .at(18, { hand: 'rest' }).at(19.5, { x: -1.0, z: 0.25, hand: 'guard', lin: true }).at(21, { x: -1.35, z: 0, hand: 'guard' })
    // ---- duel 1 (Vader x≈-1.18 facing -x; Obi x≈-2.42 facing +x)
    .at(22.35, { hand: 'windup' }).at(23.05, { hand: 'chop' }).at(23.3, { clash: 1, ang: 0.5 }).at(23.9, { ang: 0.8 }).at(24.35, { ang: 0.45 })
    .at(24.7, { clash: 0, hand: 'guard' })
    .at(25.2, { hand: 'guard', clash: 1, ang: 0.4, cy: 1.4 }).at(25.9, { ang: 0.55 }).at(26.35, { clash: 0, hand: 'guard' })
    .at(26.7, { hand: 'sweep', x: -1.45 }).at(27.1, { clash: 1, ang: 0.3, cy: 1.0 }).at(27.55, { clash: 0, hand: 'guard' })
    .at(27.9, { hand: 'thrust', x: -1.25 }).at(28.35, { hand: 'thrust', x: -1.0 })
    .at(28.85, { hand: 'windup', x: -1.35, z: 0 }).at(29.4, { hand: 'chop' }).at(29.62, { clash: 1, ang: 0.5, cy: 1.38 })
    .at(30.2, { ang: 0.75 }).at(30.8, { ang: 1.0 }).at(31.2, { clash: 0, hand: 'overhead' })
    .at(31.55, { hand: 'chop', lean: 0.15 }).at(32.3, { hand: 'guard', lean: 0 })
    .at(35, { hand: 'rest' })
    // ---- turn and stride toward Plagueis
    .at(37.2, { yaw: -D, look: 0 }).at(39.2, { yaw: D, x: -1.35, lin: false }).at(41.8, { x: 0.0, z: 0, hand: 'rest', lin: true })
    .at(44.6, { hand: 'guard' })
    // ---- duel 2: Plagueis (x≈1.02 facing -x) — Force push, clashes, defeat
    .at(47.3, { hand: 'guard', lean: 0 }).at(47.8, { x: -0.8, lean: -0.3, hand: 'low' }).at(49.2, { x: -0.02, lean: 0.12, hand: 'guard', lin: true })
    .at(49.8, { hand: 'windup', lean: 0 }).at(50.25, { hand: 'chop' }).at(50.45, { clash: 1, ang: 0.5 }).at(51.0, { ang: 0.85 }).at(51.4, { clash: 0, hand: 'guard' })
    .at(52.0, { hand: 'guard', clash: 1, ang: 0.45 }).at(52.7, { ang: 0.7 }).at(53.0, { clash: 0, hand: 'overhead' })
    .at(53.35, { hand: 'chop', lean: 0.15 }).at(54.2, { hand: 'guard', lean: 0 }).at(57, { hand: 'rest' })
    // ---- saber off, face the Emperor, struggle through Force lightning
    .at(59.5, { saber: 1 }).at(60.6, { saber: 0, hand: 'rest' }).at(63, { yaw: D, x: 0.0, z: 0.3 })
    .at(69.6, { yaw: D, hand: 'rest' }).at(70.4, { lean: -0.2, x: -0.25, hand: 'shield', ikw: 1 })
    .at(72, { lean: 0.12, x: 0.0, lin: true }).at(83.2, { lean: 0.28, x: 2.9, z: 0.4, lin: true, hand: 'shield' })
    // ---- the turn: seize Palpatine, carry him to the shaft edge, throw
    .at(84.2, { x: 2.9, hand: 'reach', lean: 0.1 }).at(85.2, { hand: 'reach', lean: 0 })
    .at(86, { yaw: 2.24, hand: 'reach' }).at(89.6, { x: 3.86, z: -0.55, yaw: 2.24, lin: true })
    .at(90.1, { hand: 'throw' }).at(90.6, { hand: 'throw' })
    .at(92.5, { hand: 'rest', lean: 0.05 }).at(95.8, { saber: 0 }).at(96.8, { saber: 1, hand: 'guard' }).at(99, { hand: 'rest', yaw: 2.24 });

  const obi = track({ x: -9, z: 0.2, yaw: D, hand: 'rest', ikw: 0, saber: 0 });
  obi.at(11).at(18.2, { x: -2.9, z: 0.1, lin: true }).at(16.6, {}).at(19.4, { saber: 1, ikw: 1, hand: 'guard' })
    .at(21, { x: -2.25, z: 0, lin: true })
    .at(22.35, { hand: 'guard' }).at(23.1, { clash: 0 }).at(23.3, { clash: 1, ang: 0.5 }).at(23.9, { ang: 0.8 }).at(24.35, { ang: 0.45 })
    .at(24.7, { clash: 0, hand: 'guard' }).at(24.95, { hand: 'windup' }).at(25.1, { hand: 'chop' }).at(25.2, { clash: 1, ang: 0.4, cy: 1.4 })
    .at(25.9, { ang: 0.55, x: -2.25 }).at(26.35, { clash: 0, hand: 'guard', x: -2.45, lean: -0.1 })
    .at(26.7, { hand: 'low' }).at(27.1, { clash: 1, ang: 0.3, cy: 1.0 }).at(27.55, { clash: 0, hand: 'guard', lean: 0 })
    .at(27.75, { z: 0.15, lean: -0.1 }).at(28.35, { z: 0.65, lean: -0.3, hand: 'guard', yaw: 1.2 }).at(29.0, { z: 0.1, yaw: D, lean: 0, x: -2.25 })
    .at(29.4, { hand: 'chop' }).at(29.62, { clash: 1, ang: 0.5, cy: 1.38 }).at(30.2, { ang: 0.75, lean: -0.08 }).at(30.8, { ang: 1.0, lean: -0.2, x: -2.6 })
    .at(31.2, { clash: 0, hand: 'knocked', lean: -0.3 }).at(31.7, { x: -2.9, lean: -0.5, saber: 1 }).at(32.2, { saber: 0, ikw: 0.4 })
    .at(32.8, { kneel: 1, x: -3.1, lean: -0.3, ikw: 0, defeat: 0.3 }).at(34.2, { kneel: 1, pitch: 0, defeat: 0.5 })
    .at(35.4, { kneel: 0.2, pitch: -1.46, y: 0.1, x: -3.5, lean: 0, defeat: 1, z: 0.35 });

  const plag = track({ x: 10, z: -3.2, yaw: -D, hand: 'rest', ikw: 0, saber: 0 });
  plag.at(38.2).at(46.2, { x: 0.9, z: 0, lin: true, yaw: -D }).at(44.4, {}).at(46.4, { saber: 1, ikw: 1, hand: 'guard' })
    .at(47.0, { hand: 'guard' }).at(47.35, { hand: 'push' }).at(48.1, { hand: 'push' }).at(48.6, { hand: 'guard' })
    .at(49.8, { hand: 'guard' }).at(50.2, { clash: 0 }).at(50.45, { clash: 1, ang: 0.5 }).at(51.0, { ang: 0.85 }).at(51.4, { clash: 0, hand: 'guard' })
    .at(51.7, { hand: 'windup' }).at(51.95, { hand: 'chop' }).at(52.0, { clash: 1, ang: 0.45 }).at(52.7, { ang: 0.7, x: 1.05 }).at(53.0, { clash: 0, hand: 'knocked', lean: -0.3 })
    .at(53.6, { saber: 1, lean: -0.5, x: 1.3 }).at(54.1, { saber: 0, ikw: 0.4 }).at(54.7, { kneel: 1, x: 1.55, ikw: 0, defeat: 0.3, lean: -0.3 }).at(56, { kneel: 1, defeat: 0.5 })
    .at(57.4, { kneel: 0.2, pitch: -1.46, y: 0.1, x: 2.2, z: -0.5, lean: 0, defeat: 1 });

  const palp = track({ x: 9, z: 0.4, yaw: -D, hand: 'rest', ikw: 0, saber: 0, lean: 0.38 });
  palp.at(60.6).at(66.5, { x: 3.4, z: 0.4, lin: true }).at(69.6, {}).at(70.1, { hand: 'push', ikw: 1 }).at(83.4, { hand: 'push' }).at(84.0, { ikw: 0.2, hand: 'rest' })
    .at(84.4, { carry: 0 }).at(85.6, { carry: 1, ikw: 0, lean: 0.1 }).at(90.6, { carry: 1 });

  // ------------------------------------------------------------------ release + fall of Palpatine
  const RELEASE = 90.6, FALL_END = 94.4, DEPTH = 57;

  // ------------------------------------------------------------------ cumulative distance tables (foot-sync, reversible)
  const STEP = 1 / 30, N = Math.ceil(STORY_END / STEP) + 1;
  const cum = {};
  for (const id of ['vader', 'obiwan', 'plagueis', 'palpatine']) {
    const trk = { vader, obiwan: obi, plagueis: plag, palpatine: palp }[id]; const arr = new Float32Array(N); let acc = 0, prev = sampleTrack(trk.keys, 0);
    for (let i = 1; i < N; i++) {
      const s = sampleTrack(trk.keys, i * STEP), dx = s.x - prev.x, dz = s.z - prev.z, dist = Math.hypot(dx, dz);
      const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), along = dx * fx + dz * fz;
      acc += Math.abs(along) > 0.35 * dist ? along : dist * 0.7; // lateral moves still step the feet
      arr[i] = acc; prev = s;
    }
    cum[id] = arr;
  }
  const cumAt = (id, t) => { const f = Math.max(0, Math.min(N - 1.001, t / STEP)), i = Math.floor(f); return cum[id][i] + (cum[id][i + 1] - cum[id][i]) * (f - i); };
  const trackOf = { vader, obiwan: obi, plagueis: plag, palpatine: palp };

  const _v = new THREE.Vector3();
  function baseState(id, t) { return sampleTrack(trackOf[id].keys, t); }

  function finalizeActor(id, t, s) {
    // velocity-driven locomotion weights (walk / run) – feet follow travelled distance
    const e = 0.06, a = baseState(id, t - e), b = baseState(id, t + e);
    const sp = Math.hypot(b.x - a.x, b.z - a.z) / (2 * e);
    const walkW = THREE.MathUtils.smoothstep(sp, 0.05, 0.55), runW = THREE.MathUtils.smoothstep(sp, 2.3, 3.2);
    s.w = { idle: 1 - walkW, walk: walkW * (1 - runW), run: runW };
    const dist = cumAt(id, t);
    s.walkPhase = (dist / 1.4) * 1.03;      // Soldier walk: ≈1.4 m per 1.03 s cycle
    s.speed = Math.min(1, sp / 2);
    return s;
  }

  /** full sample: all actor states + IK targets (clash-aware) */
  function sample(t) {
    const S = {};
    for (const id of ['vader', 'obiwan', 'plagueis', 'palpatine']) { S[id] = baseState(id, t); }

    // --- Palpatine: carried by Vader, then falling down the reactor shaft
    const P = S.palpatine, Vd = S.vader;
    if (P.carry > 0) {
      const f = new THREE.Vector3(Math.sin(Vd.yaw), 0, Math.cos(Vd.yaw));
      const cx = Vd.x + f.x * 0.5, cz = Vd.z + f.z * 0.5, cy = 0.32 + Math.sin(t * 2.4) * 0.03;
      const k = P.carry;
      P.x += (cx - P.x) * k; P.z += (cz - P.z) * k; P.y += (cy - P.y) * k;
      P.yaw += (Vd.yaw + Math.PI - P.yaw) * k; P.pitch = -0.14 * k;
      P.roll = Math.sin(t * 5.3) * 0.06 * k;
    }
    if (t >= RELEASE) {
      const tau = t - RELEASE, vb = baseState('vader', RELEASE), f = new THREE.Vector3(Math.sin(vb.yaw), 0, Math.cos(vb.yaw));
      const x0 = vb.x + f.x * 0.5, z0 = vb.z + f.z * 0.5, y0 = 0.32;
      const drift = ease(Math.min(1, tau / 1.1));
      P.x = x0 + (SHAFT.x - 0.25 - x0) * drift; P.z = z0 + (SHAFT.z + 0.1 - z0) * drift;
      P.y = Math.max(-DEPTH, y0 + 0.9 * tau - 4.9 * tau * tau * 0.82);
      P.pitch = -0.14 - tau * 2.6; P.roll = tau * 1.5; P.yaw = 0; P.carry = 0; P.lean = 0.3;
    }
    for (const id of ['vader', 'obiwan', 'plagueis', 'palpatine']) {
      const s = S[id]; finalizeActor(id, t, s);
      if (id === 'palpatine' && (P.carry > 0 || t >= RELEASE)) { s.w = { idle: 1, walk: 0, run: 0 }; s.walkPhase = 0; }
    }

    // --- hand targets: preset blended with the world-space clash solution
    const pairs = [['vader', 'obiwan', 1], ['vader', 'plagueis', 1]];
    for (const id of Object.keys(S)) {
      const s = S[id], hl = handLocal(s);
      const p = yawL(hl.p[0], hl.p[1], hl.p[2], s.yaw).add(_v.set(s.x, s.y || 0, s.z)), d = yawL(hl.d[0], hl.d[1], hl.d[2], s.yaw).normalize();
      s.ik = { w: s.ikw, p, d };
    }
    for (const [a, b] of pairs) {
      const A = S[a], B = S[b], c = Math.min(A.clash, B.clash); if (c <= 0.001) continue;
      const h = new THREE.Vector3(B.x - A.x, 0, B.z - A.z).normalize(), ang = (A.ang + B.ang) / 2, cy = (A.cy + B.cy) / 2;
      const C = new THREE.Vector3((A.x + B.x) / 2, cy, (A.z + B.z) / 2);
      const wob = Math.sin(t * 38) * 0.012 * c;
      const dA = h.clone().multiplyScalar(Math.sin(ang)).add(new THREE.Vector3(0, Math.cos(ang), 0)).normalize();
      const dB = h.clone().multiplyScalar(-Math.sin(ang)).add(new THREE.Vector3(0, Math.cos(ang), 0)).normalize();
      for (const [S_, dir] of [[A, dA], [B, dB]]) {
        S_.ik.p.lerp(C.clone().addScaledVector(dir, -0.4).add(new THREE.Vector3(0, wob, 0)), c);
        S_.ik.d.lerp(dir, c).normalize(); S_.ik.w = Math.max(S_.ik.w, c);
      }
    }
    // body-language extras: head track on opponent, stagger jitter under lightning
    S.vader.look = (S.vader.look || 0);
    if (t > 70 && t < 83.4) { const j = Math.sin(t * 31) * 0.03 + Math.sin(t * 17) * 0.02; S.vader.yaw += j; S.vader.lean += Math.sin(t * 23) * 0.025; }
    return S;
  }

  // ------------------------------------------------------------------ clash bursts (positions come from the same sample())
  const bursts = [];
  const clashTimes = [[23.3, 0], [23.9, 0], [25.2, 0], [27.1, 0], [29.62, 1], [30.2, 0], [30.8, 1], [31.3, 1], [50.45, 0], [51.0, 0], [52.0, 0], [52.8, 1], [53.35, 1]];
  const pairOf = (t) => (t < 40 ? 'obiwan' : 'plagueis');
  function bakeBursts() {
    bursts.length = 0;
    for (const [t, big] of clashTimes) {
      const S = sample(t + 0.02), o = S[pairOf(t)], v = S.vader;
      bursts.push({ t, big: !!big, o: new THREE.Vector3((o.x + v.x) / 2, 1.38, (o.z + v.z) / 2) });
    }
    // reactor flare when Palpatine hits the bottom + embers
    bursts.push({ t: FALL_END, big: true, o: new THREE.Vector3(SHAFT.x - 0.2, -DEPTH + 1, SHAFT.z), huge: true });
    bursts.push({ t: FALL_END + 0.3, big: true, o: new THREE.Vector3(SHAFT.x, -DEPTH + 2, SHAFT.z) });
  }

  // ------------------------------------------------------------------ audio / light events (edge-triggered forward only)
  const events = [
    ...clashTimes.map(([t, big]) => ({ t, type: 'clash', v: big ? 1 : 0.8 })),
    ...[22.9, 24.8, 26.55, 27.8, 29.2, 31.35, 49.65, 51.5, 51.7, 53.2].map((t) => ({ t, type: 'swing' })),
    { t: 47.35, type: 'push' }, { t: 32.2, type: 'defeat' }, { t: 54.1, type: 'defeat' }, { t: 35.2, type: 'thud' }, { t: 57.2, type: 'thud' },
    { t: RELEASE, type: 'fall' }, { t: FALL_END, type: 'boom' }, { t: 60.5, type: 'saberOff' }, { t: 96.8, type: 'saberOn' },
  ].sort((a, b) => a.t - b.t);
  const lightningWindow = [70.1, 83.4];

  // ------------------------------------------------------------------ camera shots
  const shots = [
    { t: 0, p: [-0.6, 1.5, 5.0], l: [-1.0, 1.28, 0.2], f: 38 },
    { t: 5.0, p: [-0.6, 1.5, 4.8], l: [-1.0, 1.28, 0.2], f: 38 },
    { t: 9.5, p: [-0.5, 1.6, 6.2], l: [-1.4, 1.2, 0], f: 38 },
    { t: 19, p: [-0.8, 1.9, 8.2], l: [-1.6, 1.25, 0], f: 38 },
    { t: 21.5, p: [-1.6, 1.5, 4.7], l: [-1.8, 1.3, 0], f: 38 },
    { t: 23.0, p: [-1.4, 1.5, 4.5], l: [-1.8, 1.35, 0], f: 36 },
    { t: 23.28, p: [-1.8, 1.55, 2.5], l: [-1.8, 1.42, 0], f: 36, cut: true },
    { t: 24.5, p: [-1.8, 1.55, 2.7], l: [-1.8, 1.42, 0], f: 36 },
    { t: 24.7, p: [-1.0, 1.45, 4.6], l: [-1.8, 1.35, 0], f: 36, cut: true },
    { t: 29.3, p: [-2.4, 1.3, 3.9], l: [-1.8, 1.35, 0], f: 36 },
    { t: 29.6, p: [-1.3, 0.65, 3.1], l: [-1.8, 1.45, 0], f: 36, cut: true },
    { t: 31.0, p: [-1.2, 0.7, 3.4], l: [-1.8, 1.45, 0], f: 36 },
    { t: 31.3, p: [-0.6, 1.7, 5.4], l: [-2.2, 1.0, 0], f: 36, cut: true },
    { t: 36.0, p: [-2.6, 2.4, 5.8], l: [-3.0, 0.5, 0.2], f: 38 },
    { t: 38.5, p: [1.2, 2.0, 8.4], l: [0.4, 1.2, 0], f: 38, cut: true },
    { t: 46.0, p: [0.9, 1.7, 7.4], l: [0.4, 1.3, 0], f: 38 },
    { t: 47.0, p: [0.5, 1.5, 4.6], l: [0.4, 1.35, 0], f: 36, cut: true },
    { t: 50.4, p: [0.4, 1.6, 3.0], l: [0.4, 1.4, 0], f: 36 },
    { t: 50.42, p: [0.4, 1.55, 2.4], l: [0.4, 1.4, 0], f: 34, cut: true },
    { t: 51.5, p: [0.4, 1.55, 2.6], l: [0.4, 1.4, 0], f: 34 },
    { t: 51.7, p: [-0.4, 1.3, 4.8], l: [0.4, 1.35, 0], f: 36, cut: true },
    { t: 53.2, p: [0.0, 0.8, 3.6], l: [0.6, 1.4, 0], f: 36 },
    { t: 53.4, p: [1.0, 2.4, 5.6], l: [1.7, 0.6, -0.2], f: 38, cut: true },
    { t: 58.0, p: [1.6, 2.6, 6.2], l: [1.4, 0.8, 0], f: 38 },
    { t: 60.4, p: [1.8, 2.2, 8.8], l: [1.6, 1.3, 0.3], f: 38, cut: true },
    { t: 69.6, p: [1.7, 2.0, 8.2], l: [1.7, 1.3, 0.3], f: 38 },
    { t: 70.0, p: [0.5, 1.15, 4.7], l: [1.4, 1.45, 0.4], f: 34, cut: true },
    { t: 77.6, p: [1.3, 1.35, 3.7], l: [1.5, 1.5, 0.4], f: 34 },
    { t: 77.8, p: [-1.0, 1.75, 2.5], l: [3.0, 1.5, 0.4], f: 40, cut: true },
    { t: 83.4, p: [-0.4, 1.7, 3.0], l: [2.6, 1.5, 0.4], f: 40 },
    { t: 84.0, p: [2.5, 1.5, 4.3], l: [3.0, 1.45, 0.2], f: 34, cut: true },
    { t: 88.0, p: [1.5, 1.5, 3.7], l: [3.4, 1.4, -0.3], f: 34 },
    { t: 90.0, p: [2.4, 1.6, 3.0], l: [4.0, 1.35, -0.7], f: 36 },
  ];
  const fallEnd = FALL_END + 1.0;
  const endShots = [
    { t: fallEnd, p: [2.3, 1.2, 3.4], l: [3.9, 1.1, -0.5], f: 38 },
    { t: 100, p: [2.4, 1.35, 3.8], l: [3.9, 1.2, -0.6], f: 38 },
    { t: 104, p: [1.2, 1.7, 7.0], l: [3.2, 1.2, -0.8], f: 40 },
  ];
  const allShots = [...shots, ...endShots];
  const lerpA = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

  function camera(t, S) {
    // fall cinematic: camera drops down the shaft following Palpatine
    if (t >= RELEASE && t < fallEnd) {
      const P = S.palpatine, tau = t - RELEASE;
      const top = Math.min(1, tau / 0.9);
      const camY = Math.max(-DEPTH + 6, P.y + 4.5 + (1 - ease(Math.min(1, tau / 1.6))) * 1.5);
      const p = [SHAFT.x + 0.95 - (1 - top) * 1.2, camY + (1 - top) * 0.6, SHAFT.z + 0.75 + (1 - top) * 2.4];
      const l = [P.x, P.y, P.z];
      const startP = [2.4, 1.6, 3.0], startL = [4.0, 1.35, -0.7];
      const k = ease(Math.min(1, tau / 0.8));
      return { p: lerpA(startP, p, k), l: lerpA(startL, l, k), f: 36 + 12 * k };
    }
    let i = 0; for (let j = 0; j < allShots.length; j++) if (allShots[j].t <= t) i = j;
    const a = allShots[i], b = allShots[Math.min(allShots.length - 1, i + 1)];
    if (a === b || b.cut) return { p: a.p.slice(), l: a.l.slice(), f: a.f };
    const k = ease(Math.max(0, Math.min(1, (t - a.t) / Math.max(1e-6, b.t - a.t))));
    return { p: lerpA(a.p, b.p, k), l: lerpA(a.l, b.l, k), f: a.f + (b.f - a.f) * k };
  }

  // lighting / fx values as pure functions of t
  function fx(t, S) {
    const lightning = t >= lightningWindow[0] && t <= lightningWindow[1];
    let flash = 0, shake = 0;
    for (const b of bursts) { const age = t - b.t; if (age >= 0 && age < 1.6) { flash = Math.max(flash, Math.exp(-age * 9) * (b.huge ? 3 : b.big ? 1.4 : 1)); shake = Math.max(shake, Math.exp(-age * 5) * (b.huge ? 0.16 : b.big ? 0.05 : 0.03)); } }
    const fallK = t < RELEASE ? 0 : Math.min(1, (t - RELEASE) / (FALL_END - RELEASE));
    const reactor = t < RELEASE ? 0.3 : 0.3 + 3.2 * fallK * fallK + (t >= FALL_END ? 2.4 * Math.exp(-(t - FALL_END) * 0.6) + 1.2 : 0);
    if (lightning) shake = Math.max(shake, 0.012 + 0.006 * Math.sin(t * 40));
    // Force push shockwave (47.35–48.35)
    const pushAge = t - 47.35, push = pushAge >= 0 && pushAge < 1.0 ? pushAge : -1;
    // obscure Plagueis' approach: world dimmer while he walks in from the shadows
    const level = t < 38 ? 1 : t < 46 ? 1 - 0.45 * Math.sin(Math.min(1, (t - 38) / 4) * Math.PI / 2) : t < 49 ? 0.55 + 0.45 * ((t - 46) / 3) : 1;
    return { lightning, flash, shake, reactor, push, level, fallK };
  }

  function chapterAt(t) { let c = CHAPTERS[0][1]; for (const [ct, name] of CHAPTERS) if (t >= ct) c = name; return c; }

  return { sample, camera, fx, events, bursts, bakeBursts, chapterAt, RELEASE, FALL_END, END: STORY_END };
}
