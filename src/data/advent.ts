import { GameType } from '../types';
import { getTodayDateKey } from '../utils/dailyClock';

/**
 * ADVENT CALENDAR
 * ---------------
 * A 24-door daily advent calendar the whole family shares. Each day (door)
 * opens for every player and grants a "treat": a wearable cosmetic, bonus
 * points, a golden treasure hunt, a one-shot timed challenge, a game-variant
 * twist, or a letter from Santa — with a communal decoration layer that
 * transforms the island day by day and a big finale on the last day.
 *
 * DATE-DRIVEN: the calendar runs for ADVENT_DAYS days starting at ADVENT_START.
 * Testing starts 7 Nov (runs 7–30 Nov); flip ADVENT_START to '2026-12-01' for
 * the real December run. Changing the start date auto-resets every player's
 * opened state (they opt into a new "session").
 */
export const ADVENT_START = '2026-11-07'; // ← set to '2026-12-01' for the real run
export const ADVENT_DAYS = 24;

function dateKeyToOrdinal(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000; // whole days since epoch
}

/** Which door (1–24) does a given date correspond to? 0 = calendar not running. */
export function adventDayFor(dateKey: string): number {
  const diff = Math.round(dateKeyToOrdinal(dateKey) - dateKeyToOrdinal(ADVENT_START));
  if (diff < 0 || diff >= ADVENT_DAYS) return 0;
  return diff + 1;
}

/** The date (YYYY-MM-DD) on which door #N opens. */
export function adventDateKeyForDay(day: number): string {
  const [y, m, d] = ADVENT_START.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + (day - 1)));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** The door for today, or 0 if the calendar isn't running today. */
export function currentAdventDay(): number {
  return adventDayFor(getTodayDateKey());
}

export type AdventDoorType = 'letter' | 'cosmetic' | 'bonus' | 'treasure' | 'challenge' | 'variant' | 'finale';

export interface AdventDoor {
  day: number;
  type: AdventDoorType;
  title: string;
  icon: string;
  letter?: string; // type: letter
  cosmeticId?: string; // type: cosmetic
  points?: number; // type: bonus
  treasureArea?: 'any' | 'ocean' | 'land'; // type: treasure (where the golden gift spawns)
  treasurePoints?: number;
  challengeName?: string; // type: challenge
  challengeCount?: number; // how many glowing items to collect
  challengeArea?: 'any' | 'ocean' | 'land';
  challengePoints?: number; // points for finishing (rank-based on top)
  variantGame?: GameType; // type: variant
  variantMult?: number; // scoring multiplier that day
  variantLabel?: string; // flavour twist shown in UI
}

