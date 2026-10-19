import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { buildHelmet } from './helmet.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion();

/** GLTFLoader sanitizes "mixamorig:Hips" → "mixamorigHips". Accept both. */
function bone(model, name) { return model.getObjectByName('mixamorig' + name) || model.getObjectByName('mixamorig:' + name); }

/** Rotate a bone by an angle about a WORLD axis (axis-convention independent). */
function rotWorld(b, axis, ang) {
  if (!ang) return;
  b.updateWorldMatrix(true, false);
  b.getWorldQuaternion(_q);
  _q2.setFromAxisAngle(axis, ang).multiply(_q);
  b.parent.getWorldQuaternion(_pq);
  b.quaternion.copy(_pq.invert().multiply(_q2));
  b.updateWorldMatrix(false, true);
}
function setWorldQuat(b, wq) {
  b.parent.getWorldQuaternion(_pq);
  b.quaternion.copy(_pq.invert().multiply(wq));
  b.updateWorldMatrix(false, true);
}

export const SPECS = {
  vader: { label: 'Darth Vader', body: 0x0d0d10, metal: 0.55, rough: 0.38, saber: 0xff2216, cape: { color: 0x050506, W: 0.64, H: 1.38 }, helmet: true },
  obiwan: { label: 'Obi-Wan Kenobi', body: 0x6b5a40, metal: 0.0, rough: 0.95, saber: 0x2f80ff, cape: { color: 0x4a3827, W: 0.78, H: 1.2 }, head: { skin: 0xa88068, hair: 0x80561f, beard: true } },
  plagueis: { label: 'Darth Plagueis', body: 0x15151c, metal: 0.1, rough: 0.8, saber: 0xff3a1a, cape: { color: 0x0b0b12, W: 0.84, H: 1.5 }, hood: { skin: 0x8c9296, muun: true } },
  palpatine: { label: 'Emperor Palpatine', body: 0x060608, metal: 0.05, rough: 0.9, saber: null, cape: { color: 0x030305, W: 0.9, H: 1.5 }, hood: { skin: 0x7b786d, eyes: 0xffd24a } },
};

export async function loadRig(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const clips = {}; gltf.animations.forEach((c) => (clips[c.name] = c));
  return { gltf, clips };
}

// ---------------------------------------------------------------- cloth-ish cape
class Cape {
  constructor(root, spec, anchorBone) {
    this.root = root; this.spec = spec; this.anchor = anchorBone;
    this.nx = 7; this.ny = 11;
    const geo = new THREE.PlaneGeometry(1, 1, this.nx, this.ny);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.92, metalness: 0, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    root.add(this.mesh);
    this.prevZ = 0;
  }
  update(time, speed, lean, fallen) {
    const { W, H } = this.spec, pos = this.mesh.geometry.attributes.position;
    const a = this.root.worldToLocal(this.anchor.getWorldPosition(V()));
    for (let r = 0; r <= this.ny; r++) {
      const k = r / this.ny;
      const width = W * (0.55 + 0.75 * k);
      const back = 0.1 + k * k * (0.12 + speed * 0.5) + Math.sin(time * 2.2 + k * 5) * 0.025 * k * (1 + speed * 2);
      for (let c = 0; c <= this.nx; c++) {
        const u = c / this.nx - 0.5, i = r * (this.nx + 1) + c;
        const arc = Math.cos(u * Math.PI) * 0.05 * (1 - k * 0.5);
        const x = u * width + Math.sin(time * 1.7 + c + k * 6) * 0.02 * k;
        const y = a.y + 0.04 - k * H * (fallen ? 0.55 : 1);
        const z = a.z - back - arc * 0.5 + (fallen ? k * 0.25 : 0);
        pos.setXYZ(i, x, Math.max(0.02, y), z);
      }
    }
    pos.needsUpdate = true; this.mesh.geometry.computeVertexNormals();
  }
}

// ---------------------------------------------------------------- Actor
export class Actor {
  constructor(id, rig) {
    this.id = id; this.spec = SPECS[id];
    this.root = new THREE.Group(); this.root.name = id;
    this.model = cloneSkinned(rig.gltf.scene);
    // The Mixamo Soldier natively faces -Z. Everything in this project assumes +Z = forward,
    // so the rig is turned 180° BEFORE calibration (costume/saber attachment happens in that frame).
    this.model.rotation.y = Math.PI;
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const n of ['Idle', 'Walk', 'Run']) { const a = (this.actions[n.toLowerCase()] = this.mixer.clipAction(rig.clips[n])); a.play(); a.setEffectiveWeight(0); }
    this.clipDur = { idle: rig.clips.Idle.duration, walk: rig.clips.Walk.duration, run: rig.clips.Run.duration };
    this.root.rotation.order = 'YXZ';

