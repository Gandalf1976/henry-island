import { getDateSeed, getTodayDateKey } from './dailyClock';

/**
 * Daily Boat Race course.
 *
 * The course is seeded by the date, so EVERY family member races the exact
 * same 10 gates on a given day (fair time comparison), and the course is
 * re-scattered each day.
 *
 * Gates are two boat-widths wide (see islandWorld3D) and live in the open
 * ocean ring between the island's coastline and the outer ice boundary.
 */

export interface RaceGate {
  /** Gate center, world coordinates (y handled by the world). */
  x: number;
  z: number;
  /** Gate facing (unit vector pointing from the gate toward the island). */
  nx: number;
  nz: number;
  /** Gate line direction (unit vector along the opening). */
  dx: number;
  dz: number;
  /** Gate number, 1..10, in visiting order. */
  number: number;
}

export interface RaceStartLine {
  x: number;
  z: number;
  nx: number;
  nz: number;
  dx: number;
  dz: number;
}

export interface RaceCourse {
  startLine: RaceStartLine;
  gates: RaceGate[]; // index 0 = gate 1 ... index 9 = gate 10
}

/** Inner edge of the ocean ring where gates may appear (past the coastline lobes). */
export const RACE_MIN_RADIUS = 135;
/** Outer edge of the gate ring (well inside the ~240 ice boundary). */
export const RACE_MAX_RADIUS = 225;
/** Gate opening width = two boat hulls wide (hull is 2.4 units). */
export const RACE_GATE_WIDTH = 4.8;
/** Start line width (a comfy double gate for launching). */
export const RACE_START_WIDTH = 10;

/** Small deterministic PRNG so the whole course derives from the date seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function radialVectors(angle: number): { nx: number; nz: number; dx: number; dz: number } {
  // n = toward island center, d = tangent along the gate opening
  const nx = -Math.cos(angle);
  const nz = -Math.sin(angle);
  return { nx, nz, dx: -Math.sin(angle), dz: Math.cos(angle) };
}

/**
 * Returns today's (or the given date's) boat race course:
 * a fixed start line off the eastern beach plus 10 randomly scattered gates.
 */
export function getDailyRaceCourse(dateKey: string = getTodayDateKey()): RaceCourse {
  const rnd = mulberry32(getDateSeed(`${dateKey}-boat-race-v1`) || 1);

  // Start line: just off the island's eastern beach (near the boat dock side),
  // oriented along the coast so the boat crosses it radially.
  const startAngle = 0.75; // east-south-east, off the lake/beach shore
  const startDist = 118;
  const start = radialVectors(startAngle);
  const startLine: RaceStartLine = {
    x: Math.cos(startAngle) * startDist,
    z: Math.sin(startAngle) * startDist,
    ...start
  };

  // 10 gates: even-ish angular spread around the island with jitter, so the
  // ring is fully covered but no two gates crowd together.
  const baseAngle = rnd() * Math.PI * 2;
  const steps: number[] = [];
  let total = 0;
  for (let i = 0; i < 10; i++) {
    const step = (Math.PI * 2) / 10 * (0.55 + rnd() * 0.9); // 0.55x–1.45x of the even share
    steps.push(step);
    total += step;
  }
  const scale = (Math.PI * 2) / total; // normalise to one full loop

  const positions: { angle: number; dist: number }[] = [];
  let angle = baseAngle;
  for (let i = 0; i < 10; i++) {
    angle += steps[i] * scale;
    const dist = RACE_MIN_RADIUS + rnd() * (RACE_MAX_RADIUS - RACE_MIN_RADIUS);
    positions.push({ angle: angle % (Math.PI * 2), dist });
  }

  // Random visiting order (the numbered sequence zig-zags around the ring).
  const order = positions.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const gates: RaceGate[] = order.map((posIdx, visitingIdx) => {
    const pos = positions[posIdx];
    const v = radialVectors(pos.angle);
    return {
      x: Math.cos(pos.angle) * pos.dist,
      z: Math.sin(pos.angle) * pos.dist,
      ...v,
      number: visitingIdx + 1
    };
  });

  return { startLine, gates };
}

/** Formats a millisecond duration as m:ss.mmm (race times are shown to the millisecond). */
export function formatRaceTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}
