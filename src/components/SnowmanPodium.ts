import { AVATAR_ROSTER } from '../data/avatars';
import { familyStore } from '../state/familyStore';
import { soundAudio } from '../utils/audio';
import { drawSnowman } from '../utils/snowmanRenderer';

export class SnowmanPodiumModal {
  private container: HTMLElement;
  private onCloseCallback: () => void;

  constructor(container: HTMLElement, onClose: () => void) {
    this.container = container;
    this.onCloseCallback = onClose;
    this.render();
  }

  public render(): void {
    const leaderboard = familyStore.getLeaderboard();

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 overflow-y-auto">
        <div class="relative w-full max-w-lg bg-gradient-to-b from-sky-50 to-white rounded-3xl shadow-2xl border-4 border-amber-400 p-5 flex flex-col items-center">
          
          <!-- Close button -->
          <button id="close-podium-btn" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition">✕</button>

          <!-- Title -->
          <div class="text-center mb-3">
            <div class="text-3xl mb-1">⛄ 🏆 🎄</div>
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">Henry Island Snowman Podium</h2>
            <p class="text-xs text-slate-600 font-semibold">Larger Snowman = Higher Daily Accumulated Score!</p>
          </div>

          <!-- Interactive Podium Canvas -->
          <div class="w-full bg-gradient-to-b from-sky-100 to-sky-200 rounded-2xl p-2 border-2 border-sky-300 shadow-inner flex justify-center mb-4">
            <canvas id="podium-stage-canvas" width="440" height="170" class="w-full max-w-md"></canvas>
          </div>

          <!-- Full Family Roster Scoreboard -->
          <div class="w-full">
            <h4 class="font-extrabold text-xs uppercase tracking-wider text-slate-500 mb-2">All Island Gardeners</h4>
            
            <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
              ${leaderboard
                .map(entry => {
                  const av = AVATAR_ROSTER.find(a => a.id === entry.player.avatarId) || AVATAR_ROSTER[0];
                  const rankMedal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
                  const rankBg =
                    entry.rank === 1
                      ? 'bg-amber-100/90 border-amber-300'
                      : entry.rank === 2
                      ? 'bg-slate-100 border-slate-300'
                      : entry.rank === 3
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-slate-200';

                  return `
                  <div class="p-2.5 rounded-xl border flex items-center justify-between ${rankBg} shadow-sm">
                    <div class="flex items-center gap-3">
                      <span class="text-lg font-black w-6 text-center">${rankMedal}</span>
                      <span class="text-2xl">${av.emoji}</span>
                      <div>
                        <div class="font-black text-sm text-slate-900">${entry.player.name}</div>
                        <div class="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>🔥 ${entry.player.streak}d streak</span>
                          <span>•</span>
                          <span>Last: ${entry.player.lastPlayedDate || 'Never'}</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="text-right">
                        <div class="font-black text-base text-emerald-700">${entry.player.totalScore} pts</div>
                        <div class="text-[10px] text-slate-400 font-bold">Accumulated</div>
                      </div>
                      <canvas data-player-id="${entry.player.id}" class="row-snowman-canvas" width="38" height="48"></canvas>
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>
          </div>

          <!-- Dismiss button -->
          <button id="podium-dismiss-btn" class="mt-4 w-full py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-900 font-black rounded-xl shadow-md transition">
            Continue Exploring Island ▶
          </button>

        </div>
      </div>
    `;

    // Render podium canvas
    const canvas = this.container.querySelector('#podium-stage-canvas') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 440, 170);

        // Pedestal blocks
        const slots = [
          { rank: 2, label: '2nd', x: 120, y: 155, h: 48, color: '#94a3b8' },
          { rank: 1, label: '1st', x: 220, y: 155, h: 72, color: '#f59e0b' },
          { rank: 3, label: '3rd', x: 320, y: 155, h: 32, color: '#b45309' }
        ];

        slots.forEach(slot => {
          // Pedestal
          ctx.fillStyle = slot.color;
          ctx.fillRect(slot.x - 38, slot.y - slot.h, 76, slot.h);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(slot.x - 38, slot.y - slot.h, 76, slot.h);

          // Label
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(slot.label, slot.x, slot.y - slot.h * 0.4);

          // Find player
          const entry = leaderboard.find(l => l.rank === slot.rank);
          if (entry) {
            drawSnowman(ctx, {
              score: entry.player.totalScore,
              x: slot.x,
              y: slot.y - slot.h - 10,
              scale: 0.95
            });

            // Name
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(entry.player.name, slot.x, slot.y + 12);
          }
        });
      }
    }

    // Render row mini-snowmen
    this.container.querySelectorAll('.row-snowman-canvas').forEach(c => {
      const pId = c.getAttribute('data-player-id');
      const player = leaderboard.find(l => l.player.id === pId)?.player;
      if (player) {
        const rowCtx = (c as HTMLCanvasElement).getContext('2d');
        if (rowCtx) {
          drawSnowman(rowCtx, {
            score: player.totalScore,
            x: 19,
            y: 40,
            scale: 0.45
          });
        }
      }
    });

    // Listeners
    this.container.querySelector('#close-podium-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.onCloseCallback();
    });

    this.container.querySelector('#podium-dismiss-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.onCloseCallback();
    });
  }
}
