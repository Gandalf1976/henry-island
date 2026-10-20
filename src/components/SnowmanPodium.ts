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
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 overflow-y-auto animate-fadeIn">
        <div class="relative w-full max-w-xl bg-gradient-to-b from-slate-900 to-indigo-950 text-white rounded-3xl shadow-2xl border-4 border-amber-400/80 p-5 sm:p-6 flex flex-col items-center max-h-[92vh]">
          
          <!-- Close button -->
          <button id="close-podium-btn" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition">✕</button>

          <!-- Title -->
          <div class="text-center mb-3">
            <div class="text-3xl mb-1">⛄ 🏆 🎄</div>
            <h2 class="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">Henry Island Leaderboard</h2>
            <p class="text-xs sm:text-sm text-slate-300 font-medium">Ranked by Daily Average Score (Total Points ÷ Days Played)</p>
          </div>

          <!-- Interactive Podium Canvas -->
          <div class="w-full bg-gradient-to-b from-indigo-950/90 to-slate-900/90 rounded-2xl p-2.5 border-2 border-indigo-700/60 shadow-inner flex justify-center mb-4">
            <canvas id="podium-stage-canvas" width="460" height="180" class="w-full max-w-lg"></canvas>
          </div>

          <!-- Full Family Roster Scoreboard -->
          <div class="w-full">
            <div class="flex justify-between items-center mb-2 px-1">
              <h4 class="font-extrabold text-xs uppercase tracking-wider text-slate-400">All Family Members</h4>
              <span class="text-[11px] text-emerald-400 font-semibold">Live Real-time Sync 🟢</span>
            </div>
            
            <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
              ${leaderboard.map(entry => {
                const av = AVATAR_ROSTER.find(a => a.id === entry.player.avatarId) || AVATAR_ROSTER[0];
                const rankMedal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
                const rankBg =
                  entry.rank === 1
                    ? 'bg-amber-500/20 border-amber-400/80'
                    : entry.rank === 2
                    ? 'bg-slate-800/80 border-slate-600'
                    : entry.rank === 3
                    ? 'bg-amber-900/30 border-amber-700/60'
                    : 'bg-slate-900/60 border-slate-800';

                return `
                  <div class="p-3 rounded-2xl border flex items-center justify-between ${rankBg} shadow-md">
                    <div class="flex items-center gap-3">
                      <span class="text-lg font-black w-6 text-center">${rankMedal}</span>
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl border border-white/20 shadow-inner" style="background-color: ${av.color}">
                        ${av.emoji}
                      </div>
                      <div>
                        <div class="font-black text-sm text-white">${entry.player.name}</div>
                        <div class="text-[11px] text-slate-400 flex items-center gap-2">
                          <span class="text-amber-300">Today: <strong>${entry.stats.todayScore} pts</strong></span>
                          <span>•</span>
                          <span>${entry.stats.daysPlayed}d played</span>
                          <span>•</span>
                          <span>Total: ${entry.stats.cumulativeScore}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                      <div class="text-right">
                        <div class="font-black text-base text-emerald-400">${entry.stats.averageScore} <span class="text-[10px] text-emerald-300/80">pts/day</span></div>
                        <div class="text-[10px] text-slate-400 font-bold uppercase">Average ⭐</div>
                      </div>
                      <canvas data-player-id="${entry.player.id}" class="row-snowman-canvas" width="38" height="48"></canvas>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Dismiss button -->
          <button id="podium-dismiss-btn" class="mt-4 w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black rounded-2xl shadow-lg transition transform active:scale-98">
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
        ctx.clearRect(0, 0, 460, 180);

        // Pedestal blocks
        const slots = [
          { rank: 2, label: '2nd', x: 120, y: 165, h: 50, color: '#64748b' },
          { rank: 1, label: '1st', x: 230, y: 165, h: 76, color: '#f59e0b' },
          { rank: 3, label: '3rd', x: 340, y: 165, h: 36, color: '#92400e' }
        ];

        slots.forEach(slot => {
          // Pedestal box
          ctx.fillStyle = slot.color;
          ctx.beginPath();
          ctx.roundRect(slot.x - 42, slot.y - slot.h, 84, slot.h, [8, 8, 0, 0]);
          ctx.fill();
          ctx.strokeStyle = '#ffffff44';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Label
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(slot.label, slot.x, slot.y - slot.h * 0.45);

          // Find player
          const entry = leaderboard.find(l => l.rank === slot.rank);
          if (entry) {
            drawSnowman(ctx, {
              score: Math.round(entry.stats.averageScore * 10),
              x: slot.x,
              y: slot.y - slot.h - 10,
              scale: 0.95
            });

            // Name
            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(entry.player.name, slot.x, slot.y + 12);
          }
        });
      }
    }

    // Render row mini-snowmen
    this.container.querySelectorAll('.row-snowman-canvas').forEach(c => {
      const pId = c.getAttribute('data-player-id');
      const entry = leaderboard.find(l => l.player.id === pId);
      if (entry) {
        const rowCtx = (c as HTMLCanvasElement).getContext('2d');
        if (rowCtx) {
          drawSnowman(rowCtx, {
            score: Math.round(entry.stats.averageScore * 10),
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
