import confetti from 'canvas-confetti';
import { isValidLakeWord } from '../data/nineLetterWords';
import { familyStore } from '../state/familyStore';
import { LakeFoundWord } from '../types';
import { soundAudio } from '../utils/audio';
import { getDailyLakeWord, getTodayDateKey } from '../utils/dailyClock';

export class LakeGame {
  private container: HTMLElement;
  private rootWord: string = 'SNOWFLAKE';
  private scrambledLetters: { char: string; id: number; used: boolean }[] = [];
  private selectedLetters: { char: string; id: number }[] = [];
  private foundWords: LakeFoundWord[] = [];
  private timeLeftSeconds: number = 120;
  private timerInterval: number | null = null;
  private isGameOver: boolean = false;
  private score: number = 0;
  private hasFoundNineLetterBonus: boolean = false;
  private onCloseCallback: () => void;
  private keydownHandler?: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, onClose: () => void) {
    this.container = container;
    this.onCloseCallback = onClose;
    this.init();
  }

  private init(): void {
    const today = getTodayDateKey();
    this.rootWord = getDailyLakeWord(today);

    // Scramble letters
    this.scramble();

    // Start 120s timer
    this.timerInterval = window.setInterval(() => {
      if (this.timeLeftSeconds > 0) {
        this.timeLeftSeconds--;
        if (this.timeLeftSeconds === 10) soundAudio.playWrong();
        this.updateTimerDisplay();
      } else {
        this.finishGame();
      }
    }, 1000);

    // Keyboard support
    this.keydownHandler = (e: KeyboardEvent) => {
      if (this.isGameOver) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.submitWord();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        this.popLastLetter();
      } else if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        this.scramble();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        const char = e.key.toUpperCase();
        this.selectLetterByChar(char);
      }
    };
    window.addEventListener('keydown', this.keydownHandler);

    this.render();
  }

  public destroy(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
    }
  }

  private scramble(): void {
    const chars = this.rootWord.split('');
    // Fisher-Yates shuffle
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    this.scrambledLetters = chars.map((ch, idx) => ({
      char: ch,
      id: idx,
      used: this.selectedLetters.some(s => s.id === idx)
    }));

    soundAudio.playButtonClick();
    this.renderTilesOnly();
  }

  private selectTile(id: number): void {
    const tile = this.scrambledLetters.find(t => t.id === id);
    if (!tile || tile.used) return;

    tile.used = true;
    this.selectedLetters.push({ char: tile.char, id: tile.id });
    soundAudio.playButtonClick();
    this.renderInputArea();
    this.renderTilesOnly();
  }

  private selectLetterByChar(char: string): void {
    const tile = this.scrambledLetters.find(t => t.char === char && !t.used);
    if (tile) {
      this.selectTile(tile.id);
    }
  }

  private unselectLetter(idx: number): void {
    const item = this.selectedLetters.splice(idx, 1)[0];
    if (item) {
      const tile = this.scrambledLetters.find(t => t.id === item.id);
      if (tile) tile.used = false;
    }
    soundAudio.playButtonClick();
    this.renderInputArea();
    this.renderTilesOnly();
  }

  private popLastLetter(): void {
    if (this.selectedLetters.length > 0) {
      this.unselectLetter(this.selectedLetters.length - 1);
    }
  }

  private clearInput(): void {
    this.selectedLetters.forEach(item => {
      const tile = this.scrambledLetters.find(t => t.id === item.id);
      if (tile) tile.used = false;
    });
    this.selectedLetters = [];
    soundAudio.playButtonClick();
    this.renderInputArea();
    this.renderTilesOnly();
  }

  private submitWord(): void {
    const word = this.selectedLetters.map(s => s.char).join('');
    if (word.length < 3) {
      this.flashNotice('Words must be at least 3 letters!');
      soundAudio.playWrong();
      return;
    }

    if (this.foundWords.some(f => f.word === word)) {
      this.flashNotice(`Already found "${word}"!`);
      soundAudio.playWrong();
      return;
    }

    if (!isValidLakeWord(this.rootWord, word)) {
      this.flashNotice(`"${word}" is not a valid word!`);
      soundAudio.playWrong();
      return;
    }

    // Valid word!
    const isNineLetter = word.length === 9;
    const points = isNineLetter ? 6 : 1; // 1 pt base + 5 pts bonus
    this.score += points;

    if (isNineLetter) {
      this.hasFoundNineLetterBonus = true;
      this.flashNotice(`🌟 9-LETTER WORD BONUS! +5 EXTRA POINTS! 🌟`);
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.5 } });
      soundAudio.playVictory();
    } else {
      soundAudio.playCorrect();
    }

    this.foundWords.unshift({
      word,
      points,
      isNineLetterBonus: isNineLetter
    });

    this.clearInput();
    this.renderLilypads();
    this.renderScoreHeader();
  }

  private flashNotice(msg: string): void {
    const el = document.getElementById('lake-notice');
    if (el) {
      el.textContent = msg;
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 2000);
    }
  }

  private finishGame(): void {
    this.isGameOver = true;
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    soundAudio.playVictory();
    confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 } });

    // Save to active player
    const activePlayer = familyStore.getActivePlayer();
    familyStore.recordGameScore(activePlayer.id, 'lake', this.score);

    this.render();
  }

  private updateTimerDisplay(): void {
    const timerEl = document.getElementById('lake-timer');
    const barEl = document.getElementById('lake-timer-bar');
    if (timerEl) {
      const mins = Math.floor(this.timeLeftSeconds / 60);
      const secs = this.timeLeftSeconds % 60;
      timerEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
      if (this.timeLeftSeconds <= 15) {
        timerEl.classList.add('text-rose-600', 'animate-pulse');
      }
    }
    if (barEl) {
      const pct = (this.timeLeftSeconds / 120) * 100;
      barEl.style.width = `${pct}%`;
      if (pct < 20) {
        barEl.className = 'h-2 rounded-full transition-all duration-1000 bg-rose-500';
      }
    }
  }

  private renderScoreHeader(): void {
    const scoreEl = document.getElementById('lake-score-badge');
    if (scoreEl) {
      scoreEl.textContent = `Score: ${this.score} pts (${this.foundWords.length} words)`;
    }
  }

  private renderInputArea(): void {
    const inputArea = document.getElementById('lake-input-tiles');
    if (!inputArea) return;

    if (this.selectedLetters.length === 0) {
      inputArea.innerHTML = `<span class="text-sky-300 font-semibold italic text-sm">Select letters or type to form words...</span>`;
      return;
    }

    inputArea.innerHTML = this.selectedLetters
      .map(
        (item, idx) => `
        <button data-unselect-idx="${idx}" class="unselect-tile w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white border-2 border-sky-400 font-black text-sky-900 text-lg sm:text-xl shadow flex items-center justify-center hover:bg-rose-50 hover:border-rose-400 transition transform active:scale-95">
          ${item.char}
        </button>
      `
      )
      .join('');

    inputArea.querySelectorAll('.unselect-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-unselect-idx'));
        this.unselectLetter(idx);
      });
    });
  }

  private renderTilesOnly(): void {
    const tilesGrid = document.getElementById('lake-scrambled-tiles');
    if (!tilesGrid) return;

    tilesGrid.innerHTML = this.scrambledLetters
      .map(
        tile => `
        <button data-tile-id="${tile.id}" ${tile.used ? 'disabled' : ''} class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 font-black text-lg sm:text-2xl shadow-md transition transform active:scale-90 flex items-center justify-center ${
          tile.used
            ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed opacity-50'
            : 'bg-gradient-to-b from-sky-50 to-sky-100 border-sky-500 text-sky-900 hover:from-white hover:to-sky-50 hover:scale-105'
        }">
          ${tile.char}
        </button>
      `
      )
      .join('');

    tilesGrid.querySelectorAll('button[data-tile-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-tile-id'));
        this.selectTile(id);
      });
    });
  }

  private renderLilypads(): void {
    const padArea = document.getElementById('lake-lilypad-container');
    if (!padArea) return;

    if (this.foundWords.length === 0) {
      padArea.innerHTML = `
        <div class="col-span-full py-4 text-center text-sky-200 text-xs italic">
          No words landed on the lilypads yet! Build words to float them here.
        </div>
      `;
      return;
    }

    padArea.innerHTML = this.foundWords
      .map(
        fw => `
        <div class="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
          fw.isNineLetterBonus
            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 font-extrabold shadow-lg border-2 border-yellow-200 animate-pulse'
            : 'bg-emerald-700/90 text-white font-bold border border-emerald-400 shadow'
        } text-xs">
          <span>🪷</span>
          <span class="tracking-wider">${fw.word}</span>
          <span class="ml-auto font-black px-1.5 py-0.5 rounded ${fw.isNineLetterBonus ? 'bg-slate-900 text-amber-300' : 'bg-emerald-900 text-emerald-200'}">
            +${fw.points}
          </span>
        </div>
      `
      )
      .join('');
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 overflow-y-auto">
        <div class="relative w-full max-w-lg bg-gradient-to-b from-sky-900 to-indigo-950 rounded-2xl shadow-2xl border-4 border-sky-400 p-4 sm:p-5 flex flex-col items-center text-white">
          
          <!-- Header -->
          <div class="w-full flex justify-between items-center border-b border-sky-700/60 pb-2 mb-2">
            <div class="flex items-center gap-2">
              <span class="text-3xl">🪷</span>
              <div>
                <h2 class="font-extrabold text-lg sm:text-xl text-white leading-tight">Henry-Lake</h2>
                <p class="text-xs text-sky-300 font-semibold">Frozen Lake • 120s Word Scramble</p>
              </div>
            </div>
            <button id="close-lake-btn" class="w-8 h-8 rounded-full bg-sky-800 hover:bg-sky-700 text-sky-200 font-bold flex items-center justify-center transition">✕</button>
          </div>

          <!-- Timer & Score Header -->
          <div class="w-full flex justify-between items-center px-1 mb-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-sky-200">⏳ Time:</span>
              <span id="lake-timer" class="font-black text-lg text-amber-300">2:00</span>
            </div>
            <div id="lake-score-badge" class="px-3 py-1 bg-sky-800/80 border border-sky-600 rounded-full text-xs font-extrabold text-emerald-300">
              Score: ${this.score} pts (${this.foundWords.length} words)
            </div>
          </div>

          <!-- Timer Bar -->
          <div class="w-full bg-sky-950/80 rounded-full h-2 mb-3 overflow-hidden border border-sky-700">
            <div id="lake-timer-bar" class="h-2 rounded-full transition-all duration-1000 bg-gradient-to-r from-sky-400 to-emerald-400" style="width: 100%"></div>
          </div>

          <!-- Flash Notice -->
          <div id="lake-notice" class="hidden mb-2 px-3 py-1 bg-amber-500 text-slate-900 font-black text-xs rounded-full shadow-lg animate-bounce"></div>

          ${
            this.isGameOver
              ? `
            <!-- Game Over Result Screen -->
            <div class="w-full bg-white/10 rounded-2xl p-5 text-center my-2 border-2 border-sky-400/50 shadow-xl">
              <div class="text-4xl mb-2">🏆 ⛄ ❄️</div>
              <h3 class="text-2xl font-black text-amber-300">TIME'S UP!</h3>
              <p class="text-sm font-semibold text-sky-100 mt-1">You discovered <span class="font-bold text-emerald-300">${this.foundWords.length} words</span> on the frozen lake!</p>
              
              ${
                this.hasFoundNineLetterBonus
                  ? `<div class="my-2 bg-amber-400 text-slate-900 font-black py-1.5 px-3 rounded-lg text-sm inline-block shadow">
                      ⭐ 9-Letter Word Solved: "${this.rootWord}" (+5 Bonus!)
                     </div>`
                  : `<p class="text-xs text-sky-300 my-1">The 9-letter root word was: <span class="font-black text-amber-300 tracking-wider">${this.rootWord}</span></p>`
              }

              <div class="my-3 text-3xl font-black text-emerald-400 bg-sky-900/80 py-2 px-4 rounded-xl inline-block border border-sky-500">
                Total Score: +${this.score} pts
              </div>

              <p class="text-xs text-sky-200">Points recorded for today on the Island Snowman Leaderboard!</p>
              
              <button id="lake-done-btn" class="mt-4 w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 font-black text-white rounded-xl shadow-lg transition">
                Return to Island ▶
              </button>
            </div>
          `
              : `
            <!-- Word Input Tray -->
            <div class="w-full min-h-[50px] bg-sky-950/60 border-2 border-sky-500/70 rounded-xl px-3 py-2 flex items-center justify-center gap-1.5 mb-3 flex-wrap shadow-inner">
              <div id="lake-input-tiles" class="flex gap-1.5 flex-wrap items-center justify-center"></div>
            </div>

            <!-- Scrambled Ice Letter Tiles -->
            <div id="lake-scrambled-tiles" class="grid grid-cols-5 sm:grid-cols-9 gap-1.5 sm:gap-2 mb-3"></div>

            <!-- Controls (Clear, Shuffle, Submit) -->
            <div class="flex gap-2 w-full mb-3">
              <button id="lake-clear-btn" class="flex-1 py-2 bg-slate-700/80 hover:bg-slate-600 font-bold text-xs rounded-xl border border-slate-500 transition">
                🗑️ Clear
              </button>
              <button id="lake-shuffle-btn" class="flex-1 py-2 bg-sky-700 hover:bg-sky-600 font-bold text-xs rounded-xl border border-sky-400 transition">
                🔀 Shuffle
              </button>
              <button id="lake-submit-btn" class="flex-2 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 font-black text-sm rounded-xl border border-emerald-400 shadow-md transition">
                Submit Word ↵
              </button>
            </div>

            <!-- Lilypads Container (Discovered Words) -->
            <div class="w-full">
              <div class="flex justify-between items-center text-xs font-bold text-sky-300 mb-1.5">
                <span>Words on Lilypads (${this.foundWords.length})</span>
                <span class="text-[11px] text-amber-300 font-normal">9-letter = +5 pts bonus!</span>
              </div>
              <div id="lake-lilypad-container" class="w-full max-h-36 overflow-y-auto bg-sky-950/70 border border-sky-700 rounded-xl p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5"></div>
            </div>
          `
          }

        </div>
      </div>
    `;

    // Hook listeners
    this.container.querySelector('#close-lake-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.destroy();
      this.onCloseCallback();
    });

    this.container.querySelector('#lake-done-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.destroy();
      this.onCloseCallback();
    });

    if (!this.isGameOver) {
      this.container.querySelector('#lake-clear-btn')?.addEventListener('click', () => this.clearInput());
      this.container.querySelector('#lake-shuffle-btn')?.addEventListener('click', () => this.scramble());
      this.container.querySelector('#lake-submit-btn')?.addEventListener('click', () => this.submitWord());

      this.renderInputArea();
      this.renderTilesOnly();
      this.renderLilypads();
      this.updateTimerDisplay();
    }
  }
}
