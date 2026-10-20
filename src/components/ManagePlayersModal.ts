import { AVATAR_ROSTER } from '../data/avatars';
import { familyStore } from '../state/familyStore';
import { liveSyncManager } from '../utils/liveSync';
import { playSound } from '../utils/audio';

export class ManagePlayersModal {
  private overlay: HTMLElement | null = null;
  private editingPlayerId: string | null = null;

  public show(): void {
    if (this.overlay) this.overlay.remove();
    this.render();
  }

  private render(): void {
    const players = familyStore.getPlayers();
    const activePlayer = familyStore.getActivePlayer();
    const lockedPlayerId = familyStore.getLockedPlayerId();

    const modal = document.createElement('div');
    modal.id = 'manage-players-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn';

    modal.innerHTML = `
      <div class="bg-gradient-to-b from-slate-900 to-indigo-950 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-white shadow-2xl relative max-h-[90vh] flex flex-col">
        <button id="close-manage-btn" class="absolute top-4 right-4 text-slate-400 hover:text-white p-2 text-xl">✕</button>

        <div class="text-center mb-5">
          <div class="inline-block text-4xl mb-1">👥</div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-emerald-300">Manage Family Members</h2>
          <p class="text-xs sm:text-sm text-slate-300 mt-1">
            Edit player names, change avatars, switch active players, or add new family members.
          </p>
        </div>

        <!-- Player List -->
        <div class="flex-1 overflow-y-auto space-y-3 pr-1 mb-4" id="manage-players-list">
          ${players.map(p => {
            const avatar = AVATAR_ROSTER.find(a => a.id === p.avatarId) || AVATAR_ROSTER[0];
            const isEditing = this.editingPlayerId === p.id;
            const isDeviceLocked = lockedPlayerId === p.id;
            const isCurrentActive = activePlayer.id === p.id;
            const stats = familyStore.getPlayerScoreStats(p);

            if (isEditing) {
              return `
                <div class="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-950/40 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase text-emerald-300">Editing Profile</span>
                    <button class="cancel-edit-btn text-xs text-slate-400 hover:text-white">Cancel</button>
                  </div>
                  <div>
                    <label class="block text-xs text-slate-300 mb-1">Player Name:</label>
                    <input id="edit-name-input" type="text" value="${p.name}" maxlength="20" class="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400" />
                  </div>
                  <div>
                    <label class="block text-xs text-slate-300 mb-1">Choose Avatar:</label>
                    <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      ${AVATAR_ROSTER.map(av => `
                        <button type="button" data-avatar-id="${av.id}" class="select-avatar-pill p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                          av.id === p.avatarId ? 'border-amber-400 bg-amber-500/20 shadow-md' : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
                        }">
                          <span class="text-2xl">${av.emoji}</span>
                          <span class="text-[10px] text-slate-300 mt-1 truncate w-full">${av.name.split(' ')[0]}</span>
                        </button>
                      `).join('')}
                    </div>
                  </div>
                  <div class="flex gap-2 justify-end pt-2">
                    <button class="save-edit-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs">
                      Save Changes
                    </button>
                  </div>
                </div>
              `;
            }

            return `
              <div class="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 transition-all">
                <div class="flex items-center space-x-3">
                  <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border border-white/20 shadow-inner" style="background-color: ${avatar.color}">
                    ${avatar.emoji}
                  </div>
                  <div>
                    <div class="font-bold text-sm sm:text-base text-white flex items-center space-x-2">
                      <span>${p.name}</span>
                      ${isDeviceLocked ? '<span class="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">This Device</span>' : ''}
                      ${isCurrentActive && !isDeviceLocked ? '<span class="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">Active</span>' : ''}
                    </div>
                    <div class="text-xs text-slate-400">
                      Avg: <span class="text-emerald-400 font-bold">${stats.averageScore} pts/day</span> • Total: ${stats.cumulativeScore} pts (${stats.daysPlayed} days)
                    </div>
                  </div>
                </div>

                <div class="flex items-center space-x-2">
                  <button data-player-id="${p.id}" class="edit-player-btn text-xs bg-slate-700 hover:bg-slate-600 px-2.5 py-1.5 rounded-xl font-medium transition-colors" title="Edit player">
                    ✏️ Edit
                  </button>
                  ${!isDeviceLocked ? `
                    <button data-player-id="${p.id}" class="lock-device-btn text-xs bg-blue-600/80 hover:bg-blue-600 px-2.5 py-1.5 rounded-xl font-medium transition-colors" title="Set as this device's player">
                      📱 Set Device
                    </button>
                  ` : ''}
                  ${players.length > 1 ? `
                    <button data-player-id="${p.id}" class="delete-player-btn text-xs text-rose-400 hover:bg-rose-500/20 px-2 py-1.5 rounded-xl transition-colors" title="Remove player">
                      🗑️
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Add New Player Form -->
        <div class="border-t border-slate-800 pt-4 flex gap-2">
          <input id="add-new-name-input" type="text" placeholder="New family member name..." maxlength="20" class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400" />
          <button id="add-new-btn" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md">
            + Add Player
          </button>
        </div>
      </div>
    `;

    if (this.overlay) this.overlay.remove();
    document.body.appendChild(modal);
    this.overlay = modal;

    // Attach listeners
    modal.querySelector('#close-manage-btn')?.addEventListener('click', () => this.close());

    modal.querySelectorAll('.edit-player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.editingPlayerId = btn.getAttribute('data-player-id');
        this.render();
      });
    });

    modal.querySelector('.cancel-edit-btn')?.addEventListener('click', () => {
      this.editingPlayerId = null;
      this.render();
    });

    // Avatar selection in edit mode
    let selectedAvatarId = players.find(p => p.id === this.editingPlayerId)?.avatarId || AVATAR_ROSTER[0].id;
    modal.querySelectorAll('.select-avatar-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedAvatarId = btn.getAttribute('data-avatar-id') || selectedAvatarId;
        modal.querySelectorAll('.select-avatar-pill').forEach(b => {
          b.classList.remove('border-amber-400', 'bg-amber-500/20');
          b.classList.add('border-slate-700', 'bg-slate-800/80');
        });
        btn.classList.remove('border-slate-700', 'bg-slate-800/80');
        btn.classList.add('border-amber-400', 'bg-amber-500/20');
      });
    });

    modal.querySelector('.save-edit-btn')?.addEventListener('click', () => {
      if (!this.editingPlayerId) return;
      const nameInput = modal.querySelector('#edit-name-input') as HTMLInputElement;
      const newName = nameInput?.value.trim();
      if (newName) {
        familyStore.updatePlayer(this.editingPlayerId, newName, selectedAvatarId);
        liveSyncManager.broadcastState('player_update', `✏️ Updated player ${newName}`);
        playSound('victory');
        this.editingPlayerId = null;
        this.render();
      }
    });

    modal.querySelectorAll('.lock-device-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.getAttribute('data-player-id');
        if (pId) {
          familyStore.lockDeviceToPlayer(pId);
          playSound('victory');
          this.render();
        }
      });
    });

    modal.querySelectorAll('.delete-player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.getAttribute('data-player-id');
        const p = players.find(x => x.id === pId);
        if (p && confirm(`Are you sure you want to remove ${p.name}?`)) {
          familyStore.deletePlayer(p.id);
          liveSyncManager.broadcastState('player_update');
          this.render();
        }
      });
    });

    modal.querySelector('#add-new-btn')?.addEventListener('click', () => {
      const input = modal.querySelector('#add-new-name-input') as HTMLInputElement;
      const name = input?.value.trim();
      if (name) {
        const randomAvatar = AVATAR_ROSTER[Math.floor(Math.random() * AVATAR_ROSTER.length)].id;
        familyStore.addPlayer(name, randomAvatar);
        liveSyncManager.broadcastState('player_update', `🌟 ${name} joined Henry Island!`);
        playSound('victory');
        this.render();
      }
    });
  }

  public close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
