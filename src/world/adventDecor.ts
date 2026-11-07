import * as THREE from 'three';
import { ADVENT_DOORS, ADVENT_COSMETICS } from '../data/advent';

/**
 * Pure 3D mesh builders for the Advent Calendar. Kept separate from the big
 * world class so the world file stays lean: these return Groups the world
 * positions/owns; all game logic (spawn, proximity, timers) lives in the world.
 */

/** A single wrapped gift box for the advent wall. */
function giftBox(day: number, isOpened: boolean, isCurrent: boolean): THREE.Group {
  const g = new THREE.Group();
  const boxColor = isOpened ? 0x14532d : isCurrent ? 0x9f1239 : 0x7f1d1d;
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.5, 1.5),
    new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.5, emissive: isCurrent && !isOpened ? 0xf59e0b : 0x000000, emissiveIntensity: isCurrent && !isOpened ? 0.5 : 0 })
  );
  box.position.y = 0.75;
  box.castShadow = true;
  g.add(box);

  // Ribbon cross on the lid
  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 1.55, 0.28),
    new THREE.MeshStandardMaterial({ color: isOpened ? 0x22c55e : 0xfbbf24, roughness: 0.4 })
  );
  ribbon.position.y = 1.5;
  g.add(ribbon);

  // Day number plaque (canvas)
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = isOpened ? '#166534' : isCurrent ? '#be123c' : '#7f1d1d';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(day), 64, 74);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true })
  );
  plaque.position.set(0, 0.75, 0.78);
  g.add(plaque);

  // Opened lid pops open
  if (isOpened) {
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.3, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.5 })
    );
    lid.position.set(0, 1.9, -0.6);
    lid.rotation.x = -0.9;
    g.add(lid);
  }
  return g;
}

/**
 * The 24-door gift wall. Boxes sit in a 6-wide arc facing the player.
 * `opened` is the 24-bit bitfield of the active player; `arrived` = current door.
 */
export function buildGiftBoxWall(opened: number, arrived: number): THREE.Group {
  const wall = new THREE.Group();
  const perRow = 6;
  const spacing = 2.2;

  ADVENT_DOORS.forEach((door, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const box = giftBox(door.day, ((opened >> (door.day - 1)) & 1) === 1, door.day === arrived && arrived > 0);
    // Gentle arc layout
    const x = (col - (perRow - 1) / 2) * spacing;
    const z = -row * 2.4;
    box.position.set(x, 0, z);
    wall.add(box);
  });

  // A back panel to read as a "wall"
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(perRow * spacing + 2, 8, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 })
  );
  back.position.set(0, 4, -2 * 2.4 - 1.4);
  wall.add(back);

  return wall;
}

/** Communal decoration layer that grows with the current advent day (date-driven, shared). */
export function buildAdventDecorations(day: number): THREE.Group {
  const group = new THREE.Group();
  if (day <= 0) return group;

  // Fairy-light strings appear early and get denser over the season.
  const lightCount = Math.min(24, day);
  const lightGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const colors = [0xef4444, 0x22c55e, 0xfacc15, 0x3b82f6, 0xec4899];
  for (let i = 0; i < lightCount; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = 60;
    const light = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: colors[i % colors.length] }));
    light.position.set(Math.cos(a) * r, 3 + Math.sin(i * 1.7) * 1.5, Math.sin(a) * r);
    group.add(light);
  }

  // A big advent "Santa hat" tree topper + wreath appear on later days.
  if (day >= 5) {
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.4, 0),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.6 })
    );
    star.position.set(0, 16, 42);
    group.add(star);
  }
  if (day >= 10) {
    const reindeer = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 2.4, 10), new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 }));
    body.rotation.z = Math.PI / 2;
    body.position.y = 1.4;
    reindeer.add(body);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x78350f }));
      leg.position.set(s * 0.7, 0.6, 0);
      reindeer.add(leg);
    }
    reindeer.position.set(10, 1.8, 40);
    group.add(reindeer);
  }

  return group;
}

/** A wearable advent cosmetic, built around the player's head/torso. */
export function buildAdventCosmetic(id: string): THREE.Group | null {
  const g = new THREE.Group();
  const headY = 3.0;

  if (id === 'elf_hat') {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.1, 14), new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 }));
    hat.position.y = headY + 0.9;
    hat.rotation.z = 0.18;
    g.add(hat);
    const curl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    curl.position.set(0.5, headY + 1.35, 0);
    g.add(curl);
  } else if (id === 'reindeer_antlers') {
    const antMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 });
    for (const s of [-1, 1]) {
      const base = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 8), antMat);
      base.position.set(s * 0.5, headY + 0.8, 0);
      base.rotation.z = s * -0.4;
      g.add(base);
      const branch = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 8), antMat);
      branch.position.set(s * 0.75, headY + 1.0, 0);
      branch.rotation.z = s * -0.9;
      g.add(branch);
    }
  } else if (id === 'santa_coat') {
    const fur = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.28, 10, 18), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 }));
    fur.position.y = 2.45;
    fur.rotation.x = Math.PI / 2;
    g.add(fur);
  } else if (id === 'penguin_scarf') {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.22, 10, 18), new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 }));
    scarf.position.y = 2.5;
    scarf.rotation.x = Math.PI / 2;
    g.add(scarf);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.25), new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 }));
    tail.position.set(0.5, 1.9, 0.6);
    tail.rotation.z = -0.2;
    g.add(tail);
  } else if (id === 'snowman_nose') {
    const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 10), new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 }));
    carrot.position.set(0, 1.7, 0.85);
    carrot.rotation.x = Math.PI / 2;
    g.add(carrot);
  } else if (id === 'party_crown') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.14, 8, 20), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7, roughness: 0.3 }));
    band.position.y = headY + 0.62;
    band.rotation.x = Math.PI / 2;
    g.add(band);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7, roughness: 0.3 }));
      spike.position.set(Math.cos(a) * 0.72, headY + 0.85, Math.sin(a) * 0.72);
      g.add(spike);
    }
  }

  if (g.children.length === 0) return null;
  return g;
}

/** A glowing golden treasure (the day's golden gift). */
export function buildGoldenGift(): THREE.Group {
  const g = new THREE.Group();
  const gift = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.2 }));
  g.add(gift);
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.25), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
  ribbon.position.y = 0.45;
  g.add(ribbon);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 16), new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.4;
  g.add(ring);
  return g;
}

/** A single glowing collectible for the challenge (snowflake-like). */
export function buildChallengeItem(index: number, color: number): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 }));
  g.add(core);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.9, 16), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.4;
  g.add(ring);
  void index;
  return g;
}

/** A simple Santa-in-sleigh for the finale. */
export function buildSleighFinale(): THREE.Group {
  const g = new THREE.Group();
  const sleigh = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 4), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 }));
  sleigh.position.y = 1.5;
  g.add(sleigh);
  const runner = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7 }));
  runner.rotation.x = Math.PI / 2;
  runner.position.y = 0.3;
  g.add(runner);
  const santa = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 1.8, 12), new THREE.MeshStandardMaterial({ color: 0xbe123c }));
  body.position.y = 1;
  santa.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffedd5 }));
  head.position.y = 2.1;
  santa.add(head);
  santa.position.set(0, 2.5, 0);
  g.add(santa);
  return g;
}

/** Which cosmetic id is described by a cosmetic index (helper for UI parity). */
export function cosmeticIndexToId(i: number): string | undefined {
  return ADVENT_COSMETICS[i]?.id;
}
