import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const SHAFT = { x: 5.2, z: -1.6, r: 1.55 };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
function panelTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#1b1c20'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${(Math.random() * 40) | 0},${(Math.random() * 40) | 0},${(Math.random() * 46) | 0},0.35)`; g.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 14, 2 + Math.random() * 3); }
  g.strokeStyle = '#08080a'; g.lineWidth = 4;
  for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  g.strokeStyle = 'rgba(255,60,40,0.18)'; g.lineWidth = 2; g.strokeRect(10, 10, 492, 492);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createWorld(canvas, tier) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== 'low', powerPreference: 'high-performance', alpha: false });
  renderer.setClearColor(0x020203);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = tier !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050509, 0.038);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.28;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 140);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), tier === 'low' ? 0.4 : 0.6, 0.55, 0.85);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  // ------------------------------------------------ lights (base intensities kept for global dimming)
  const L = {};
  L.hemi = new THREE.HemisphereLight(0x27304a, 0x0a0505, 0.55);
  L.key = new THREE.SpotLight(0xc5d4ff, 140, 45, 0.55, 0.7, 1.2); L.key.position.set(-3.5, 11, 6.5); L.key.target.position.set(0, 1, 0);
  L.key.castShadow = tier !== 'low'; L.key.shadow.mapSize.set(tier === 'high' ? 2048 : 1024, tier === 'high' ? 2048 : 1024); L.key.shadow.bias = -0.0004; L.key.shadow.radius = 4;
  L.red = new THREE.PointLight(0xff1e18, 38, 24, 1.5); L.red.position.set(-7, 3.5, -6);
  L.blue = new THREE.PointLight(0x2f64ff, 38, 24, 1.5); L.blue.position.set(8, 3.5, -5);
  L.reactor = new THREE.PointLight(0xff8a2a, 0, 30, 1.3); L.reactor.position.set(SHAFT.x, -1.2, SHAFT.z);
  L.flash = new THREE.PointLight(0xffffff, 0, 14, 1.8);
  L.lightning = new THREE.PointLight(0x9bc7ff, 0, 18, 1.4);
  scene.add(L.hemi, L.key, L.key.target, L.red, L.blue, L.reactor, L.flash, L.lightning);
  const base = { hemi: L.hemi.intensity, key: L.key.intensity, red: L.red.intensity, blue: L.blue.intensity };

  // ------------------------------------------------ platform with open reactor shaft
  const shape = new THREE.Shape(); shape.absarc(0, 0, 15, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(SHAFT.x, -SHAFT.z, SHAFT.r, 0, Math.PI * 2, true); shape.holes.push(hole);
  const floorGeo = new THREE.ShapeGeometry(shape, 64);
  const tex = panelTexture();
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.75, envMapIntensity: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // UVs from ShapeGeometry are in metres → tile naturally; make texture repeat fit
  tex.repeat.set(1 / 4, 1 / 4);

  const shaftGroup = new THREE.Group(); shaftGroup.position.set(SHAFT.x, 0, SHAFT.z); scene.add(shaftGroup);
  const wallTex = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#07070a'); gr.addColorStop(0.55, '#2a1308'); gr.addColorStop(1, '#ff9a3c'); g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const shaftWall = new THREE.Mesh(new THREE.CylinderGeometry(SHAFT.r, SHAFT.r * 1.05, 60, 32, 1, true), new THREE.MeshBasicMaterial({ map: wallTex, side: THREE.BackSide, fog: false }));
  shaftWall.position.y = -30; shaftGroup.add(shaftWall);
  const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff9a3c).multiplyScalar(1.6), toneMapped: false });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(SHAFT.r + 0.07, 0.07, 8, 48), rimMat); rim.rotation.x = Math.PI / 2; rim.position.y = 0.04; shaftGroup.add(rim);
  for (let i = 1; i < 6; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(SHAFT.r * 0.98, 0.05, 6, 32), rimMat); r.rotation.x = Math.PI / 2; r.position.y = -i * 4.2; shaftGroup.add(r); }
  const shaftGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,160,70,1)', 'rgba(255,90,10,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, fog: false }));
  shaftGlow.scale.set(7, 7, 1); shaftGlow.position.y = -1.2; shaftGroup.add(shaftGlow);
  for (let i = 0; i < 8; i++) { // safety rail posts around the hole
    const a = (i / 8) * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - 2.47), Math.cos(a - 2.47))) < 1.05) continue; // open gap where Vader stands
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), new THREE.MeshStandardMaterial({ color: 0x222226, metalness: 0.8, roughness: 0.4 }));
    p.position.set(Math.cos(a) * (SHAFT.r + 0.45), 0.35, Math.sin(a) * (SHAFT.r + 0.45)); p.castShadow = true; shaftGroup.add(p);
  }

  // ------------------------------------------------ chamber architecture (instanced)
  const colMat = new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.8, roughness: 0.5 });
  const cols = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 16, 1.4), colMat, 26);
  const strips = []; const stripMatR = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a1a).multiplyScalar(1.4), toneMapped: false });
  const stripMatB = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2f6bff).multiplyScalar(1.4), toneMapped: false });
  const stripGeo = new THREE.BoxGeometry(0.1, 14, 0.1); const m4 = new THREE.Matrix4();
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2, r = 19 + (i % 3) * 1.2;
    m4.compose(V(Math.cos(a) * r, 7, Math.sin(a) * r - 4), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -a), V(1, 1, 1)); cols.setMatrixAt(i, m4);
    const s = new THREE.Mesh(stripGeo, i % 2 ? stripMatR : stripMatB); s.position.set(Math.cos(a) * (r - 0.78), 7, Math.sin(a) * (r - 0.78) - 4); s.rotation.y = -a; scene.add(s);
  }
  cols.castShadow = true; scene.add(cols);
  // distant reactor core tower + rings
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.2, 30, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x111115, metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide }));
  tower.position.set(-1, 13, -26); scene.add(tower);
  for (let i = 0; i < 6; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.12, 8, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6a1f).multiplyScalar(1.3 + i * 0.1), toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.set(-1, 3 + i * 4.2, -26); scene.add(ring); }
  // overhead beams + hanging lamps
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(46, 0.6, 0.8), colMat); b.position.set(0, 13.5 + (i % 2) * 0.8, -22 + i * 5); scene.add(b); }
  // volumetric-looking light shafts (additive gradient cones)
  const coneTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128); return new THREE.CanvasTexture(c); })();
  const shafts = [];
  for (const [x, z, col] of [[-5, -5, 0xff3a2a], [8, -9, 0x3a6aff], [-1, 5, 0xbfd0ff]]) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(4.2, 13, 32, 1, true), new THREE.MeshBasicMaterial({ map: coneTex, color: col, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.set(x, 6.8, z); m.rotation.x = Math.PI; scene.add(m); shafts.push(m);
  }

  // ------------------------------------------------ dust / atmosphere
  const DUST = tier === 'low' ? 220 : 520, dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { dustPos[i * 3] = (Math.random() - 0.5) * 36; dustPos[i * 3 + 1] = Math.random() * 11; dustPos[i * 3 + 2] = -22 + Math.random() * 36; dustSeed[i] = Math.random() * 100; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.075, map: glowTexture(), color: 0xaab4d0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false; scene.add(dust);

  // ------------------------------------------------ deterministic spark bursts (pure function of story time)
  const MAXB = 20, PER = 56;
  const sGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(MAXB * PER * 3), sAge = new Float32Array(MAXB * PER);
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sGeo.setAttribute('age', new THREE.BufferAttribute(sAge, 1));
  const sparkMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { scale: { value: 600 } },
    vertexShader: 'attribute float age; varying float vA; uniform float scale; void main(){ vA = age; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = (1.0-age)*scale*0.05/ -mv.z + 1.0; gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord-0.5)*2.; if(d>1.||vA>=1.) discard; vec3 c = mix(vec3(1.,1.,0.9), vec3(1.,0.25,0.05), vA); gl_FragColor = vec4(c*2.0, (1.-d)*(1.-vA)); }',
  });
  const sparks = new THREE.Points(sGeo, sparkMat); sparks.frustumCulled = false; scene.add(sparks);
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function updateSparks(T, bursts) {
    let n = 0;
    for (let b = 0; b < bursts.length && b < MAXB; b++) {
      const br = bursts[b], t = T - br.t;
      for (let i = 0; i < PER; i++, n++) {
        const o = n * 3, life = 0.55 + rnd(b * 97 + i) * 0.5 * (br.big ? 1.6 : 1);
        if (t < 0 || t > life) { sAge[n] = 1; sPos[o] = sPos[o + 1] = sPos[o + 2] = 9999; continue; }
        const th = rnd(b * 13 + i * 7) * Math.PI * 2, ph = (rnd(b * 29 + i * 3) - 0.35) * Math.PI, sp = (2.2 + rnd(b * 53 + i) * 5.5) * (br.big ? 1.5 : 1);
        const vx = Math.cos(th) * Math.cos(ph) * sp, vy = Math.sin(ph) * sp + 1.5, vz = Math.sin(th) * Math.cos(ph) * sp;
        sPos[o] = br.o.x + vx * t; sPos[o + 1] = Math.max(0.02, br.o.y + vy * t - 4.9 * t * t); sPos[o + 2] = br.o.z + vz * t; sAge[n] = t / life;
      }
    }
    for (; n < MAXB * PER; n++) { sAge[n] = 1; sPos[n * 3] = 9999; }
    sGeo.attributes.position.needsUpdate = true; sGeo.attributes.age.needsUpdate = true;
  }

  // ------------------------------------------------ Force lightning ribbons (camera-facing quads)
  const SEG = 14, BOLTS = 5, QUADS = SEG * BOLTS * 2;
  const lPos = new Float32Array(QUADS * 4 * 3), lIdx = []; for (let q = 0; q < QUADS; q++) { const v = q * 4; lIdx.push(v, v + 1, v + 2, v + 2, v + 1, v + 3); }
  const lGeo = new THREE.BufferGeometry(); lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3)); lGeo.setIndex(lIdx);
  const lightning = new THREE.Mesh(lGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fc4ff).multiplyScalar(1.15), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
  lightning.frustumCulled = false; lightning.visible = false; scene.add(lightning);
  const tmpA = V(), tmpB = V(), side = V(), dir = V(), toCam = V();
  function updateLightning(on, sources, target, time, intensity = 1) {
    lightning.visible = on; if (!on) { L.lightning.intensity = 0; return; }
    const tick = Math.floor(time * 28); let q = 0;
    for (let b = 0; b < BOLTS; b++) {
      const src = sources[b % sources.length]; const jag = 0.16 + (b % 3) * 0.05;
      let prev = src.clone();
      for (let s = 1; s <= SEG; s++) {
        const k = s / SEG; const p = src.clone().lerp(target, k);
        const j = Math.sin(k * Math.PI) * jag * (1 + 0.5 * intensity);
        p.x += (rnd(tick * 31 + b * 11 + s) - 0.5) * 2 * j; p.y += (rnd(tick * 17 + b * 5 + s * 3) - 0.5) * 2 * j; p.z += (rnd(tick * 7 + b * 3 + s * 9) - 0.5) * 2 * j;
        for (const [w, mul] of [[0.016, 1], [0.0055, 1]]) {
          dir.copy(p).sub(prev).normalize(); toCam.copy(camera.position).sub(prev).normalize(); side.crossVectors(dir, toCam).normalize().multiplyScalar(w * (b % 2 ? 0.8 : 1.2) * (mul));
          tmpA.copy(prev).sub(side); tmpB.copy(prev).add(side); const o = q * 12;
          lPos.set([tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z], o);
          tmpA.copy(p).sub(side); tmpB.copy(p).add(side); lPos.set([tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z], o + 6); q++;
        }
        prev = p;
      }
    }
    lGeo.attributes.position.needsUpdate = true;
    L.lightning.position.copy(target); L.lightning.intensity = (6 + rnd(tick) * 8) * intensity;
  }

  // ------------------------------------------------ frame helpers
  function setSize(w, h, pr) {
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false); composer.setPixelRatio(pr); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix(); bloom.setSize(w * pr, h * pr);
    sparkMat.uniforms.scale.value = h * pr;
  }
  /** global light level 0..1 (intro starts at 0 → only saber/helmet key light) */
  function setLevel(k) {
    L.hemi.intensity = base.hemi * k; L.key.intensity = base.key * k; L.red.intensity = base.red * k; L.blue.intensity = base.blue * k;
    scene.fog.density = 0.038; shafts.forEach((s) => (s.material.opacity = 0.045 * k));
  }
  function tickDust(time) {
    const a = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST; i++) { const s = dustSeed[i]; a[i * 3 + 1] += 0.0016 + Math.sin(time * 0.3 + s) * 0.0006; a[i * 3] += Math.sin(time * 0.2 + s) * 0.0012; if (a[i * 3 + 1] > 11) a[i * 3 + 1] = 0; }
    dustGeo.attributes.position.needsUpdate = true;
  }
  return { renderer, scene, camera, composer, bloom, L, setSize, setLevel, tickDust, updateSparks, updateLightning, shaftGlow, shaftWall, shafts, SHAFT, tier };
}
