import { AVATAR_ROSTER } from '../data/avatars';
import { familyStore } from '../state/familyStore';
import { soundAudio } from '../utils/audio';
import { getTimeUntilMidnight, getTodayDateKey } from '../utils/dailyClock';
import { drawSnowman } from '../utils/snowmanRenderer';

export class AvatarModal {
  private container: HTMLElement;
  private onCloseCallback: () => void;

  constructor(container: HTMLElement, onClose: () => void) {
    this.container = container;
    this.onCloseCallback = onClose;
    this.render();
  }

  public render(): void {
    const activePlayer = familyStore.getActivePlayer();
    const allPlayers = familyStore.getPlayers();
    const today = getTodayDateKey();
    const unplayed = familyStore.getUnplayedGamesToday(activePlayer.id, today);
    const countdown = getTimeUntilMidnight();

    const currentAvatar = AVATAR_ROSTER.find(a => a.id === activePlayer.avatarId) || AVATAR_ROSTER[0];

    const gamesList = [
      { id: 'wordle', name: 'Henry-Wordle', desc: 'Wordle Cottage (5-Letter Daily)', icon: '🟩' },
      { id: 'lake', name: 'Henry-Lake', desc: 'Frozen Lake (120s 9-Letter Scramble)', icon: '🪷' },
      { id: 'quiz', name: 'Henry-Quiz', desc: 'Observatory (60s Teen Trivia)', icon: '🧠' }
    ];

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 overflow-y-auto">
        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-4 border-amber-400 p-5 flex flex-col items-center">
          
          <!-- Close button -->
          <button id="close-avatar-modal-btn" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition">✕</button>

          <!-- Avatar Header & Snowman Preview -->
          <div class="flex items-center gap-4 w-full border-b pb-4 mb-4">
            <div class="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-4xl shadow-inner">
              ${currentAvatar.emoji}
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h3 class="font-black text-xl text-slate-900">${activePlayer.name}</h3>
                <button id="edit-name-btn" class="text-xs text-sky-600 hover:underline font-semibold">✏️ edit</button>
              </div>
              <p class="text-xs text-slate-500 font-medium">${currentAvatar.name}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  🔥 ${activePlayer.streak} Day Streak
                </span>
                <span class="px-2 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-full">
                  ⛄ ${activePlayer.totalScore} Total Pts
                </span>
              </div>
            </div>
            <!-- Canvas Preview of Personal Snowman -->
            <div class="flex flex-col items-center">
              <canvas id="preview-snowman-canvas" width="60" height="75" class="bg-sky-50 rounded-lg border border-sky-200 shadow-sm"></canvas>
              <span class="text-[10px] text-sky-800 font-bold mt-0.5">Your Snowman</span>
            </div>
          </div>

          <!-- Switch Player Hotseat Bar -->
          <div class="w-full bg-slate-50 rounded-xl p-2.5 mb-4 border border-slate-200">
            <div class="flex justify-between items-center mb-1.5 text-xs font-bold text-slate-600">
              <span>Switch Family Member:</span>
              <button id="add-member-btn" class="text-emerald-700 hover:text-emerald-800 font-extrabold">+ Add Person</button>
            </div>
            <div class="flex gap-1.5 overflow-x-auto pb-1">
              ${allPlayers
                .map(
                  p => `
                <button data-player-id="${p.id}" class="switch-player-btn px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    p.id === activePlayer.id
                      ? 'bg-amber-400 text-slate-900 border-2 border-amber-500 shadow'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }">
                  <span>${AVATAR_ROSTER.find(a => a.id === p.avatarId)?.emoji || '⛄'}</span>
                  <span>${p.name}</span>
                </button>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Daily Games Status: Unplayed vs Played Today -->
          <div class="w-full mb-4">
            <div class="flex justify-between items-center mb-2">
              <h4 class="font-extrabold text-sm text-slate-800">Today's Island Games</h4>
              <span class="text-[11px] font-bold text-slate-500">Resets in ${countdown.hours}h ${countdown.minutes}m</span>
            </div>

            <div class="space-y-2">
              ${gamesList
                .map(g => {
                  const isUnplayed = unplayed.includes(g.id as any);
                  return `
                  <div class="p-2.5 rounded-xl border flex items-center justify-between ${
                    isUnplayed
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-slate-100 border-slate-200 opacity-80'
                  }">
                    <div class="flex items-center gap-2.5">
                      <span class="text-2xl">${g.icon}</span>
                      <div>
                        <div class="font-bold text-xs text-slate-900">${g.name}</div>
                        <div class="text-[11px] text-slate-500">${g.desc}</div>
                      </div>
                    </div>
                    <div>
                      ${
                        isUnplayed
                          ? `<span class="px-2.5 py-1 bg-emerald-600 text-white font-black text-xs rounded-lg shadow-sm animate-pulse">
                              ⭐ READY
                             </span>`
                          : `<span class="px-2.5 py-1 bg-slate-300 text-slate-700 font-bold text-xs rounded-lg">
                              🔒 PLAYED
                             </span>`
                      }
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>
          </div>

          <!-- Change Avatar Roster -->
          <div class="w-full mb-3">
            <h4 class="font-extrabold text-xs text-slate-700 mb-2">Change Avatar Character:</h4>
            <div class="grid grid-cols-6 gap-1.5">
              ${AVATAR_ROSTER.map(
                av => `
                <button data-avatar-id="${av.id}" title="${av.name}" class="select-avatar-btn p-1.5 rounded-xl border-2 flex flex-col items-center justify-center transition ${
                  av.id === activePlayer.avatarId
                    ? 'bg-amber-100 border-amber-500 shadow-md scale-105'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }">
                  <span class="text-2xl">${av.emoji}</span>
                </button>
              `
              ).join('')}
            </div>
          </div>

          <!-- Cloud Sync / Backup Options -->
          <div class="w-full flex justify-between pt-2 border-t text-xs text-slate-500">
            <button id="export-family-btn" class="hover:text-slate-800 font-semibold">📤 Share/Sync Family Data</button>
            <button id="import-family-btn" class="hover:text-slate-800 font-semibold">📥 Import Data</button>
          </div>

        </div>
      </div>
    `;

    // Render mini snowman canvas preview
    const canvas = this.container.querySelector('#preview-snowman-canvas') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 60, 75);
        drawSnowman(ctx, {
          score: activePlayer.totalScore,
          x: 30,
          y: 62,
          scale: 0.65
        });
      }
    }

    // Hook listeners
    this.container.querySelector('#close-avatar-modal-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.onCloseCallback();
    });

    this.container.querySelector('#edit-name-btn')?.addEventListener('click', () => {
      const newName = prompt('Enter your name:', activePlayer.name);
      if (newName && newName.trim()) {
        familyStore.updatePlayerName(activePlayer.id, newName.trim());
        soundAudio.playButtonClick();
        this.render();
      }
    });

    this.container.querySelector('#add-member-btn')?.addEventListener('click', () => {
      const newName = prompt('Enter new family member name:');
      if (newName && newName.trim()) {
        familyStore.addPlayer(newName.trim(), 'santa_hat_kid');
        soundAudio.playJingle();
        this.render();
      }
    });

    this.container.querySelectorAll('.switch-player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.getAttribute('data-player-id');
        if (pId) {
          familyStore.setActivePlayerId(pId);
          soundAudio.playJingle();
          this.render();
        }
      });
    });

    this.container.querySelectorAll('.select-avatar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const aId = btn.getAttribute('data-avatar-id');
        if (aId) {
          familyStore.updatePlayerAvatar(activePlayer.id, aId);
          soundAudio.playButtonClick();
          this.render();
        }
      });
    });

    this.container.querySelector('#export-family-btn')?.addEventListener('click', () => {
      const dataStr = familyStore.exportDataJson();
      navigator.clipboard?.writeText(dataStr);
      alert('Family data copied to clipboard! You can paste this on another device via "Import Data" to sync scores.');
    });

    this.container.querySelector('#import-family-btn')?.addEventListener('click', () => {
      const input = prompt('Paste the exported Family Data JSON:');
      if (input) {
        if (familyStore.importDataJson(input)) {
          alert('Family roster and scores imported successfully!');
          this.render();
        } else {
          alert('Invalid data format. Please check and try again.');
        }
      }
    });
  }
}
