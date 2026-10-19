import * as THREE from 'three';
import './legacy-portfolio.css';
import './styles.css';
import { initPortfolio } from './portfolio.js';
import { createWorld } from './world.js';
import { loadRig, Actor, SPECS } from './actors.js';
import { createStory, ANCHORS } from './story.js';
import { AudioEngine } from './audio.js';

initPortfolio();

const qs = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const btn = $('initiateBtn'), intro = $('introScreen'), caption = $('battleCaption'), prog = $('sceneProgress');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- capability / tier detection
function detectTier() {
  if (qs.get('tier')) return qs.get('tier');
  const mobile = matchMedia('(max-width: 820px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  if (mobile || mem <= 2 || cores <= 2) return 'low';
  return mem >= 8 && cores >= 8 ? 'high' : 'mid';
}
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

let manifest = {};
const audio = new AudioEngine({});
let muted = false;

function revealSite() { document.body.classList.remove('booting'); document.body.classList.add('awake'); window.scrollTo(0, 0); }
function fallback(msg) {
  console.warn('3D disabled:', msg);
  document.body.classList.add('no3d'); $('stage').style.display = 'none';
  btn.disabled = false; btn.addEventListener('click', async () => { await audio.init(); audio.ignite(1.2); audio.startMusic(); revealSite(); intro.classList.add('dismissed'); }, { once: true });
  setupSound();
}

function setupSound() {
  const t = $('soundToggle');
  t.addEventListener('click', async () => {
    await audio.init(); muted = !muted; audio.setMuted(muted);
    t.setAttribute('aria-pressed', String(!muted)); $('soundLabel').textContent = muted ? 'SOUND: OFF' : 'SOUND: ON';
  });
}

(async function start() {
  manifest = await fetch('assets/manifest.json').then((r) => r.json()).catch(() => ({}));
  audio.manifest = manifest.audio || {};
  if (!webglOK()) { fallback('WebGL unavailable'); return; }
  try { await boot(); } catch (e) { console.error(e); fallback(String(e)); }
})();

async function boot() {
  const tier = detectTier();
  const world = createWorld($('stage'), tier);
  const { scene, camera, L } = world;
  const rig = await loadRig(manifest.rig?.url || 'assets/models/Soldier.glb');
  const actors = {};
  for (const id of Object.keys(SPECS)) { actors[id] = new Actor(id, rig); scene.add(actors[id].root); }
  const arena = scene.children.filter((o) => !o.isLight && !Object.values(actors).some((a) => a.root === o)); // static environment, hidden during the helmet-only intro
  arena.forEach((o) => (o.visible = false));
  const story = createStory();
  story.bakeBursts();
  setupSound();

  // intro key light (helmet close-up before the world lights come up)
  const introKey = new THREE.SpotLight(0x9fb0e8, 30, 12, 0.5, 0.9, 1.5); introKey.position.set(-3.0, 2.3, 2.4); introKey.target.position.set(-1, 1.7, 0.3); scene.add(introKey, introKey.target);
  const introRim = new THREE.PointLight(0x5a0a0a, 6, 6, 1.5); introRim.position.set(0.6, 2.0, -0.8); scene.add(introRim);

  // Force push shockwave ring
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6a88).multiplyScalar(1.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  ring.rotation.y = Math.PI / 2; scene.add(ring);

  // ---------------------------------------------------------------- sizing
  let W = 0, H = 0, viewShift = 0;
  const maxPR = { high: 2, mid: 1.5, low: 1.15 }[tier] || 1.25;
  let pr = Math.min(devicePixelRatio || 1, maxPR);
  function resize() {
    W = innerWidth; H = innerHeight; world.setSize(W, H, pr);
    viewShift = W > 1000 ? -W * 0.2 : 0; // desktop: stage sits right of the content column
    buildMap();
  }

  // ---------------------------------------------------------------- scroll → story time
  let anchorPts = [];
  function buildMap() {
    const pts = [];
    for (const [id, t] of ANCHORS) { const el = $(id) || document.getElementById(id); if (!el) continue; pts.push([el.getBoundingClientRect().top + scrollY, t]); }
    pts.sort((a, b) => a[0] - b[0]);
    const doc = document.documentElement.scrollHeight - innerHeight;
    pts[0][0] = 0; // top of page ↔ story start
    pts.push([Math.max(pts[pts.length - 1][0] + 1, doc), story.END]);
    anchorPts = pts;
  }
  function scrollToT() {
    const y = scrollY + innerHeight * 0.38, p = anchorPts; if (p.length < 2) return 0;
    if (y <= p[0][0]) return p[0][1];
    for (let i = 1; i < p.length; i++) if (y <= p[i][0]) { const k = (y - p[i - 1][0]) / (p[i][0] - p[i - 1][0]); return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k; }
    return story.END;
  }
  addEventListener('resize', () => { resize(); });
  new ResizeObserver(() => buildMap()).observe(document.querySelector('main'));
  document.fonts?.ready.then(buildMap);
  document.addEventListener('click', () => requestAnimationFrame(buildMap)); // clearance gates change layout

  // ---------------------------------------------------------------- state machine
  let phase = 'ready'; // ready → igniting → reveal → live
  let phaseT = 0, introP = qs.has('ip') ? parseFloat(qs.get('ip')) : 0, reveal = 0; // ?ip=1 → dev preview of the fully ignited intro frame
  let T = 0, targetT = 0, prevT = 0;
  const introCam = { p: [-1, 1.63, 1.55], l: [-1, 1.6, 0.24], f: 30 };
  const debugT = qs.has('t') ? parseFloat(qs.get('t')) : null;
  const IGNITE = 2.5;

  btn.disabled = false; btn.classList.add('ready');
  btn.addEventListener('click', async () => {
    if (phase !== 'ready') return;
    await audio.init();           // user gesture → AudioContext allowed
    audio.ignite(IGNITE);          // immediate ignition sound
    audio.startMusic();            // begin the soundtrack from the user's click
    phase = 'igniting'; phaseT = 0; btn.disabled = true; intro.classList.add('igniting');
  });
  if (qs.has('skip') || debugT !== null) { phase = 'live'; reveal = 1; introP = 1; revealSite(); intro.remove(); }

  // ---------------------------------------------------------------- frame loop
  const clock = new THREE.Clock(); let time = 0, slow = 0, frames = 0, lastFx = {}, humOn = false, lightOn = false;
  const v3 = new THREE.Vector3(), srcA = new THREE.Vector3(), srcB = new THREE.Vector3(), tgt = new THREE.Vector3();
  const sm = (x) => x * x * (3 - 2 * x);

  function cue(ev, S) {
    switch (ev.type) {
      case 'clash': audio.clash(ev.v); break; case 'swing': audio.swing(); break; case 'push': audio.forcePush(); break;
      case 'defeat': audio.defeat(); break; case 'thud': audio.clash(0.3); break; case 'fall': audio.fall(); break;
      case 'boom': audio.reactorBoom(); break; case 'saberOff': case 'saberOn': audio.ignite(0.9); break;
    }
  }

  function frame() {
    requestAnimationFrame(frame);
    const rdt = Math.min(0.5, clock.getDelta()), dt = Math.min(0.05, rdt); time += dt;
    // ---- phases (wall-clock based so the ignition really lasts ~2.5 s even on slow GPUs)
    phaseT += rdt;
    if (phase === 'igniting') {
      introP = sm(Math.min(1, phaseT / IGNITE));
      if (phaseT >= IGNITE) { phase = 'reveal'; phaseT = 0; revealSite(); intro.classList.add('dismissed'); audio.hum(true, 0.1); setTimeout(() => intro.remove(), 1200); }
    } else if (phase === 'reveal') {
      reveal = sm(Math.min(1, phaseT / 2.6)); introP = 1;
      if (phaseT >= 2.6) phase = 'live';
    }
    // ---- story time (scroll-driven, smoothed, bounded speed)
    if (debugT !== null) { T = debugT; } else {
      targetT = scrollToT();
      const diff = targetT - T, k = reduced ? 1 : 1 - Math.exp(-dt * 5.5);
      T += THREE.MathUtils.clamp(diff * k, -26 * dt, 26 * dt);
      if (reduced) T = targetT;
    }
    const Tuse = phase === 'live' || phase === 'reveal' ? T : 0;

    const S = story.sample(Tuse);
    if (phase !== 'live' && phase !== 'reveal') S.vader.saber = introP;      // ignition drives the visible blade length
    for (const id in actors) actors[id].apply({ ...S[id], tIdle: time * 0.8 + id.length }, time);

    // ---- audio cues: forward motion only, never on large jumps (no duplicate/corrupt events on scrub)
    if (phase === 'live' || phase === 'reveal') {
      const dT = Tuse - prevT;
      if (dT > 0 && dT < 3) for (const ev of story.events) if (ev.t > prevT && ev.t <= Tuse) cue(ev, S);
      prevT = Tuse;
    }
    const f = story.fx(Tuse, S);
    if (audio.ready) {
      const want = S.vader.saber > 0.9; if (want !== humOn && phase !== 'igniting') { audio.hum(want, 0.1); humOn = want; }
      if (f.lightning !== lightOn) { audio.lightning(f.lightning); lightOn = f.lightning; }
    }

    // ---- camera
    const cs = story.camera(Tuse, S);
    let cp = cs.p, cl = cs.l, cf = cs.f;
    if (phase !== 'live') { // intro close-up → blend into the story camera
      const r = phase === 'reveal' ? reveal : 0, a = introCam;
      cp = a.p.map((v, i) => v + (cs.p[i] - v) * r); cl = a.l.map((v, i) => v + (cs.l[i] - v) * r); cf = a.f + (cs.f - a.f) * r;
    }
    let shake = reduced ? 0 : f.shake + (phase === 'igniting' ? 0.012 * introP : 0) + (phase === 'reveal' ? 0.006 * (1 - reveal) : 0);
    camera.position.set(cp[0] + Math.sin(time * 61) * shake, cp[1] + Math.sin(time * 53 + 1) * shake, cp[2] + Math.sin(time * 47 + 2) * shake * 0.5);
    camera.lookAt(cl[0], cl[1], cl[2]);
    // slow breathing drift keeps the shot alive between scroll moves
    if (!reduced) camera.position.x += Math.sin(time * 0.25) * 0.05;
    camera.setViewOffset(W, H, viewShift * (phase === 'live' ? 1 : phase === 'reveal' ? reveal : 0), 0, W, H);
    const fovNarrow = W < 820 ? 1.28 * (1 + 0.3 * (phase === 'live' ? 0 : 1 - reveal)) : 1; camera.fov = cf * fovNarrow; camera.updateProjectionMatrix();

    // ---- lighting
    if (phase === 'reveal' || phase === 'live') arena.forEach((o) => { if (!o.visible) o.visible = true; });
    const lvl = (phase === 'ready' || phase === 'igniting') ? 0 : reveal * f.level;
    world.setLevel(lvl);
    scene.environmentIntensity = 0.05 + 0.23 * (phase === 'live' ? 1 : phase === 'reveal' ? reveal : 0);
    introKey.intensity = 30 * (1 - reveal) * (phase === 'ready' ? 0.9 : 1); introRim.intensity = 6 * (1 - reveal) + 3 * introP * (1 - reveal);
    L.key.target.position.set((S.vader.x + S.obiwan.x * 0 + (Tuse > 38 ? S.plagueis.x : S.obiwan.x)) / 2, 1, 0); L.key.position.set(L.key.target.position.x - 3.5, 11, 6.5);
    L.reactor.intensity = f.reactor * 22; world.shaftGlow.material.opacity = 0.35 + 0.2 * Math.min(2, f.reactor);
    // clash flash light
    let fl = 0, fp = null; for (const b of story.bursts) { const age = Tuse - b.t; if (age >= 0 && age < 0.6) { const v = Math.exp(-age * 10) * (b.big ? 1.3 : 1); if (v > fl) { fl = v; fp = b.o; } } }
    if (fp) L.flash.position.set(fp.x, fp.y + 0.1, fp.z + 0.6); L.flash.intensity = fl * 22;
    world.updateSparks(Tuse, story.bursts);

    // Force lightning: from Palpatine's raised hand to Vader's chest
    if (f.lightning) {
      actors.palpatine.b.RightHand.getWorldPosition(srcA); srcB.copy(srcA).add(v3.set(0.04, 0.02, 0.03));
      actors.vader.b.Spine2.getWorldPosition(tgt); tgt.y += 0.05;
      const ramp = Math.min(1, (Tuse - 70.1) / 0.8) * Math.min(1, (83.4 - Tuse) / 0.4);
      world.updateLightning(true, [srcA, srcB, srcA], tgt, time, ramp);
    } else world.updateLightning(false, [], tgt, time);

    // Force push ring (Plagueis → Vader)
    if (f.push >= 0) { const a = f.push; ring.visible = true; ring.position.set(S.plagueis.x - 0.5 - a * 5, 1.25, S.plagueis.z); ring.scale.setScalar(0.4 + a * 3.2); ring.material.opacity = 0.9 * (1 - a); } else ring.visible = false;

    if (!reduced) world.tickDust(time);
    world.composer.render();

    // ---- HUD
    if (phase === 'live' || phase === 'reveal') {
      const c = story.chapterAt(Tuse); if (caption.dataset.c !== c) { caption.dataset.c = c; caption.textContent = c + (c.startsWith('Prologue') || c.startsWith('Epilogue') ? '' : '  ·  stand-in rig'); }
      prog.style.transform = `scaleX(${(Tuse / story.END).toFixed(4)})`;
    }
    // ---- adaptive quality: drop pixel ratio if frames are consistently slow
    frames++; if (dt > 0.034) slow++; if (frames === 90) { if (slow > 55 && pr > 0.8) { pr = Math.max(0.8, pr * 0.8); resize(); } frames = 0; slow = 0; }
    window.__vp = { T: Tuse, targetT, phase, tier, pr, actors, story, audio, muted };
  }

  resize(); frame();
  if (document.hidden) clock.stop();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) clock.start(); });
}
