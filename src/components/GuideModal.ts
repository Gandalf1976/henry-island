import { soundAudio } from '../utils/audio';

export class GuideModal {
  private container: HTMLElement;
  private onCloseCallback: () => void;
  private activeTab: 'navigation' | 'games' | 'scoring' | 'island' = 'navigation';

  constructor(container: HTMLElement, onClose: () => void) {
    this.container = container;
    this.onCloseCallback = onClose;
    soundAudio.playButtonClick();
    this.render();
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fade-in">
        <div class="relative w-full max-w-2xl bg-gradient-to-b from-sky-950 via-slate-900 to-indigo-950 border-4 border-amber-400/80 rounded-3xl shadow-2xl p-5 sm:p-6 text-white flex flex-col max-h-[92vh]">
          
          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div class="flex items-center gap-3">
              <span class="text-3xl">📖</span>
              <div>
                <h3 class="text-xl sm:text-2xl font-black text-amber-300 tracking-tight flex items-center gap-2">
                  <span>How to Play & Island Guide</span>
                </h3>
                <p class="text-xs text-sky-200">Welcome to Henry Island! Here's everything you need to know.</p>
              </div>
            </div>
            <button id="guide-close-btn" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition">
              ✕
            </button>
          </div>

          <!-- Navigation Tabs -->
          <div class="flex items-center gap-1.5 sm:gap-2 my-3 p-1 bg-slate-950/60 rounded-2xl border border-white/10 shrink-0 overflow-x-auto">
            <button id="tab-nav" class="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              this.activeTab === 'navigation' ? 'bg-amber-400 text-slate-950 shadow-md font-black' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }">
              <span>🎮</span>
              <span>Controls</span>
            </button>

            <button id="tab-games" class="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              this.activeTab === 'games' ? 'bg-amber-400 text-slate-950 shadow-md font-black' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }">
              <span>🕹️</span>
              <span>Games</span>
            </button>

            <button id="tab-scoring" class="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              this.activeTab === 'scoring' ? 'bg-amber-400 text-slate-950 shadow-md font-black' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }">
              <span>🏆</span>
              <span>Scoring</span>
            </button>

            <button id="tab-island" class="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              this.activeTab === 'island' ? 'bg-amber-400 text-slate-950 shadow-md font-black' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }">
              <span>🏝️</span>
              <span>Island Sights</span>
            </button>
          </div>

          <!-- Tab Content Body -->
          <div class="flex-1 overflow-y-auto pr-1 text-sm space-y-4">
            ${this.renderTabContent()}
          </div>

          <!-- Footer Action -->
          <div class="pt-3 border-t border-white/10 mt-3 flex items-center justify-between text-xs text-sky-300 shrink-0">
            <span>🎄 Have fun exploring the island!</span>
            <button id="guide-done-btn" class="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs shadow-lg transition">
              Got It, Let's Play! ✨
            </button>
          </div>

        </div>
      </div>
    `;

    this.wireEvents();
  }

  private renderTabContent(): string {
    if (this.activeTab === 'navigation') {
      return `
        <!-- Section 1: Controls -->
        <div class="space-y-3">
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <h4 class="font-black text-amber-300 text-sm flex items-center gap-2 mb-2">
              <span>💻</span>
              <span>Desktop & Laptop Controls</span>
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div class="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/5">
                <span class="px-2 py-1 bg-amber-400 text-slate-950 font-black rounded-lg text-[10px]">W A S D / ↑ ← ↓ →</span>
                <span>Walk around the island</span>
              </div>
              <div class="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/5">
                <span class="px-2 py-1 bg-amber-400 text-slate-950 font-black rounded-lg text-[10px]">Space / Enter</span>
                <span>Enter game or talk</span>
              </div>
              <div class="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/5">
                <span class="px-2 py-1 bg-sky-400 text-slate-950 font-black rounded-lg text-[10px]">Mouse Wheel</span>
                <span>Smooth zoom in / out</span>
              </div>
              <div class="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/5">
                <span class="px-2 py-1 bg-sky-400 text-slate-950 font-black rounded-lg text-[10px]">+ / − Buttons</span>
                <span>One-tap zoom controls</span>
              </div>
            </div>
          </div>

          <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <h4 class="font-black text-amber-300 text-sm flex items-center gap-2 mb-2">
              <span>📱</span>
              <span>Mobile & Tablet Controls</span>
            </h4>
            <div class="space-y-2 text-xs">
              <div class="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/5">
                <span class="text-base">🕹️</span>
                <span><strong>Virtual Joystick</strong>: Appears on the bottom-left on touch devices. Drag to walk in any direction.</span>
              </div>
              <div class="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/5">
                <span class="text-base">👆</span>
                <span><strong>Tap to Interact</strong>: Walk near any building or sign and tap the golden action prompt that pops up.</span>
              </div>
              <div class="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/5">
                <span class="text-base">🤏</span>
                <span><strong>Pinch to Zoom</strong>: Pinch with two fingers to easily adjust your view of the island.</span>
              </div>
            </div>
          </div>

          <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <h4 class="font-black text-amber-300 text-sm flex items-center gap-2 mb-2">
              <span>🚀</span>
              <span>Fast-Travel Quick Dock</span>
            </h4>
            <p class="text-xs text-sky-200 mb-2">Want to jump right into the action? Use the travel dock at the bottom of the screen to instantly teleport to any location:</p>
            <div class="flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span class="px-2 py-1 rounded-lg bg-emerald-900/80 border border-emerald-500 text-emerald-200">🟩 Wordle</span>
              <span class="px-2 py-1 rounded-lg bg-amber-800/80 border border-amber-500 text-amber-200">🪜 Ladder</span>
              <span class="px-2 py-1 rounded-lg bg-amber-700/80 border border-amber-400 text-amber-100">⛄ Podium</span>
              <span class="px-2 py-1 rounded-lg bg-amber-900/80 border border-amber-600 text-amber-200">📌 Board</span>
              <span class="px-2 py-1 rounded-lg bg-sky-800/80 border border-sky-400 text-sky-200">🪷 Lake</span>
              <span class="px-2 py-1 rounded-lg bg-indigo-900/80 border border-indigo-500 text-indigo-200">🧠 Quiz</span>
              <span class="px-2 py-1 rounded-lg bg-teal-900/80 border border-teal-500 text-teal-200">🧝 Elves</span>
              <span class="px-2 py-1 rounded-lg bg-rose-900/80 border border-rose-500 text-rose-200">🔥 Hearth</span>
            </div>
          </div>

          <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <h4 class="font-black text-amber-300 text-sm flex items-center gap-2 mb-1.5">
              <span>👤</span>
              <span>Your Avatar & Daily Status</span>
            </h4>
            <p class="text-xs text-slate-300">
              When you first visit on your phone or computer, select who you are. The site remembers you on that device.
              Click your <strong>Avatar Button</strong> in the top-right header at any time to see which games you've completed today, what is left to play, and your current Snowman preview!
            </p>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'games') {
      return `
        <!-- Section 2: Mini Games -->
        <div class="space-y-3">
          <div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200">
            ⭐ <strong>Daily Rule</strong>: Each player can play each mini-game <strong>only once per day</strong>! Once completed, a red <strong>CLOSED</strong> sign appears showing your score until midnight.
          </div>

          <!-- Game 1: Wordle -->
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <div class="flex items-center justify-between mb-1">
              <h4 class="font-black text-emerald-300 text-sm flex items-center gap-1.5">
                <span>🟩</span>
                <span>Henry-Wordle</span>
              </h4>
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-500 text-emerald-200 font-bold">Wordle Lodge (North)</span>
            </div>
            <p class="text-xs text-slate-300 mb-2">Guess the daily secret 5-letter holiday word in 6 attempts or fewer!</p>
            <div class="grid grid-cols-3 gap-1.5 text-[11px] text-center">
              <div class="p-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60">
                <span class="block font-black text-emerald-400">🟩 Green</span>
                <span class="text-slate-300 text-[10px]">Right letter, right spot</span>
              </div>
              <div class="p-1.5 rounded-xl bg-amber-950/80 border border-amber-500/60">
                <span class="block font-black text-amber-400">🟨 Yellow</span>
                <span class="text-slate-300 text-[10px]">Right letter, wrong spot</span>
              </div>
              <div class="p-1.5 rounded-xl bg-slate-900/80 border border-slate-700">
                <span class="block font-black text-slate-400">⬛ Gray</span>
                <span class="text-slate-300 text-[10px]">Not in the word</span>
              </div>
            </div>
          </div>

          <!-- Game 2: Word Ladder -->
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <div class="flex items-center justify-between mb-1">
              <h4 class="font-black text-amber-300 text-sm flex items-center gap-1.5">
                <span>🪜</span>
                <span>Henry Word Ladder</span>
              </h4>
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-amber-900/60 border border-amber-500 text-amber-200 font-bold">Mountain Lodge (SE)</span>
            </div>
            <p class="text-xs text-slate-300 mb-1.5">Transform a starting 4-letter word into the target word (e.g. <code>COLD ➔ WARM</code>).</p>
            <ul class="list-disc list-inside text-xs text-slate-300 space-y-1">
              <li>Change <strong>exactly one letter</strong> at a time.</li>
              <li>Every intermediate word must be a real 4-letter English word in our 5,000+ word dictionary.</li>
              <li>Complete it in 3 to 6 steps!</li>
            </ul>
          </div>

          <!-- Game 3: Lake -->
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <div class="flex items-center justify-between mb-1">
              <h4 class="font-black text-sky-300 text-sm flex items-center gap-1.5">
                <span>🪷</span>
                <span>Henry-Lake</span>
              </h4>
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-sky-900/60 border border-sky-400 text-sky-200 font-bold">Sparkling Lake (East)</span>
            </div>
            <p class="text-xs text-slate-300 mb-1.5">You are given 9 scrambled letter tiles on a 120-second timer!</p>
            <ul class="list-disc list-inside text-xs text-slate-300 space-y-1">
              <li>Make as many valid English words (3+ letters) as you can before the clock runs out.</li>
              <li>Each found word lands on a floating lilypad across the lake.</li>
              <li><strong>Big Bonus</strong>: Figure out the full 9-letter anagram for an extra 5 points!</li>
            </ul>
          </div>

          <!-- Game 4: Quiz -->
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <div class="flex items-center justify-between mb-1">
              <h4 class="font-black text-indigo-300 text-sm flex items-center gap-1.5">
                <span>🧠</span>
                <span>Henry-Quiz</span>
              </h4>
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-500 text-indigo-200 font-bold">Quiz Lodge (West)</span>
            </div>
            <p class="text-xs text-slate-300 mb-1.5">10 rapid-fire multiple-choice questions on a 60-second timer.</p>
            <p class="text-xs text-slate-300">Covers Geography, Science & Nature, Entertainment, Sport, General Knowledge, and Music!</p>
          </div>

          <!-- Bonus: Scavenger Hunt -->
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <div class="flex items-center justify-between mb-1">
              <h4 class="font-black text-teal-300 text-sm flex items-center gap-1.5">
                <span>🧭</span>
                <span>Daily Scavenger Hunt</span>
              </h4>
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-teal-900/60 border border-teal-500 text-teal-200 font-bold">All Across Island</span>
            </div>
            <p class="text-xs text-slate-300">
              5 special holiday items are hidden on the island each day (🔔 Bell, 🍪 Cookie, 🎁 Gift, 🧣 Scarf, ⭐ Star). Walk near them to pick them up. Find all 5 for <strong>+2 bonus points</strong>!
            </p>
          </div>

          <!-- Dad Reset -->
          <div class="bg-red-950/40 border border-red-500/40 rounded-2xl p-3">
            <h4 class="font-black text-red-300 text-xs flex items-center gap-1.5 mb-1">
              <span>🔄</span>
              <span>Dad's Special Reset Button</span>
            </h4>
            <p class="text-xs text-slate-300">
              If Dad is logged in, a red <strong>"Reset Day"</strong> button appears in the top bar. Dad can reset today's puzzles to test or replay them (returning his score for the day to 0).
            </p>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'scoring') {
      return `
        <!-- Section 3: Scoring System -->
        <div class="space-y-3">
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <h4 class="font-black text-amber-300 text-sm mb-2 flex items-center gap-2">
              <span>📊</span>
              <span>Point Breakdown per Game</span>
            </h4>
            <div class="space-y-2 text-xs">
              <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                <strong class="text-emerald-300 block mb-1">🟩 Henry-Wordle (Up to 10 pts)</strong>
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-1 text-center font-bold text-[10px]">
                  <span class="bg-emerald-950 border border-emerald-500/50 p-1 rounded">1st try: 10 pts</span>
                  <span class="bg-emerald-950 border border-emerald-500/50 p-1 rounded">2nd try: 5 pts</span>
                  <span class="bg-emerald-950 border border-emerald-500/50 p-1 rounded">3rd try: 4 pts</span>
                  <span class="bg-emerald-950 border border-emerald-500/50 p-1 rounded">4th try: 3 pts</span>
                  <span class="bg-emerald-950 border border-emerald-500/50 p-1 rounded">5th try: 2 pts</span>
                  <span class="bg-emerald-950 border border-emerald-500/50 p-1 rounded">6th try: 1 pt</span>
                </div>
              </div>

              <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                <strong class="text-amber-300 block mb-1">🪜 Henry Word Ladder (Up to 10 pts)</strong>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-1 text-center font-bold text-[10px]">
                  <span class="bg-amber-950 border border-amber-500/50 p-1 rounded">3 steps: 10 pts</span>
                  <span class="bg-amber-950 border border-amber-500/50 p-1 rounded">4 steps: 6 pts</span>
                  <span class="bg-amber-950 border border-amber-500/50 p-1 rounded">5 steps: 3 pts</span>
                  <span class="bg-amber-950 border border-amber-500/50 p-1 rounded">6 steps: 1 pt</span>
                </div>
              </div>

              <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                <strong class="text-sky-300 block mb-1">🪷 Henry-Lake (120s timer)</strong>
                <p class="text-slate-300 text-[11px]"><strong>1 point</strong> for each valid word submitted + <strong>5 bonus points</strong> for guessing the full 9-letter anagram word!</p>
              </div>

              <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                <strong class="text-indigo-300 block mb-1">🧠 Henry-Quiz (60s timer)</strong>
                <p class="text-slate-300 text-[11px]"><strong>1 point</strong> per correct answer (10 questions = up to <strong>10 points</strong>).</p>
              </div>

              <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                <strong class="text-teal-300 block mb-1">🧭 Scavenger Hunt</strong>
                <p class="text-slate-300 text-[11px]">Find all 5 hidden holiday items across the island = <strong>+2 bonus points</strong>!</p>
              </div>
            </div>
          </div>

          <!-- Formula -->
          <div class="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-3.5">
            <h4 class="font-black text-amber-300 text-sm mb-1.5 flex items-center gap-1.5">
              <span>🧮</span>
              <span>How the Leaderboard is Calculated</span>
            </h4>
            <p class="text-xs text-slate-200 mb-2">
              To keep the competition 100% fair even if family members start on different days or miss a day due to holiday travel, the leaderboard ranks players by their <strong>Average Score</strong>:
            </p>
            <div class="bg-slate-950/80 p-2.5 rounded-xl border border-white/10 text-center font-black text-amber-300 text-xs sm:text-sm">
              Average Score = Total Points Earned ÷ Days Played
            </div>
          </div>

          <!-- 3D Snowman Representation -->
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <h4 class="font-black text-amber-300 text-sm mb-1.5 flex items-center gap-1.5">
              <span>⛄</span>
              <span>The Snowman Podium</span>
            </h4>
            <p class="text-xs text-slate-300 mb-2">
              In the middle of the island stands the grand <strong>Snowman Podium</strong>!
            </p>
            <ul class="list-disc list-inside text-xs text-slate-300 space-y-1">
              <li>Each player's score is visually sculpted as a <strong>3D Snowman</strong>.</li>
              <li><strong>Larger snowman = higher score!</strong> The snowman grows as your average score climbs.</li>
              <li>The top 3 leaders stand on the Gold 🥇, Silver 🥈, and Bronze 🥉 pedestals.</li>
              <li>1st place earns a glittering golden crown!</li>
            </ul>
          </div>
        </div>
      `;
    }

    // Island Sights
    return `
      <!-- Section 4: Island Sights -->
      <div class="space-y-3">
        <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
          <h4 class="font-black text-teal-300 text-sm mb-1 flex items-center gap-2">
            <span>🧝</span>
            <span>Santa's Elves Workshop (North-East)</span>
          </h4>
          <p class="text-xs text-slate-300 mb-1.5">
            Explore the elves' cozy alpine log workshop with glowing windows and outdoor workbenches.
          </p>
          <p class="text-xs text-slate-300">
            Watch the elves swinging their hammers crafting a holiday wooden toy train and wrapping presents! Walk up to talk to them.
          </p>
        </div>

        <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
          <h4 class="font-black text-rose-300 text-sm mb-1 flex items-center gap-2">
            <span>🔥</span>
            <span>Cozy Hearth Campfire Retreat (North-West)</span>
          </h4>
          <p class="text-xs text-slate-300 mb-1.5">
            A rustic pine cabin tucked away in the snowy forest with an outdoor stone campfire pit.
          </p>
          <p class="text-xs text-slate-300">
            Split-log benches, glowing fire embers, and roasting marshmallows. Stand by the fire to warm up in the snow!
          </p>
        </div>

        <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
          <h4 class="font-black text-sky-300 text-sm mb-1 flex items-center gap-2">
            <span>🐧</span>
            <span>6 Wandering Penguins</span>
          </h4>
          <p class="text-xs text-slate-300">
            Keep an eye out for 6 playful penguins waddling along the cobblestone paths and plaza! They waddle, hop, flap their flippers, and pause to take in the festive island view.
          </p>
        </div>

        <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
          <h4 class="font-black text-red-300 text-sm mb-1 flex items-center gap-2">
            <span>🎅</span>
            <span>Santa & Sleigh with Reindeer (South)</span>
          </h4>
          <p class="text-xs text-slate-300">
            Santa is parked in his festive crimson-and-gold sleigh at the south beach along with two reindeer led by Rudolph!
          </p>
        </div>

        <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
          <h4 class="font-black text-amber-300 text-sm mb-1 flex items-center gap-2">
            <span>💬</span>
            <span>Family Bulletin Board</span>
          </h4>
          <p class="text-xs text-slate-300">
            Post holiday notes, banter, and cheers to each other! Anything posted appears in real time for everyone on the island.
          </p>
        </div>
      </div>
    `;
  }

  private wireEvents(): void {
    const closeBtn = document.getElementById('guide-close-btn');
    closeBtn?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.onCloseCallback();
    });

    const doneBtn = document.getElementById('guide-done-btn');
    doneBtn?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.onCloseCallback();
    });

    const setupTab = (id: string, tab: 'navigation' | 'games' | 'scoring' | 'island') => {
      document.getElementById(id)?.addEventListener('click', () => {
        soundAudio.playButtonClick();
        this.activeTab = tab;
        this.render();
      });
    };

    setupTab('tab-nav', 'navigation');
    setupTab('tab-games', 'games');
    setupTab('tab-scoring', 'scoring');
    setupTab('tab-island', 'island');
  }
}
