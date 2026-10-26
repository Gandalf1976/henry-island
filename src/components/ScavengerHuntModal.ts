import { getDailyScavengerItems } from '../data/scavengerItems';
import { familyStore } from '../state/familyStore';
import { soundAudio } from '../utils/audio';
import { getTodayDateKey } from '../utils/dailyClock';

export class ScavengerHuntModal {
  private container: HTMLElement;
  private onCloseCallback: () => void;

  constructor(container: HTMLElement, onClose: () => void) {
    this.container = container;
    this.onCloseCallback = onClose;
    soundAudio.playButtonClick();
    this.render();
  }

  public render(): void {
    const today = getTodayDateKey();
    const todayItems = getDailyScavengerItems(today);
    const active = familyStore.getActivePlayer();
    const foundIds = familyStore.getScavengerFoundIds(active.id, today);
    const isCompleted = familyStore.isScavengerCompleted(active.id, today);
    const foundCount = foundIds.length;

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
        <div class="relative w-full max-w-md bg-gradient-to-b from-sky-950 via-slate-900 to-sky-950 border-2 border-amber-400/60 rounded-3xl shadow-2xl p-5 text-white flex flex-col max-h-[90vh]">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🧭</span>
              <div>
                <h3 class="text-lg font-black text-amber-300">Daily Scavenger Hunt</h3>
                <p class="text-xs text-sky-200">Find all 5 holiday items across the island, lake & ocean for +2 points!</p>
              </div>
            </div>
            <button id="scavenger-close-btn" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition">
              ✕
            </button>
          </div>

          <!-- Progress Bar -->
          <div class="my-4 bg-white/5 rounded-2xl p-3 border border-white/10">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-sky-300">Items Discovered Today:</span>
              <span class="text-xs font-black ${isCompleted ? 'text-emerald-400' : 'text-amber-400'}">
                ${foundCount} / 5 Found ${isCompleted ? '🎉 (+2 Pts Claimed)' : ''}
              </span>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-white/10">
              <div class="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500" style="width: ${(foundCount / 5) * 100}%"></div>
            </div>
          </div>

          <!-- Items Checklist -->
          <div class="flex-1 overflow-y-auto space-y-2 pr-1">
            ${todayItems.map(item => {
              const isFound = foundIds.includes(item.id);
              return `
                <div class="p-3 rounded-2xl border transition ${
                  isFound
                    ? 'bg-emerald-950/60 border-emerald-500/60 shadow-sm'
                    : 'bg-slate-900/70 border-white/10'
                } flex items-start gap-3">
                  <div class="text-2xl p-2 rounded-xl ${isFound ? 'bg-emerald-800/60' : 'bg-slate-800'}">
                    ${item.emoji}
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <h4 class="text-sm font-bold ${isFound ? 'text-emerald-300 line-through' : 'text-white'}">
                        ${item.name}
                      </h4>
                      <span class="text-xs font-bold ${isFound ? 'text-emerald-400' : 'text-sky-300/60'}">
                        ${isFound ? '✓ Discovered' : '❓ Hidden'}
                      </span>
                    </div>
                    <p class="text-xs mt-0.5 text-sky-200/80">
                      ${isFound ? `<span class="text-emerald-400">Found near: ${item.locationName}</span>` : `💡 ${item.hint}`}
                    </p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Bottom info -->
          <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <span class="text-[11px] text-sky-300/70">Wander near floating items on the island to collect them.</span>
            <button id="scavenger-ok-btn" class="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition">
              Got It!
            </button>
          </div>

        </div>
      </div>
    `;

    const closeBtn = this.container.querySelector('#scavenger-close-btn');
    const okBtn = this.container.querySelector('#scavenger-ok-btn');
    const close = () => {
      soundAudio.playButtonClick();
      this.onCloseCallback();
    };

    closeBtn?.addEventListener('click', close);
    okBtn?.addEventListener('click', close);
  }
}
