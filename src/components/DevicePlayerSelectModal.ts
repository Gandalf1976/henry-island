import { AVATAR_ROSTER } from '../data/avatars';
import { familyStore } from '../state/familyStore';
import { liveSyncManager } from '../utils/liveSync';
import { playSound } from '../utils/audio';

export class DevicePlayerSelectModal {
  private overlay: HTMLElement | null = null;
  private onSelectCallback?: () => void;

  constructor(onSelect?: () => void) {
    this.onSelectCallback = onSelect;
  }

  public show(forceOpen = false): void {
    // If already locked to a device player and not forced, don't show
    if (!forceOpen && familyStore.isDeviceLocked()) {
      return;
    }

    if (this.overlay) {
      this.overlay.remove();
    }

    const players = familyStore.getPlayers();
    const activeId = familyStore.getActivePlayer().id;

    const modal = document.createElement('div');
    modal.id = 'device-player-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn';

    modal.innerHTML = `
      <div class="bg-gradient-to-b from-slate-900 to-indigo-950 border-2 border-amber-400/60 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-white shadow-2xl relative max-h-[90vh] flex flex-col">
        ${forceOpen ? `
          <button id="close-select-btn" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2 text-xl">✕</button>
        ` : ''}

        <div class="text-center mb-6">
          <div class="inline-block text-5xl mb-2 animate-bounce">🏝️</div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-wide">Welcome to Henry Island!</h2>
          <p class="text-sm sm:text-base text-slate-300 mt-1">
            Who is playing on this device?
          </p>
          <p class="text-xs text-amber-200/70 mt-1">
            (We will remember your profile on this phone/browser so you won't have to choose each time!)
          </p>
        </div>

        <div class="flex-1 overflow-y-auto space-y-3 pr-1 mb-4" id="player-roster-list">
          ${players.map(p => {
            const avatar = AVATAR_ROSTER.find(a => a.id === p.avatarId) || AVATAR_ROSTER[0];
            const stats = familyStore.getPlayerScoreStats(p);
            const isCurrent = p.id === activeId;

            return `
              <button data-player-id="${p.id}" class="player-pick-card w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                isCurrent 
                  ? 'border-amber-400 bg-amber-500/20 shadow-lg shadow-amber-500/10' 
                  : 'border-slate-700/80 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800'
              }">
                <div class="flex items-center space-x-3 sm:space-x-4">
                  <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border border-white/20 shadow-inner" style="background-color: ${avatar.color}">
                    ${avatar.emoji}
                  </div>
                  <div>
                    <div class="font-bold text-base sm:text-lg text-white flex items-center space-x-2">
                      <span>${p.name}</span>
                      ${isCurrent ? '<span class="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">Selected</span>' : ''}
                    </div>
                    <div class="text-xs text-slate-400">
                      Avg: <span class="text-emerald-400 font-bold">${stats.averageScore} pts/day</span> • Total: ${stats.cumulativeScore} pts
                    </div>
                  </div>
                </div>
                <div class="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-slate-950 transition-colors">
                  Play as ${p.name} →
                </div>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Add New Player Section -->
        <div class="border-t border-slate-800 pt-4 flex flex-col sm:flex-row gap-2">
          <input id="new-player-input" type="text" placeholder="Or enter new family name..." maxlength="20" class="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400" />
          <button id="add-player-btn" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md">
            + Add & Play
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.overlay = modal;

    // Attach listeners
    modal.querySelectorAll('.player-pick-card').forEach(card => {
      card.addEventListener('click', () => {
        const pId = card.getAttribute('data-player-id');
        if (pId) {
          familyStore.lockDeviceToPlayer(pId);
          playSound('victory');
          this.close();
        }
      });
    });

    const addBtn = modal.querySelector('#add-player-btn');
    const newNameInput = modal.querySelector('#new-player-input') as HTMLInputElement;

    const handleAdd = () => {
      const name = newNameInput?.value.trim();
      if (name) {
        // pick a random avatar from roster
        const randomAvatar = AVATAR_ROSTER[Math.floor(Math.random() * AVATAR_ROSTER.length)].id;
        const newPlayer = familyStore.addPlayer(name, randomAvatar);
        familyStore.lockDeviceToPlayer(newPlayer.id);
        liveSyncManager.broadcastState('player_update', `🌟 ${name} joined Henry Island!`);
        playSound('victory');
        this.close();
      }
    };

    addBtn?.addEventListener('click', handleAdd);
    newNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
    });

    const closeBtn = modal.querySelector('#close-select-btn');
    closeBtn?.addEventListener('click', () => this.close());
  }

  public close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.onSelectCallback) {
      this.onSelectCallback();
    }
  }
}
