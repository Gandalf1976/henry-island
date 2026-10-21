import { GameType } from '../types';
import { soundAudio } from '../utils/audio';
import { getTimeUntilMidnight } from '../utils/dailyClock';

export class ClosedModal {
  private container: HTMLElement;
  private gameType: GameType;
  private onCloseCallback: () => void;

  constructor(container: HTMLElement, gameType: GameType, onClose: () => void) {
    this.container = container;
    this.gameType = gameType;
    this.onCloseCallback = onClose;
    soundAudio.playClosedSign();
    this.render();
  }

  public render(): void {
    const countdown = getTimeUntilMidnight();

    const gameNames: Record<GameType, { name: string; location: string; icon: string }> = {
      wordle: { name: 'Henry-Wordle', location: 'Wordle Cottage', icon: '🟩' },
      lake: { name: 'Henry-Lake', location: 'Frozen Lake', icon: '🪷' },
      quiz: { name: 'Henry-Quiz', location: 'Quiz Observatory', icon: '🧠' },
      wordLadder: { name: 'Henry Word Ladder', location: 'Word Ladder Mountain Lodge', icon: '🪜' }
    };

    const g = gameNames[this.gameType];

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <div class="relative w-full max-w-sm bg-gradient-to-b from-amber-50 to-orange-100 rounded-3xl shadow-2xl border-4 border-amber-700 p-5 flex flex-col items-center text-center">
          
          <!-- Hanging Wooden Sign -->
          <div class="relative -mt-8 mb-3 bg-red-700 text-white font-black text-sm px-6 py-2 rounded-xl shadow-lg border-2 border-red-900 transform -rotate-1 flex items-center gap-2">
            <span>🔒</span>
            <span class="tracking-widest uppercase">Closed For Today</span>
          </div>

          <div class="text-4xl my-1">${g.icon}</div>
          <h3 class="text-xl font-black text-slate-900">${g.name}</h3>
          <p class="text-xs text-amber-900 font-bold mb-3">${g.location}</p>

          <div class="bg-white/80 rounded-2xl p-4 border border-amber-300 shadow-inner mb-4 w-full">
            <p class="text-xs text-slate-700 font-medium leading-relaxed mb-2">
              You have already played <strong>${g.name}</strong> today! Each gardener can take the daily challenge once per day.
            </p>
            <div class="mt-2 py-1.5 px-3 bg-amber-200/70 rounded-xl inline-block border border-amber-400">
              <span class="text-[11px] text-amber-900 font-bold block">Next Daily Challenge in:</span>
              <span class="text-base font-black text-slate-900">${countdown.formatted}</span>
            </div>
          </div>

          <button id="closed-dismiss-btn" class="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black rounded-xl shadow-md transition">
            Got it, explore Island ▶
          </button>

        </div>
      </div>
    `;

    this.container.querySelector('#closed-dismiss-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.onCloseCallback();
    });
  }
}
