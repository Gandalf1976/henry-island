import { familyStore, RaceLeaderboardEntry } from '../state/familyStore';
import { formatRaceTime } from '../utils/raceCourse';
import { soundAudio } from '../utils/audio';

/**
 * Post-race results screen: your millisecond time, the live daily
 * leaderboard (re-ranks as family members set faster times — points lock
 * at midnight), and a quick way to race again.
 */
export class RaceResultsModal {
  private container: HTMLElement;
  private onCloseCallback: () => void;
  private onRaceAgainCallback: () => void;

  constructor(
    container: HTMLElement,
    timeMs: number,
    isPersonalBest: boolean,
    onClose: () => void,
    onRaceAgain: () => void
  ) {
    this.container = container;
    this.onCloseCallback = onClose;
    this.onRaceAgainCallback = onRaceAgain;
    this.render(timeMs, isPersonalBest);
  }

  private render(timeMs: number, isPersonalBest: boolean): void {
    const board: RaceLeaderboardEntry[] = familyStore.getRaceLeaderboard();
    const activePlayer = familyStore.getActivePlayer();
    const myEntry = board.find(e => e.player.id === activePlayer.id);
    const myRank = myEntry?.rank ?? '—';

    const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
        <div class="relative w-full max-w-lg bg-gradient-to-b from-sky-950 via-slate-900 to-indigo-950 rounded-3xl shadow-2xl border-4 border-sky-400 p-5 sm:p-6 text-white flex flex-col items-center max-h-[92vh] overflow-y-auto">

          <div class="text-4xl mb-1">🏁 ⛵ 🏆</div>
          <h3 class="text-2xl sm:text-3xl font-black text-sky-300 mb-1">RACE COMPLETE!</h3>

          <div class="my-2 bg-slate-950/70 border-2 border-sky-500/60 rounded-2xl px-6 py-3 text-center">
            <div class="text-[11px] uppercase tracking-wider text-sky-300 font-bold">Your Time</div>
            <div class="text-3xl sm:text-4xl font-black font-mono text-amber-300">${formatRaceTime(timeMs)}</div>
            <div class="mt-1 flex items-center justify-center gap-2 text-xs font-bold">
              <span class="text-sky-200">Position: ${myRank}</span>
              <span class="text-emerald-300">+${myEntry?.points ?? 0} pts</span>
              ${isPersonalBest ? '<span class="text-amber-300 animate-pulse">★ NEW PERSONAL BEST!</span>' : ''}
            </div>
          </div>

          <div class="w-full my-2">
            <div class="flex justify-between items-center px-1 mb-1.5">
              <h4 class="font-extrabold text-xs uppercase tracking-wider text-sky-300">Today's Race Board</h4>
              <span class="text-[10px] text-emerald-300 font-bold">Live re-ranking 🟢 (locks at midnight)</span>
            </div>

            <div class="space-y-1.5">
              ${board
                .map(entry => {
                  const isMe = entry.player.id === activePlayer.id;
                  return `
                    <div class="flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
                      isMe
                        ? 'bg-amber-500/20 border-amber-400'
                        : entry.rank <= 3
                          ? 'bg-sky-900/50 border-sky-600/60'
                          : 'bg-slate-900/60 border-slate-700'
                    }">
                      <div class="flex items-center gap-2.5">
                        <span class="font-black w-8 text-center text-sm">${medal(entry.rank)}</span>
                        <span class="font-black ${isMe ? 'text-amber-300' : 'text-white'}">${entry.player.name}${isMe ? ' (you)' : ''}</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="font-mono font-bold text-sky-200">${formatRaceTime(entry.timeMs)}</span>
                        <span class="font-black text-emerald-300 w-12 text-right">+${entry.points} pts</span>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>

            <p class="text-[10px] text-slate-400 mt-2 text-center">
              Fastest of the day scores 15 pts • 2nd 12 • 3rd 10 • 4th 8 • 5th 5 • 6th 3 • ties share the rank & points.
            </p>
          </div>

          <div class="flex gap-2 w-full mt-3">
            <button id="race-again-btn" class="flex-1 py-3 bg-gradient-to-r from-sky-400 to-blue-500 hover:brightness-110 font-black text-slate-950 rounded-xl shadow-lg transition">
              🏁 Race Again
            </button>
            <button id="race-return-btn" class="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 font-black text-white rounded-xl shadow-lg transition">
              Return to Island 🏝️
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#race-again-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.onCloseCallback();
      this.onRaceAgainCallback();
    });

    this.container.querySelector('#race-return-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.onCloseCallback();
    });
  }
}