    const spec = this.spec;
    const mat = new THREE.MeshStandardMaterial({ color: spec.body, roughness: spec.rough, metalness: spec.metal, envMapIntensity: 1.1 });
    this.model.traverse((o) => {
      if (o.isSkinnedMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.name.includes('visor')) o.visible = false; else o.material = mat; }
    });

    // --- Calibrate in T-pose, then attach costume/saber to bones (attach() keeps world transforms)
    const tp = this.mixer.clipAction(rig.clips.TPose); tp.play(); tp.time = 0.01; this.mixer.update(0);
    this.root.updateMatrixWorld(true);
    this.b = {};
    for (const n of ['Hips', 'Spine', 'Spine1', 'Spine2', 'Head', 'Neck', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg']) this.b[n] = bone(this.model, n);
    const wp = (n) => this.b[n].getWorldPosition(V());
    this.l1 = wp('RightArm').distanceTo(wp('RightForeArm'));
    this.l2 = wp('RightForeArm').distanceTo(wp('RightHand'));
    this.shoulderY = wp('RightArm').y;
    this.handBindQ = this.b.RightHand.getWorldQuaternion(new THREE.Quaternion());

    this._buildCostume(wp);
    this._buildSaber(wp);
    this.cape = new Cape(this.root, spec.cape, this.b.Spine2);
    tp.stop(); this.mixer.stopAllAction();
    for (const a of Object.values(this.actions)) { a.play(); a.setEffectiveWeight(0); }

    this.pole = V();
    this.speed = 0; this.prevPos = new THREE.Vector3(); this.state = { saber: 0 };
  }

  _buildCostume(wp) {
    const s = this.spec, head = this.b.Head, hp = wp('Head');
    const att = (obj, boneName, x, y, z) => { obj.position.set(x, y, z); this.root.add(obj); this.b[boneName].attach(obj); obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return obj; };
    const cloth = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: THREE.DoubleSide });
    if (s.helmet) {
      const h = buildHelmet(); h.scale.setScalar(1.12);
      att(h, 'Head', hp.x, hp.y + 0.115, hp.z + 0.012);
      this.helmet = h;
      // chest control panel + belt (small emissive LEDs → picks up bloom)
      const sp = wp('Spine2');
      const panel = new THREE.Group();
      panel.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.11, 0.025), new THREE.MeshStandardMaterial({ color: 0x1c1c20, metalness: 0.9, roughness: 0.3 })));
      [[-0.05, 0xff2020], [0, 0x2a6bff], [0.05, 0xff2020]].forEach(([x, c], i) => { const led = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.016, 0.01), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); led.position.set(x, 0.02 - (i % 2) * 0.03, 0.016); panel.add(led); });
      att(panel, 'Spine2', sp.x, sp.y - 0.02, sp.z + 0.14);
      const hips = wp('Hips');
      att(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 20), new THREE.MeshStandardMaterial({ color: 0x25252a, metalness: 0.9, roughness: 0.35 })), 'Hips', hips.x, hips.y + 0.1, hips.z);
    }
    if (s.head) { // human head: skin, hair, optional beard
      const skin = new THREE.MeshStandardMaterial({ color: s.head.skin, roughness: 0.7 });
      const sk = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), skin); sk.scale.set(0.88, 1.1, 0.98); att(sk, 'Head', hp.x, hp.y + 0.1, hp.z + 0.01);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.112, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), new THREE.MeshStandardMaterial({ color: s.head.hair, roughness: 0.9 })); hair.scale.set(0.92, 1.08, 1.02); att(hair, 'Head', hp.x, hp.y + 0.115, hp.z);
      if (s.head.beard) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: s.head.hair, roughness: 1 })); b.scale.set(1.1, 0.9, 0.9); att(b, 'Head', hp.x, hp.y + 0.07, hp.z + 0.04); }
    }
    if (s.hood) { // hooded Sith: open-front hood, pale face, optional glowing eyes
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.175, 28, 18, Math.PI / 2 + 1.05, Math.PI * 2 - 2.1, 0, Math.PI * 0.82), cloth(s.body)); hood.scale.set(1, 1.1, 1.12);
      att(hood, 'Head', hp.x, hp.y + 0.1, hp.z - 0.02);
      const skin = new THREE.MeshStandardMaterial({ color: s.hood.skin, roughness: 0.6 });
      const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), skin); face.scale.set(0.82, s.hood.muun ? 1.45 : 1.05, 0.9);
      att(face, 'Head', hp.x, hp.y + (s.hood.muun ? 0.14 : 0.09), hp.z + 0.025);
      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: s.hood.eyes || 0x0a0a0a, toneMapped: false }));
        att(eye, 'Head', hp.x + sx * 0.035, hp.y + 0.095, hp.z + 0.115);
      }
    }
    if (!s.helmet) { // robe skirt on hips for the non-armored characters
      const hips = wp('Hips');
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.75, 20, 1, true), cloth(s.cape.color)); skirt.castShadow = true;
      att(skirt, 'Hips', hips.x, hips.y - 0.22, hips.z);
    }
  }

  _buildSaber(wp) {
    const s = this.spec; if (!s.saber) { this.saber = null; return; }
    const sock = new THREE.Group(); sock.name = 'saberSocket';
    const hand = wp('RightHand');
    // T-pose, palm down: grip axis (blade) runs across the palm = world +Z (out of the thumb side)
    sock.position.copy(hand).add(V(0, -0.005, 0.0));
    sock.quaternion.setFromUnitVectors(V(0, 1, 0), V(0, 0, 1));
    this.root.add(sock);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.27, 14), new THREE.MeshStandardMaterial({ color: 0x9a9aa2, metalness: 1, roughness: 0.28 }));
    hilt.position.y = 0.06; sock.add(hilt);
    for (const y of [-0.04, 0.0, 0.1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0225, 0.0225, 0.012, 14), new THREE.MeshStandardMaterial({ color: 0x1b1b1f, metalness: 0.8, roughness: 0.4 })); r.position.y = y; sock.add(r); }
    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.02, 14), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 1, roughness: 0.15 })); emitter.position.y = 0.205; sock.add(emitter);

    const col = new THREE.Color(s.saber);
    const bladeGroup = new THREE.Group(); bladeGroup.position.y = 0.215; sock.add(bladeGroup);
    const mk = (r, color, op, additive) => {
      const geo = new THREE.CylinderGeometry(r, r, 1, 16, 1, false); geo.translate(0, 0.5, 0);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, toneMapped: false }));
      bladeGroup.add(m); return m;
    };
    this.bladeCore = mk(0.012, 0xffffff, 1, false);
    this.bladeMid = mk(0.024, col.clone().lerp(new THREE.Color(0xffffff), 0.25), 0.85, true);
    this.bladeGlow = mk(0.042, col, 0.3, true);
    this.bladeGlow2 = mk(0.07, col, 0.07, true);
    this.bladeLen = 1.18;
    this.light = new THREE.PointLight(col, 0, 7, 1.6); bladeGroup.add(this.light); this.light.position.y = 0.5;
    this.saber = sock; this.bladeGroup = bladeGroup; this.saberColor = col;
    // attach to the hand bone (keeps world transform) → saber is physically parented to the actor's hand
    this.b.RightHand.attach(sock);
    this.socketLocalQ = sock.quaternion.clone();
    this.setSaber(0);
  }

  /** p ∈ [0,1] blade extension (0 = hilt only). */
  setSaber(p, flicker = 1) {
    if (!this.saber) return;
    const len = Math.max(0.0001, this.bladeLen * p);
    // the socket carries the 1/0.01 bone-scale correction; blade lengths are authored in metres
    for (const m of [this.bladeCore, this.bladeMid, this.bladeGlow, this.bladeGlow2]) m.scale.set(1, len, 1);
    this.bladeGroup.visible = p > 0.001;
    this.light.intensity = p * (3.2 + Math.random() * 0.5 * flicker);
    this.light.position.y = len * 0.5;
  }
  bladeTip() { return this.bladeGroup.localToWorld(V(0, this.bladeLen * (this.state.saber || 0), 0)); }
  hiltPos() { return this.saber ? this.bladeGroup.localToWorld(V(0, 0, 0)) : V(); }

  // ------------------------------------------------------------ per-frame pose
  apply(s, time) {
    this.state = s;
    this.root.position.set(s.x, s.y || 0, s.z);
    this.root.rotation.set(s.pitch || 0, s.yaw || 0, s.roll || 0);
    // animation: blend idle/walk/run weights, scrub clock times deterministically
    const w = s.w || { idle: 1 }; let sum = (w.idle || 0) + (w.walk || 0) + (w.run || 0) || 1;
    for (const n of ['idle', 'walk', 'run']) {
      const a = this.actions[n]; a.setEffectiveWeight((w[n] || 0) / sum);
      const phase = n === 'idle' ? s.tIdle : n === 'walk' ? s.walkPhase : s.walkPhase * 0.62;
      a.time = ((phase % this.clipDur[n]) + this.clipDur[n]) % this.clipDur[n];
    }
    this.mixer.update(0);
    this.root.updateMatrixWorld(true);

    const yawQ = _q.setFromAxisAngle(V(0, 1, 0), s.yaw || 0);
    const right = V(1, 0, 0).applyQuaternion(yawQ), up = V(0, 1, 0);

    // posture: lean / hunch distributed over the spine, head look
    const lean = (s.lean || 0);
    if (lean) { rotWorld(this.b.Spine, right, lean * 0.35); rotWorld(this.b.Spine1, right, lean * 0.35); rotWorld(this.b.Spine2, right, lean * 0.3); }
    if (s.look) rotWorld(this.b.Head, up, s.look);
    if (s.headPitch) rotWorld(this.b.Head, right, s.headPitch);

    // defeat sequence: stagger → kneel (legs bent in world axes) → topple handled via root pitch
    if (s.kneel) {
      rotWorld(this.b.LeftUpLeg, right, -1.25 * s.kneel); rotWorld(this.b.RightUpLeg, right, -1.25 * s.kneel);
      rotWorld(this.b.LeftLeg, right, 1.9 * s.kneel); rotWorld(this.b.RightLeg, right, 1.9 * s.kneel);
    }
    if (s.flail) { // arms flung out for a lifted/choked pose
      rotWorld(this.b.RightArm, V(0, 0, 1).applyQuaternion(yawQ), s.flail * 1.2);
    }

    // hand + saber IK (world-space target given by the story)
    if (s.ik && s.ik.w > 0.001 && this.saber) this._ik(s.ik, yawQ, right);
    this.setSaber(s.saber || 0);

    this.root.updateMatrixWorld(true);
    this.cape.update(time, Math.min(1, s.speed || 0), lean, s.defeat > 0.6);
  }

  _ik(ik, yawQ, right) {
    const { RightArm: A, RightForeArm: B, RightHand: H } = this.b;
    const keep = [A, B, H].map((b) => b.quaternion.clone());
    const a = A.getWorldPosition(V()), T = ik.p.clone();
    // grip centre sits ≈ at wrist; blade axis defines hand orientation
    const toT = T.clone().sub(a), reach = this.l1 + this.l2 - 0.002;
    let d = toT.length(); const dir = toT.clone().normalize(); d = THREE.MathUtils.clamp(d, 0.12, reach);
    const T2 = a.clone().add(dir.clone().multiplyScalar(d));
    // elbow: down + outward, slightly behind
    const pole = V(0, -1, -0.15).add(right.clone().multiplyScalar(-0.55)).normalize();
    pole.sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const x = (this.l1 * this.l1 - this.l2 * this.l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, this.l1 * this.l1 - x * x));
    const E = a.clone().add(dir.clone().multiplyScalar(x)).add(pole.multiplyScalar(h));
    // upper arm → elbow
    const aim = (bn, from, curTo, newTo) => {
      const cur = curTo.clone().sub(from).normalize(), nw = newTo.clone().sub(from).normalize();
      bn.getWorldQuaternion(_q); _q2.setFromUnitVectors(cur, nw).multiply(_q); setWorldQuat(bn, _q2.clone());
    };
    aim(A, a, B.getWorldPosition(V()), E);
    aim(B, E, H.getWorldPosition(V()), T2);
    // hand: socket +Y (blade) → ik.d
    const desired = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), ik.d.clone().normalize());
    setWorldQuat(H, desired.multiply(this.socketLocalQ.clone().invert()));
    if (ik.w < 0.999) { [A, B, H].forEach((b, i) => b.quaternion.slerp(keep[i], 1 - ik.w)); A.updateWorldMatrix(false, true); }
  }
}
