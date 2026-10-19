import * as THREE from 'three';

/**
 * Procedurally modelled Darth Vader-style helmet (real 3D geometry, lit + reflective).
 * Units: metres, +Z is forward, +Y is up, origin at the centre of the skull.
 *
 * NOTE: this is an original low-poly interpretation built in code because no licensed,
 * rigged Vader model could be bundled. Swap it for a licensed GLB by editing
 * public/assets/manifest.json (see README) — buildHelmet() is only used as the fallback.
 */
export function buildHelmet() {
  const g = new THREE.Group();
  g.name = 'VaderHelmet';

  const shell = new THREE.MeshStandardMaterial({ color: 0x060607, metalness: 0.92, roughness: 0.2, envMapIntensity: 1.5 });
  const shellMatte = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, metalness: 0.7, roughness: 0.42, envMapIntensity: 1.0 });
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x070102, metalness: 0.3, roughness: 0.28, clearcoat: 0.4, clearcoatRoughness: 0.25, emissive: 0x330000, emissiveIntensity: 0.45, envMapIntensity: 1.0 });
  const gunmetal = new THREE.MeshStandardMaterial({ color: 0x2b2c2f, metalness: 0.95, roughness: 0.32, envMapIntensity: 1.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x020202, metalness: 0.4, roughness: 0.8 });
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };

  // --- Cranium dome (slightly elongated front-to-back, flattened on top)
  const dome = add(new THREE.SphereGeometry(0.142, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.62), shell, 0, 0.03, -0.005);
  dome.scale.set(1.0, 1.04, 1.1);

  // --- Rear/side neck flare: partial lathe leaving the front open for the face mask
  const flare = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; flare.push(new THREE.Vector2(0.138 + 0.07 * Math.pow(t, 1.6), 0.0 - 0.15 * t)); }
  const skirt = add(new THREE.LatheGeometry(flare, 40, 0.95, Math.PI * 2 - 1.9), shellMatte);
  skirt.material = shellMatte.clone(); skirt.material.side = THREE.DoubleSide; skirt.scale.set(1, 1, 1.05);

  // --- Face mask: tapering partial lathe (front 110°) → narrow chin
  const faceProfile = [
    new THREE.Vector2(0.146, 0.035), new THREE.Vector2(0.147, 0.0), new THREE.Vector2(0.14, -0.04),
    new THREE.Vector2(0.126, -0.08), new THREE.Vector2(0.108, -0.115), new THREE.Vector2(0.085, -0.142), new THREE.Vector2(0.05, -0.152),
  ];
  const face = add(new THREE.LatheGeometry(faceProfile, 32, -0.98, 1.96), shell);
  face.material = shell.clone(); face.material.side = THREE.DoubleSide; face.scale.set(0.96, 1, 1.0);
  // chin cap
  const chin = add(new THREE.SphereGeometry(0.05, 20, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), shell, 0, -0.152, 0.025);
  chin.scale.set(0.9, 0.7, 1.15);

  // --- Brow ridge: arc wrapping the front above the eyes
  const brow = add(new THREE.TorusGeometry(0.141, 0.016, 10, 40, Math.PI * 0.82), shell, 0, 0.055, 0);
  brow.rotation.set(Math.PI / 2, 0, 0); brow.rotation.z = Math.PI / 2 - Math.PI * 0.41 + Math.PI; brow.rotation.order = 'XYZ';
  brow.scale.set(0.97, 1.0, 1);

  // --- Eye lenses: slanted, pointed outward-down, glossy red-black
  const lensShape = new THREE.Shape();
  lensShape.moveTo(0.0, 0.022); lensShape.lineTo(0.05, 0.004); lensShape.lineTo(0.062, -0.018); lensShape.lineTo(0.03, -0.024); lensShape.lineTo(0.0, -0.012); lensShape.closePath();
  const lensGeo = new THREE.ExtrudeGeometry(lensShape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1 });
  for (const s of [-1, 1]) {
    const surroundGeo = lensGeo.clone();
    const surround = add(surroundGeo, dark, s * 0.012, 0.022, 0.1315); surround.scale.set(s * 1.12, 1.5, 1.0); surround.rotation.y = s * -0.25;
    const lens = add(lensGeo, lensMat, s * 0.012, 0.022, 0.1385); lens.scale.set(s * 1.0, 1.0, 1.0); lens.rotation.y = s * -0.25; lens.rotation.z = 0;
  }

  // --- Nasal triangle between the eyes and mouth
  const tri = new THREE.Shape(); tri.moveTo(-0.028, 0.0); tri.lineTo(0.028, 0.0); tri.lineTo(0, -0.07); tri.closePath();
  add(new THREE.ExtrudeGeometry(tri, { depth: 0.02, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1 }), shellMatte, 0, -0.012, 0.132);

  // --- Mouth respirator grille with vertical slats + side vents
  add(new THREE.BoxGeometry(0.075, 0.05, 0.02), gunmetal, 0, -0.1, 0.113);
  for (let i = -3; i <= 3; i++) add(new THREE.BoxGeometry(0.006, 0.042, 0.014), dark, i * 0.0105, -0.1, 0.124);
  for (const s of [-1, 1]) {
    const vent = add(new THREE.CylinderGeometry(0.011, 0.011, 0.04, 12), gunmetal, s * 0.058, -0.086, 0.098); vent.rotation.set(0, 0, Math.PI / 2 + s * 0.2);
  }

  // --- Top crest + neck collar
  const crest = add(new THREE.BoxGeometry(0.012, 0.014, 0.24), shellMatte, 0, 0.162, -0.02); crest.rotation.x = 0.1;
  add(new THREE.CylinderGeometry(0.09, 0.11, 0.07, 28, 1, true), dark, 0, -0.145, -0.015).material = dark.clone();
  g.children[g.children.length - 1].material.side = THREE.DoubleSide;

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
