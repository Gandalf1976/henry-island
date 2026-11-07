import { familyStore, AdventOpenResult } from '../state/familyStore';
import { soundAudio } from '../utils/audio';
import { getTodayDateKey } from '../utils/dailyClock';
import {
  ADVENT_DOORS, ADVENT_COSMETICS, AdventDoor,
  adventDayFor, adventDateKeyForDay, ADVENT_DAYS
} from '../data/advent';
import confetti from 'canvas-confetti';

/**
 * The Advent Calendar modal: a 24-door gift wall. Each door opens for every
 * family member on its date (missed days can still be opened). Doors grant a
 * wearable cosmetic, bonus points, a golden treasure hunt, a one-shot timed
 * challenge, a game-variant twist, or a letter from Santa — with a wardrobe
 * to try on unlocked looks.
 *
 * `onWorldEvent` tells the app to spawn/trigger the matching 3D event:
 *   { kind: 'treasure', door }  { kind: 'challenge', door }  { kind: 'finale', door }
 */
export type AdventWorldEvent =
  | { kind: 'treasure'; door: AdventDoor }
  | { kind: 'challenge'; door: AdventDoor }
  | { kind: 'finale'; door: AdventDoor };

export class AdventModal {
  private container: HTMLElement;
  private onClose: () => void;
  private onWorldEvent: (e: AdventWorldEvent) => void;
  private detailDay: number | null = null;

  constructor(container: HTMLElement, onClose: () => void, onWorldEvent: (e: AdventWorldEvent) => void) {
    this.container = container;
    this.onClose = onClose;
    this.onWorldEvent = onWorldEvent;
    soundAudio.playButtonClick();
    this.render();
  }

  private formatDayDate(day: number): string {
    try {
      const [y, m, d] = adventDateKeyForDay(day).split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return `Day ${day}`;
    }
  }

