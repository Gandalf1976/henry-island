import { AVATAR_ROSTER } from '../data/avatars';
import { DailyParticipantResult, familyStore, PreviousDayRankingResult } from '../state/familyStore';
import { soundAudio } from '../utils/audio';

export class PreviousDayWinnersModal {
  private container: HTMLElement;
  private onCloseCallback: () => void;
  private onBackToLeaderboardCallback?: () => void;

  constructor(
    container: HTMLElement,
    onClose: () => void,
    onBackToLeaderboard?: () => void
  ) {
    this.container = container;
    this.onCloseCallback = onClose;
    this.onBackToLeaderboardCallback = onBackToLeaderboard;
    soundAudio.playVictory();
    this.render();
  }

  public render(): void {
    const data: PreviousDayRankingResult = familyStore.getPreviousDayRanking();
    const { dateFormatted, entries, hasParticipants } = data;

    const winner: DailyParticipantResult | undefined = entries[0];
    const second: DailyParticipantResult | undefined = entries[1];
    const third: DailyParticipantResult | undefined = entries[2];

    const getAvatar = (avatarId: string) =>
      AVATAR_ROSTER.find(a => a.id === avatarId) || AVATAR_ROSTER[0];

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
        <div class="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-2xl border-4 border-amber-400/90 p-5 sm:p-6 flex flex-col items-center max-h-[92vh]">
          
          <!-- Close button -->
          <button id="close-prev-day-btn" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition">✕</button>

          <!-- Festive Header -->
          <div class="text-center mb-4">
            <div class="text-3xl mb-1 animate-bounce">🏆 👑 ❄️</div>
            <h2 class="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">Yesterday's Winners</h2>
            <p class="text-xs sm:text-sm text-slate-300 font-semibold mt-0.5">Final Standings for ${dateFormatted}</p>
          </div>

          ${
            hasParticipants && winner
              ? `
            <!-- 1st Place Champion Spotlight -->
            <div class="w-full bg-gradient-to-r from-amber-500/25 via-yellow-500/30 to-amber-500/25 border-2 border-amber-400/90 rounded-2xl p-4 mb-3 text-center shadow-lg relative overflow-hidden">
              <div class="text-[11px] font-black uppercase tracking-wider text-amber-300 mb-1 flex items-center justify-center gap-1.5">
                <span>👑</span> 1st Place Daily Champion <span>👑</span>
              </div>
              <div class="flex items-center justify-center gap-3 my-1">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border-2 border-amber-300 shadow-md" style="background-color: ${getAvatar(winner.player.avatarId).color}">
                  ${getAvatar(winner.player.avatarId).emoji}
                </div>
                <div class="text-left">
                  <div class="text-xl sm:text-2xl font-black text-white">${winner.player.name}</div>
                  <div class="text-xs text-amber-200 font-bold">Total: <span class="text-amber-400 text-base font-black">${winner.totalDayScore} pts</span></div>
                </div>
              </div>
            </div>

            <!-- Runners up (2nd & 3rd) if present -->
            ${
              second || third
                ? `
              <div class="w-full grid grid-cols-${third ? '2' : '1'} gap-2 mb-3">
                ${
                  second
                    ? `
                  <div class="bg-slate-800/80 border border-slate-600/80 rounded-xl p-2.5 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-lg">🥈</span>
                      <div class="w-8 h-8 rounded-lg flex items-center justify-center text-lg border border-white/20" style="background-color: ${getAvatar(second.player.avatarId).color}">
                        ${getAvatar(second.player.avatarId).emoji}
                      </div>
                      <div class="font-bold text-xs sm:text-sm text-white truncate max-w-[100px]">${second.player.name}</div>
                    </div>
                    <div class="text-right">
                      <span class="text-xs font-black text-slate-200">${second.totalDayScore} pts</span>
                    </div>
                  </div>
                `
                    : ''
                }
                ${
                  third
                    ? `
                  <div class="bg-amber-950/40 border border-amber-800/70 rounded-xl p-2.5 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-lg">🥉</span>
                      <div class="w-8 h-8 rounded-lg flex items-center justify-center text-lg border border-white/20" style="background-color: ${getAvatar(third.player.avatarId).color}">
                        ${getAvatar(third.player.avatarId).emoji}
                      </div>
                      <div class="font-bold text-xs sm:text-sm text-white truncate max-w-[100px]">${third.player.name}</div>
                    </div>
                    <div class="text-right">
                      <span class="text-xs font-black text-amber-300">${third.totalDayScore} pts</span>
                    </div>
                  </div>
                `
                    : ''
                }
              </div>
            `
                : ''
            }

            <!-- Full Participant List & Game Breakdowns -->
            <div class="w-full">
              <div class="flex justify-between items-center mb-1.5 px-1">
                <h4 class="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">All Participants (${entries.length})</h4>
                <span class="text-[10px] text-amber-300/80 font-medium">Daily Performance</span>
              </div>
              
              <div class="space-y-2 max-h-48 sm:max-h-56 overflow-y-auto pr-1">
                ${entries
                  .map(entry => {
                    const av = getAvatar(entry.player.avatarId);
                    const rankMedal =
                      entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
                    const rankBg =
                      entry.rank === 1
                        ? 'bg-amber-500/20 border-amber-400/80'
                        : entry.rank === 2
                        ? 'bg-slate-800/80 border-slate-600'
                        : entry.rank === 3
                        ? 'bg-amber-900/30 border-amber-700/60'
                        : 'bg-slate-900/60 border-slate-800';

                    return `
                    <div class="p-2.5 rounded-2xl border flex flex-col gap-1.5 ${rankBg} shadow-sm">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2.5">
                          <span class="text-sm font-black w-5 text-center">${rankMedal}</span>
                          <div class="w-8 h-8 rounded-xl flex items-center justify-center text-base border border-white/20" style="background-color: ${av.color}">
                            ${av.emoji}
                          </div>
                          <span class="font-bold text-sm text-white">${entry.player.name}</span>
                        </div>
                        <div class="text-right">
                          <span class="font-black text-sm text-amber-300">${entry.totalDayScore} <span class="text-[10px] text-amber-200/70">pts</span></span>
                        </div>
                      </div>

                      <!-- Badges for individual games completed -->
                      <div class="flex flex-wrap items-center gap-1.5 pl-8 text-[10px]">
                        ${
                          entry.wordleScore !== undefined
                            ? `<span class="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-semibold">🟩 Wordle: +${entry.wordleScore}</span>`
                            : ''
                        }
                        ${
                          entry.lakeScore !== undefined
                            ? `<span class="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-600/60 text-cyan-300 font-semibold">🪷 Lake: +${entry.lakeScore}</span>`
                            : ''
                        }
                        ${
                          entry.quizScore !== undefined
                            ? `<span class="px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-600/60 text-indigo-300 font-semibold">🧠 Quiz: +${entry.quizScore}</span>`
                            : ''
                        }
                        ${
                          entry.wordLadderScore !== undefined
                            ? `<span class="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-600/60 text-amber-300 font-semibold">🪜 Ladder: +${entry.wordLadderScore}</span>`
                            : ''
                        }
                        ${
                          entry.target24Score !== undefined
                            ? `<span class="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-600/60 text-red-300 font-semibold">🎯 24: +${entry.target24Score}</span>`
                            : ''
                        }
                        ${
                          entry.scavengerScore !== undefined
                            ? `<span class="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-600/60 text-purple-300 font-semibold">🔍 Hunt: +${entry.scavengerScore}</span>`
                            : ''
                        }
                      </div>
                    </div>
                  `;
                  })
                  .join('')}
              </div>
            </div>
          `
              : `
            <!-- No participants state -->
            <div class="w-full bg-slate-800/70 border border-slate-700 rounded-2xl p-6 text-center my-4">
              <div class="text-4xl mb-2">⛄ 🎿</div>
              <h3 class="text-lg font-black text-amber-300 mb-1">No Games Recorded Yesterday</h3>
              <p class="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                No family members completed daily challenges yesterday. 
                All 5 island games and the daily scavenger hunt are live today—play now to take 1st place on tomorrow's winners board!
              </p>
            </div>
          `
          }

          <!-- Action buttons -->
          <div class="mt-4 w-full flex flex-col gap-2">
            ${
              this.onBackToLeaderboardCallback
                ? `
              <button id="prev-back-leaderboard-btn" class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-2xl border border-amber-400/40 shadow transition cursor-pointer flex items-center justify-center gap-1.5 text-xs sm:text-sm">
                <span>←</span> Back to Overall Leaderboard
              </button>
            `
                : ''
            }
            <button id="prev-continue-btn" class="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black rounded-2xl shadow-lg transition transform active:scale-98 text-sm cursor-pointer">
              Continue Exploring Island ▶
            </button>
          </div>

        </div>
      </div>
    `;

    // Event listeners
    this.container.querySelector('#close-prev-day-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.onCloseCallback();
    });

    this.container.querySelector('#prev-continue-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.onCloseCallback();
    });

    if (this.onBackToLeaderboardCallback) {
      this.container.querySelector('#prev-back-leaderboard-btn')?.addEventListener('click', () => {
        soundAudio.playButtonClick();
        this.onBackToLeaderboardCallback!();
      });
    }
  }
}
