import { AVATAR_ROSTER } from '../data/avatars';
import { familyStore } from '../state/familyStore';
import { soundAudio } from '../utils/audio';
import { getTimeUntilMidnight, getTodayDateKey } from '../utils/dailyClock';
import { drawSnowman } from '../utils/snowmanRenderer';
import { DevicePlayerSelectModal } from './DevicePlayerSelectModal';
import { ManagePlayersModal } from './ManagePlayersModal';

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
    const today = getTodayDateKey();
    const unplayed = familyStore.getUnplayedGamesToday(activePlayer.id, today);
    const countdown = getTimeUntilMidnight();
    const stats = familyStore.getPlayerScoreStats(activePlayer, today);
    const isLocked = familyStore.isDeviceLocked();

    const currentAvatar = AVATAR_ROSTER.find(a => a.id === activePlayer.avatarId) || AVATAR_ROSTER[0];

    const gamesList = [
      { id: 'wordle', name: 'Henry-Wordle', desc: 'Wordle Cottage (5-Letter Daily)', icon: '🟩' },
      { id: 'lake', name: 'Henry-Lake', desc: 'Frozen Lake (120s 9-Letter Scramble)', icon: '🪷' },
      { id: 'quiz', name: 'Henry-Quiz', desc: 'Quiz Lodge (60s Teen Trivia)', icon: '🧠' },
      { id: 'wordLadder', name: 'Henry Word Ladder', desc: 'Mountain Lodge (4-Letter Word Steps)', icon: '🪜' },
      { id: 'target24', name: 'Henry Target 24', desc: 'Math Chalet (90s Make 24 Challenge)', icon: '🎯' }
    ];

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 overflow-y-auto animate-fadeIn">
        <div class="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-indigo-950 text-white rounded-3xl shadow-2xl border-4 border-amber-400/80 p-5 sm:p-6 flex flex-col items-center max-h-[92vh]">
          
          <!-- Close button -->
          <button id="close-avatar-modal-btn" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition">✕</button>

          <!-- Avatar Header & Snowman Preview -->
          <div class="flex items-center gap-4 w-full border-b border-slate-800 pb-4 mb-4">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl border-2 border-white/20 shadow-inner" style="background-color: ${currentAvatar.color}">
              ${currentAvatar.emoji}
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h3 class="font-black text-xl sm:text-2xl text-amber-200">${activePlayer.name}</h3>
                <button id="quick-edit-player-btn" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">✏️ edit</button>
              </div>
              <p class="text-xs text-slate-400 font-medium">${currentAvatar.name}</p>
              
              <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                <span class="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold rounded-full">
                  ${isLocked ? '📱 Locked to this Device' : '👤 Active Profile'}
                </span>
                <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold rounded-full">
                  🔥 ${activePlayer.streak || 1} Day Streak
                </span>
              </div>
            </div>

            <!-- Canvas Preview of Personal Snowman -->
            <div class="flex flex-col items-center">
              <canvas id="preview-snowman-canvas" width="60" height="75" class="bg-indigo-950/80 rounded-xl border border-indigo-700 shadow-inner"></canvas>
              <span class="text-[10px] text-amber-300 font-bold mt-1">Your Snowman</span>
            </div>
          </div>

          <!-- Scoring Breakdown Cards: Daily Total, Overall Total, Days Played, Average -->
          <div class="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-2.5 text-center">
              <div class="text-[11px] text-slate-400 uppercase font-bold">Today</div>
              <div class="text-lg font-black text-amber-300">${stats.todayScore} <span class="text-xs font-normal">pts</span></div>
            </div>
            <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-2.5 text-center">
              <div class="text-[11px] text-slate-400 uppercase font-bold">Days Played</div>
              <div class="text-lg font-black text-cyan-300">${stats.daysPlayed} <span class="text-xs font-normal">days</span></div>
            </div>
            <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-2.5 text-center">
              <div class="text-[11px] text-slate-400 uppercase font-bold">Overall Total</div>
              <div class="text-lg font-black text-purple-300">${stats.cumulativeScore} <span class="text-xs font-normal">pts</span></div>
            </div>
            <div class="bg-emerald-950/60 border-2 border-emerald-500/50 rounded-2xl p-2.5 text-center shadow-lg">
              <div class="text-[11px] text-emerald-300 uppercase font-black">Daily Avg ⭐</div>
              <div class="text-lg font-black text-emerald-400">${stats.averageScore} <span class="text-xs font-normal">pts</span></div>
            </div>
          </div>

          <!-- Daily Games Status: Unplayed vs Played Today -->
          <div class="w-full mb-4">
            <div class="flex justify-between items-center mb-2">
              <h4 class="font-extrabold text-xs sm:text-sm text-slate-200">Today's Mini-Games</h4>
              <span class="text-[11px] font-bold text-amber-300/80">Resets in ${countdown.hours}h ${countdown.minutes}m</span>
            </div>

            <div class="space-y-2">
              ${gamesList.map(g => {
                const isUnplayed = unplayed.includes(g.id as any);
                return `
                  <div class="p-2.5 rounded-2xl border flex items-center justify-between ${
                    isUnplayed
                      ? 'bg-emerald-900/30 border-emerald-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 opacity-80'
                  }">
                    <div class="flex items-center gap-2.5">
                      <span class="text-2xl">${g.icon}</span>
                      <div>
                        <div class="font-bold text-xs text-white">${g.name}</div>
                        <div class="text-[11px] text-slate-400">${g.desc}</div>
                      </div>
                    </div>
                    <div>
                      ${
                        isUnplayed
                          ? `<span class="px-2.5 py-1 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-sm animate-pulse">
                              ⭐ READY
                             </span>`
                          : `<span class="px-2.5 py-1 bg-slate-700 text-slate-300 font-bold text-xs rounded-xl">
                              🔒 PLAYED
                             </span>`
                      }
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Family Management Actions -->
          <div class="w-full grid grid-cols-2 gap-2 mb-3">
            <button id="switch-device-player-btn" class="bg-blue-600/80 hover:bg-blue-600 text-white font-bold p-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all">
              <span>📱</span>
              <span>Switch Device Player</span>
            </button>
            <button id="open-manage-players-btn" class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold p-2.5 rounded-xl text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all">
              <span>👥</span>
              <span>Manage Players</span>
            </button>
          </div>

          <!-- Live Cloud Sync Banner -->
          <div class="w-full bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Live Cloud Sync active — scores update automatically across family phones!</span>
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
          score: Math.round(stats.averageScore * 10), // scale visually with average score
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

    this.container.querySelector('#quick-edit-player-btn')?.addEventListener('click', () => {
      new ManagePlayersModal().show();
    });

    this.container.querySelector('#switch-device-player-btn')?.addEventListener('click', () => {
      new DevicePlayerSelectModal(() => {
        this.render();
      }).show(true);
    });

    this.container.querySelector('#open-manage-players-btn')?.addEventListener('click', () => {
      new ManagePlayersModal().show();
    });
  }
}