  public render(): void {
    const today = getTodayDateKey();
    const arrived = adventDayFor(today);
    const active = familyStore.getActivePlayer();
    const opened = familyStore.getAdventOpened(active.id);
    const unlocked = familyStore.getAdventUnlocked(active.id);
    const worn = familyStore.getWornAdventCosmetic(active.id);

    const doorCells = ADVENT_DOORS.map(door => {
      const isOpened = ((opened >> (door.day - 1)) & 1) === 1;
      const isArrived = arrived > 0 && door.day <= arrived;
      const isFuture = !isArrived;
      const isCurrent = door.day === arrived;

      let cls = 'relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition ';
      let click = '';
      let ribbon = '';
      if (isFuture) {
        cls += 'bg-slate-800/60 border-slate-600/50 opacity-50';
      } else if (isOpened) {
        cls += 'bg-emerald-900/40 border-emerald-500/50';
        ribbon = '<span class="absolute top-1 right-1 text-xs">✅</span>';
      } else {
        cls += 'bg-gradient-to-b from-rose-700 to-rose-900 border-amber-400 shadow-lg cursor-pointer hover:scale-105 ' + (isCurrent ? 'animate-pulse' : '');
        click = ' data-open="' + door.day + '"';
      }

      return `<button class="${cls}"${click}>
        ${ribbon}
        <span class="text-xl">${door.icon}</span>
        <span class="text-[11px] font-black text-white leading-none mt-1">${door.day}</span>
        <span class="text-[9px] text-white/70 leading-none">${this.formatDayDate(door.day)}</span>
        ${isCurrent ? '<span class="absolute -top-2 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[8px] font-black">TODAY</span>' : ''}
      </button>`;
    }).join('');

    const detail = this.detailDay ? this.renderDetail(this.detailDay, worn) : this.renderHint(arrived, opened);

    const wardrobe = this.renderWardrobe(unlocked, worn);

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
        <div class="relative w-full max-w-2xl bg-gradient-to-b from-indigo-950 via-slate-900 to-rose-950 border-2 border-amber-400/70 rounded-3xl shadow-2xl p-5 text-white flex flex-col max-h-[92vh]">

          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🎁</span>
              <div>
                <h3 class="text-lg sm:text-xl font-black text-amber-300">Henry Island Advent Calendar</h3>
                <p class="text-xs text-sky-200">${arrived > 0 ? `Day ${arrived} of ${ADVENT_DAYS} — open today's box!` : 'Opens ' + this.formatDayDate(1) + ' through ' + this.formatDayDate(ADVENT_DAYS) + ' each year'}</p>
              </div>
            </div>
            <button id="advent-close-btn" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition">✕</button>
          </div>

          <div class="flex-1 overflow-y-auto space-y-4 pr-1 -m-1 p-1">
            <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">${doorCells}</div>
            ${detail}
            ${wardrobe}
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#advent-close-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.onClose();
    });
    this.container.querySelectorAll('[data-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = Number(btn.getAttribute('data-open'));
        this.openDoor(day);
      });
    });
    this.container.querySelectorAll('[data-wear]').forEach(btn => {
      btn.addEventListener('click', () => {
        familyStore.setAdventCosmetic(active.id, btn.getAttribute('data-wear') || '');
        soundAudio.playButtonClick();
        this.render();
      });
    });
  }

  private renderHint(arrived: number, opened: number): string {
    const openCount = ADVENT_DOORS.filter(d => ((opened >> (d.day - 1)) & 1) === 1).length;
    const todayDoor = arrived > 0 ? ADVENT_DOORS.find(d => d.day === arrived) : undefined;
    const todayOpen = arrived > 0 && ((opened >> (arrived - 1)) & 1) === 1;

    if (arrived <= 0) {
      return `<div class="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
        <div class="text-3xl mb-1">🎄</div>
        <p class="text-sm text-sky-200">The calendar opens <strong>${this.formatDayDate(1)}</strong>! Come back then — a fresh box for the whole family every day until Christmas.</p>
      </div>`;
    }
    return `<div class="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs uppercase tracking-wider text-amber-300 font-bold">Today's Treat</div>
          <div class="text-lg font-black">${todayDoor?.icon} ${todayDoor?.title}</div>
        </div>
        ${todayOpen
          ? '<span class="text-xs font-black text-emerald-400 bg-emerald-900/50 px-3 py-1 rounded-full">OPENED ✓</span>'
          : '<span class="text-xs font-black text-amber-300 bg-amber-900/50 px-3 py-1 rounded-full animate-pulse">TAP A GLOWING BOX</span>'}
      </div>
      <p class="text-xs text-sky-200 mt-2">${openCount}/${ADVENT_DAYS} boxes opened this season. Missed a day? Any arrived box can still be opened.</p>
    </div>`;
  }

  private renderDetail(day: number, worn: string): string {
    const door = ADVENT_DOORS.find(d => d.day === day);
    if (!door) return '';
    const active = familyStore.getActivePlayer();
    const isOpened = ((familyStore.getAdventOpened(active.id) >> (day - 1)) & 1) === 1;

    let body = '';
    if (door.type === 'letter' && door.letter) {
      body = `<p class="text-sm text-sky-100 whitespace-pre-line leading-relaxed font-serif">${door.letter}</p>`;
    } else if (door.type === 'cosmetic' && door.cosmeticId) {
      const cos = ADVENT_COSMETICS.find(c => c.id === door.cosmeticId);
      const isWorn = worn === door.cosmeticId;
      body = `
        <div class="flex items-center gap-3">
          <div class="text-4xl">${cos?.emoji}</div>
          <div>
            <div class="font-black text-lg">${cos?.name}</div>
            <div class="text-xs text-sky-200">${cos?.description}</div>
          </div>
        </div>
        ${isOpened && cos ? `<button data-wear="${isWorn ? '' : cos.id}" class="mt-3 w-full py-2 rounded-xl font-black text-sm ${isWorn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-amber-500 hover:bg-amber-400 text-slate-900'} transition">${isWorn ? 'Take it off' : 'Wear it now'}</button>` : ''}`;
    } else if (door.type === 'bonus') {
      body = `<div class="text-center"><div class="text-4xl">✨</div><div class="text-xl font-black text-emerald-400">+${door.points} bonus points</div><p class="text-xs text-sky-200 mt-1">Straight onto your score — enjoy!</p></div>`;
    } else if (door.type === 'treasure') {
      const taker = familyStore.getAdventTreasureTaker();
      body = `<div class="text-center"><div class="text-4xl">🔎</div>
        <div class="font-black text-lg">${door.title}</div>
        <p class="text-xs text-sky-200 mt-1">A golden treasure is hidden across the island, lake or ocean. First family member to find it wins <strong>+${door.treasurePoints}</strong>!${taker ? `<br>🏆 Found by <strong>${taker.name}</strong>!` : ' <span class="text-amber-300">It\'s out there right now — go find it!</span>'}</p></div>`;
    } else if (door.type === 'challenge') {
      const board = familyStore.getAdventChallengeLeaderboard();
      body = `<div class="text-center"><div class="text-4xl">⏱️</div>
        <div class="font-black text-lg">${door.challengeName || door.title}</div>
        <p class="text-xs text-sky-200 mt-1">Collect all <strong>${door.challengeCount}</strong> glowing items as fast as you can — fastest family member scores highest!${board.length ? `<br>🏅 Current best: <strong>${board[0].player.name}</strong>` : ' <span class="text-amber-300">No times yet — be first!</span>'}</p></div>`;
    } else if (door.type === 'variant') {
      body = `<div class="text-center"><div class="text-4xl">🎲</div>
        <div class="font-black text-lg">${door.title}</div>
        <p class="text-xs text-sky-200 mt-1">${door.variantLabel || 'A game twist is active today!'}</p></div>`;
    } else if (door.type === 'finale') {
      const allOpened = familyStore.getPlayers().every(p => familyStore.hasOpenedAdventDoor(p.id, day));
      body = `<div class="text-center"><div class="text-5xl">${door.icon}</div>
        <div class="text-xl font-black text-amber-300">${door.title}</div>
        <p class="text-xs text-sky-200 mt-1">The family bonus <strong>+${door.points}</strong> is earned when <strong>everyone</strong> opens their box. ${allOpened ? '🎉 The whole family did it!' : `Some boxes are still unopened.`}</p></div>`;
    }

    return `<div class="bg-slate-950/60 border-2 border-amber-400/40 rounded-2xl p-4">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs uppercase tracking-wider text-amber-300 font-bold">Door ${day} · ${this.formatDayDate(day)}</div>
        <span class="text-xs font-black ${isOpened ? 'text-emerald-400' : 'text-amber-300'}">${isOpened ? 'OPENED' : 'READY'}</span>
      </div>
      ${body}
    </div>`;
  }

  private renderWardrobe(unlocked: number, worn: string): string {
    const owned = ADVENT_COSMETICS.filter((_, i) => ((unlocked >> i) & 1) === 1);
    if (owned.length === 0) {
      return `<div class="bg-white/5 border border-white/10 rounded-2xl p-3">
        <div class="text-xs uppercase tracking-wider text-sky-300 font-bold mb-1">🧥 Your Advent Wardrobe</div>
        <p class="text-xs text-sky-200">Open cosmetic doors to unlock looks you can wear all season.</p>
      </div>`;
    }
    const items = [
      `<button data-wear="" class="px-2 py-1 rounded-lg text-xs font-bold border ${worn === '' ? 'bg-amber-500 text-slate-900 border-amber-300' : 'bg-slate-800 border-white/10'}">None</button>`,
      ...owned.map(c => `<button data-wear="${c.id}" class="px-2 py-1 rounded-lg text-xs font-bold border ${worn === c.id ? 'bg-amber-500 text-slate-900 border-amber-300' : 'bg-slate-800 border-white/10'}">${c.emoji} ${c.name}</button>`)
    ].join('');
    return `<div class="bg-white/5 border border-white/10 rounded-2xl p-3">
      <div class="text-xs uppercase tracking-wider text-sky-300 font-bold mb-2">🧥 Your Advent Wardrobe (tap to wear)</div>
      <div class="flex flex-wrap gap-1.5">${items}</div>
    </div>`;
  }

  private openDoor(day: number): void {
    const active = familyStore.getActivePlayer();
    const res: AdventOpenResult = familyStore.openAdventDoor(active.id, day, getTodayDateKey());
    this.detailDay = day;
    const door = res.door;

    if (res.ok && door) {
      soundAudio.playVictory();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      const isWorldEvent = door.type === 'treasure' || door.type === 'challenge' || door.type === 'finale';
      if (door.type === 'treasure') this.onWorldEvent({ kind: 'treasure', door });
      else if (door.type === 'challenge') this.onWorldEvent({ kind: 'challenge', door });
      else if (door.type === 'finale') this.onWorldEvent({ kind: 'finale', door });
      if (isWorldEvent) {
        this.detailDay = day;
        this.onClose(); // let the family go out and play the event
        return;
      }
    } else if (res.message) {
      soundAudio.playButtonClick();
    }
    this.render();
  }
}