/** The six wearable advent cosmetics (built from primitives, worn on the avatar). */
export interface AdventCosmetic {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const ADVENT_COSMETICS: AdventCosmetic[] = [
  { id: 'elf_hat', name: 'Elves’ Pointy Hat', emoji: '🧝', description: 'A festive green hat with a curly brim.' },
  { id: 'reindeer_antlers', name: 'Reindeer Antlers', emoji: '🦌', description: 'Glittery antlers for a very good (or naughty) head.' },
  { id: 'santa_coat', name: 'Santa Coat Trim', emoji: '🎅', description: 'A fluffy white fur collar, straight from the North Pole.' },
  { id: 'penguin_scarf', name: 'Penguin Knit Scarf', emoji: '🐧', description: 'A chunky striped scarf, warm as a penguin huddle.' },
  { id: 'snowman_nose', name: 'Carrot Nose Charm', emoji: '🥕', description: 'A jolly carrot pinned to your chest.' },
  { id: 'party_crown', name: 'Family Party Crown', emoji: '👑', description: 'A golden crown for the whole dressed-up family.' }
];

/**
 * The 24 doors. A gentle on-ramp, a mix of all six treat types, building to
 * the sleigh (day 23) and the big finale (day 24).
 */
export const ADVENT_DOORS: AdventDoor[] = [
  { day: 1, type: 'letter', title: 'A Note from Santa', icon: '✉️', letter: "Ho ho ho! The Henry family, the advent calendar has begun! Every day until Christmas, a box will open for the whole family. Come by the gift wall each morning — there's a treat waiting for everyone. Don't be late, or the elves will laugh. — Santa 🎅" },
  { day: 2, type: 'cosmetic', title: 'Elves’ Pointy Hat', icon: '🧝', cosmeticId: 'elf_hat' },
  { day: 3, type: 'bonus', title: 'Morning Cocoa Points', icon: '☕', points: 5 },
  { day: 4, type: 'treasure', title: 'The Golden Bell', icon: '🔔', treasureArea: 'any', treasurePoints: 10 },
  { day: 5, type: 'cosmetic', title: 'Reindeer Antlers', icon: '🦌', cosmeticId: 'reindeer_antlers' },
  { day: 6, type: 'variant', title: 'Lucky Dice Day', icon: '🎲', variantGame: 'target24', variantMult: 2, variantLabel: 'Target 24 pays DOUBLE today' },
  { day: 7, type: 'challenge', title: 'Snowflake Sprint', icon: '❄️', challengeName: 'Snowflake Sprint', challengeCount: 3, challengeArea: 'land', challengePoints: 10 },
  { day: 8, type: 'bonus', title: 'Starlight Points', icon: '⭐', points: 5 },
  { day: 9, type: 'letter', title: 'Rudolph Writes', icon: '✉️', letter: "Hey! It's me, Rudolph. My nose has been doing extra sparkly things for the calendar. Heads up — tomorrow the family gets a proper warm outfit. Also, I parked the sleigh somewhere you'll have to wait a few days to find. Hint: it's big. — Rudolph 🦌" },
  { day: 10, type: 'cosmetic', title: 'Santa Coat Trim', icon: '🎅', cosmeticId: 'santa_coat' },
  { day: 11, type: 'treasure', title: 'The Golden Toy', icon: '🎁', treasureArea: 'any', treasurePoints: 12 },
  { day: 12, type: 'variant', title: 'Snowy Ladder Day', icon: '🪜', variantGame: 'wordLadder', variantMult: 2, variantLabel: 'Word Ladder pays DOUBLE today' },
  { day: 13, type: 'challenge', title: 'Gift Grab', icon: '🎀', challengeName: 'Gift Grab', challengeCount: 5, challengeArea: 'any', challengePoints: 12 },
  { day: 14, type: 'cosmetic', title: 'Penguin Knit Scarf', icon: '🐧', cosmeticId: 'penguin_scarf' },
  { day: 15, type: 'bonus', title: 'Gingerbread Points', icon: '🍪', points: 8 },
  { day: 16, type: 'treasure', title: 'The Golden Compass', icon: '🧭', treasureArea: 'ocean', treasurePoints: 15 },
  { day: 17, type: 'letter', title: 'From the Elves’ Workshop', icon: '✉️', letter: "Dear Henry family, we elves have been busy! The island is getting properly decorated thanks to you all opening your boxes. Three little ones of you should be getting antlers and hats by now. Slow and steady — the big days are coming. — The Elves of Henry Island 🧝‍♀️🧝‍♂️" },
  { day: 18, type: 'cosmetic', title: 'Carrot Nose Charm', icon: '🥕', cosmeticId: 'snowman_nose' },
  { day: 19, type: 'challenge', title: 'Ocean Ornament Run', icon: '⛵', challengeName: 'Ocean Ornament Run', challengeCount: 6, challengeArea: 'ocean', challengePoints: 15 },
  { day: 20, type: 'bonus', title: 'Fireworks Points', icon: '🎆', points: 10 },
  { day: 21, type: 'cosmetic', title: 'Family Party Crown', icon: '👑', cosmeticId: 'party_crown' },
  { day: 22, type: 'treasure', title: 'The Golden Sleigh Bell', icon: '🛷', treasureArea: 'any', treasurePoints: 20 },
  { day: 23, type: 'finale', title: 'The Sleigh Lands!', icon: '🛷', points: 5 },
  { day: 24, type: 'finale', title: 'Merry Christmas!', icon: '🎄', points: 15 }
];

export function getDoor(day: number): AdventDoor | undefined {
  return ADVENT_DOORS.find(d => d.day === day);
}

/** Family bonus for the finale days: granted only if every player opened the door. */
export function familyBonusForDoor(day: number): number {
  const door = getDoor(day);
  if (!door || door.type !== 'finale') return 0;
  return door.points || 0;
}
