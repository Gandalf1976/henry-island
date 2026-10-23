import confetti from 'canvas-confetti';
import { familyStore } from '../state/familyStore';
import { soundAudio } from '../utils/audio';
import { getTodayDateKey } from '../utils/dailyClock';
import { calculateTarget24Score, getDailyTarget24, safeEvaluateMath } from '../utils/target24Solver';

interface NumberTile {
  id: number;
  value: number;
  used: boolean;
}

export class Target24Game {
  private container: HTMLElement;
  private targetNumbers: number[] = [3, 8, 3, 1];
  private sampleSolution: string = '';
  private numberTiles: NumberTile[] = [];
  private formulaTokens: { id: string; text: string; tileId?: number }[] = [];
  private timeLeftSeconds: number = 90;
  private timerInterval: number | null = null;
  private isGameOver: boolean = false;
  private score: number = 0;
  private calculatedValue: number | null = null;
  private onCloseCallback: () => void;
  private keydownHandler?: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, onClose: () => void) {
    this.container = container;
    this.onCloseCallback = onClose;
    this.init();
  }

  private init(): void {
    const today = getTodayDateKey();
    const puzzle = getDailyTarget24(today);
    this.targetNumbers = puzzle.numbers;
    this.sampleSolution = puzzle.sampleSolution;

    this.numberTiles = this.targetNumbers.map((val, idx) => ({
      id: idx,
      value: val,
      used: false
    }));

    // Start 90s timer
    this.timerInterval = window.setInterval(() => {
      if (this.timeLeftSeconds > 0) {
        this.timeLeftSeconds--;
        if (this.timeLeftSeconds === 15) soundAudio.playWrong();
        this.updateTimerDisplay();
      } else {
        this.lockInFormula();
      }
    }, 1000);

    // Keyboard support
    this.keydownHandler = (e: KeyboardEvent) => {
      if (this.isGameOver) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.lockInFormula();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        this.popLastToken();
      } else if (['+', '-', '*', '/', '(', ')'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        const displayChar = e.key === '*' ? '×' : e.key === '/' ? '÷' : e.key === '-' ? '−' : e.key;
        this.addOperator(displayChar);
      } else if (/^[0-9]$/.test(e.key)) {
        const num = Number(e.key);
        // Find an unused tile with this number
        const tile = this.numberTiles.find(t => t.value === num && !t.used);
        if (tile) {
          e.preventDefault();
          e.stopPropagation();
          this.selectTile(tile.id);
        }
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

  private selectTile(tileId: number): void {
    const tile = this.numberTiles.find(t => t.id === tileId);
    if (!tile || tile.used) return;

    tile.used = true;
    this.formulaTokens.push({
      id: `tok-${Date.now()}-${Math.random()}`,
      text: String(tile.value),
      tileId: tile.id
    });

    soundAudio.playButtonClick();
    this.renderFormulaArea();
    this.renderTilesArea();
  }

  private addOperator(op: string): void {
    this.formulaTokens.push({
      id: `tok-${Date.now()}-${Math.random()}`,
      text: op
    });
    soundAudio.playButtonClick();
    this.renderFormulaArea();
  }

  private removeToken(index: number): void {
    const token = this.formulaTokens.splice(index, 1)[0];
    if (token && token.tileId !== undefined) {
      const tile = this.numberTiles.find(t => t.id === token.tileId);
      if (tile) tile.used = false;
    }
    soundAudio.playButtonClick();
    this.renderFormulaArea();
    this.renderTilesArea();
  }

  private popLastToken(): void {
    if (this.formulaTokens.length > 0) {
      this.removeToken(this.formulaTokens.length - 1);
    }
  }

  private clearFormula(): void {
    this.numberTiles.forEach(t => (t.used = false));
    this.formulaTokens = [];
    soundAudio.playButtonClick();
    this.renderFormulaArea();
    this.renderTilesArea();
  }

  private getFormulaString(): string {
    return this.formulaTokens.map(t => t.text).join(' ');
  }

  private lockInFormula(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    const formulaStr = this.getFormulaString();
    const evalRes = safeEvaluateMath(formulaStr);
    this.calculatedValue = evalRes.ok && evalRes.value !== undefined ? evalRes.value : null;

    const scoring = calculateTarget24Score(this.calculatedValue);
    this.score = scoring.points;

    // Record score
    const activePlayer = familyStore.getActivePlayer();
    familyStore.recordGameScore(activePlayer.id, 'target24', this.score);

    if (this.score === 10) {
      soundAudio.playVictory();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else if (this.score >= 5) {
      soundAudio.playVictory();
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    } else {
      soundAudio.playWrong();
    }

    this.render();
  }

  private updateTimerDisplay(): void {
    const timerEl = document.getElementById('t24-timer');
    const barEl = document.getElementById('t24-timer-bar');
    if (timerEl) {
      const mins = Math.floor(this.timeLeftSeconds / 60);
      const secs = this.timeLeftSeconds % 60;
      timerEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
      if (this.timeLeftSeconds <= 15) {
        timerEl.classList.add('text-rose-500', 'animate-pulse');
      }
    }
    if (barEl) {
      const pct = (this.timeLeftSeconds / 90) * 100;
      barEl.style.width = `${pct}%`;
      if (pct < 20) {
        barEl.className = 'h-2 rounded-full transition-all duration-1000 bg-rose-500';
      }
    }
  }

  private renderFormulaArea(): void {
    const tray = document.getElementById('t24-formula-tokens');
    const previewEl = document.getElementById('t24-formula-preview');
    if (!tray) return;

    if (this.formulaTokens.length === 0) {
      tray.innerHTML = `<span class="text-sky-300 font-semibold italic text-xs sm:text-sm">Click numbers & operators to build your formula...</span>`;
      if (previewEl) previewEl.textContent = 'Result = ?';
      return;
    }

    tray.innerHTML = this.formulaTokens
      .map(
        (t, idx) => `
        <button data-token-idx="${idx}" class="remove-token px-2.5 py-1.5 rounded-xl font-black text-sm sm:text-base shadow transition transform active:scale-95 ${
          t.tileId !== undefined
            ? 'bg-amber-400 text-slate-950 border-2 border-amber-300 hover:bg-rose-400 hover:border-rose-300'
            : 'bg-indigo-700 text-white border border-indigo-500 hover:bg-rose-500'
        }">
          ${t.text}
        </button>
      `
      )
      .join('');

    tray.querySelectorAll('.remove-token').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-token-idx'));
        this.removeToken(idx);
      });
    });

    if (previewEl) {
      const formulaStr = this.getFormulaString();
      const evalRes = safeEvaluateMath(formulaStr);
      if (evalRes.ok && evalRes.value !== undefined) {
        const rounded = Math.round(evalRes.value * 100) / 100;
        const diff = Math.abs(rounded - 24);
        previewEl.innerHTML = `Current Total = <span class="text-lg font-black ${
          diff < 0.01 ? 'text-amber-300 animate-pulse' : diff <= 2 ? 'text-emerald-300' : 'text-sky-200'
        }">${rounded}</span> ${diff < 0.01 ? '🎯 TARGET HIT!' : ''}`;
      } else {
        previewEl.textContent = 'Building sum...';
      }
    }
  }

  private renderTilesArea(): void {
    const tilesContainer = document.getElementById('t24-number-tiles');
    if (!tilesContainer) return;

    tilesContainer.innerHTML = this.numberTiles
      .map(
        tile => `
        <button data-tile-id="${tile.id}" ${tile.used ? 'disabled' : ''} class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl font-black text-2xl sm:text-3xl shadow-lg border-2 transition transform active:scale-90 flex flex-col items-center justify-center ${
          tile.used
            ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-40 scale-95'
            : 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 border-amber-200 hover:brightness-110'
        }">
          <span>${tile.value}</span>
        </button>
      `
      )
      .join('');

    tilesContainer.querySelectorAll('button[data-tile-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-tile-id'));
        this.selectTile(id);
      });
    });
  }

  public render(): void {
    const scoring = calculateTarget24Score(this.calculatedValue);

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
        <div class="relative w-full max-w-lg bg-gradient-to-b from-sky-950 via-slate-900 to-indigo-950 rounded-3xl shadow-2xl border-4 border-amber-400 p-5 sm:p-6 text-white flex flex-col items-center">
          
          <!-- Header -->
          <div class="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div class="flex items-center gap-2.5">
              <span class="text-3xl">🎯</span>
              <div>
                <h3 class="text-lg sm:text-xl font-black text-amber-300">Henry Target 24</h3>
                <p class="text-[11px] sm:text-xs text-sky-200">Use all 4 numbers with +, −, ×, ÷ to equal 24!</p>
              </div>
            </div>
            <button id="close-t24-btn" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition">✕</button>
          </div>

          <!-- Timer & Rules Banner -->
          <div class="w-full flex justify-between items-center px-1 mb-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-sky-200">⏳ Time Left:</span>
              <span id="t24-timer" class="font-black text-lg text-amber-300">1:30</span>
            </div>
            <div class="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-[10px] font-bold">
              Exact 24 = 10 pts
            </div>
          </div>

          <!-- Timer Bar -->
          <div class="w-full bg-sky-950/80 rounded-full h-2 mb-3 overflow-hidden border border-sky-700">
            <div id="t24-timer-bar" class="h-2 rounded-full transition-all duration-1000 bg-gradient-to-r from-amber-400 to-emerald-400" style="width: 100%"></div>
          </div>

          ${
            this.isGameOver
              ? `
            <!-- Game Over Result Screen -->
            <div class="w-full bg-white/10 rounded-2xl p-5 text-center my-2 border-2 border-amber-400/50 shadow-xl">
              <div class="text-4xl mb-2">🎯 ⛄ 🏆</div>
              <h3 class="text-2xl font-black text-amber-300">SUM LOCKED IN!</h3>
              
              <div class="my-3 bg-slate-900/80 border border-white/10 rounded-xl p-3 text-xs space-y-1.5 max-w-sm mx-auto">
                <div class="flex justify-between items-center text-sky-200">
                  <span>Your Formula:</span>
                  <span class="font-mono font-bold text-amber-200">${this.getFormulaString() || '(None)'}</span>
                </div>
                <div class="flex justify-between items-center text-sky-200">
                  <span>Calculated Result:</span>
                  <span class="font-mono font-bold text-emerald-300">${this.calculatedValue !== null ? this.calculatedValue : 'Invalid'}</span>
                </div>
                <div class="flex justify-between items-center text-sky-200">
                  <span>Target Outcome:</span>
                  <span class="font-bold text-amber-300">${scoring.desc}</span>
                </div>
                <div class="border-t border-white/10 pt-1.5 flex justify-between items-center text-sm font-black">
                  <span class="text-white">Points Awarded:</span>
                  <span class="text-amber-300 text-base">+${this.score} pts</span>
                </div>
              </div>

              ${
                this.score < 10
                  ? `<div class="p-2 bg-indigo-950/70 border border-indigo-500/50 rounded-xl text-[11px] text-sky-200 my-2">
                      💡 A 24 solution was: <span class="font-mono font-bold text-amber-300">${this.sampleSolution}</span>
                     </div>`
                  : ''
              }

              <p class="text-xs text-sky-200 mt-2">Recorded on the Island Snowman Leaderboard for today!</p>
              
              <button id="t24-done-btn" class="mt-4 w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 font-black text-white rounded-xl shadow-lg transition">
                Return to Island ▶
              </button>
            </div>
          `
              : `
            <!-- Formula Display Tray -->
            <div class="w-full bg-slate-950/70 border-2 border-amber-400/60 rounded-2xl p-3 mb-2 flex flex-col items-center justify-center min-h-[70px] shadow-inner">
              <div id="t24-formula-tokens" class="flex flex-wrap items-center justify-center gap-1.5 w-full"></div>
            </div>
            <div id="t24-formula-preview" class="text-xs font-bold text-sky-300 mb-3">Result = ?</div>

            <!-- 4 Number Tiles Grid -->
            <div class="w-full mb-3">
              <div class="text-[11px] font-bold text-amber-200 mb-1 text-center">Your 4 Numbers (Click to use):</div>
              <div id="t24-number-tiles" class="flex justify-center gap-2 sm:gap-3"></div>
            </div>

            <!-- Operators Grid -->
            <div class="w-full mb-3">
              <div class="text-[11px] font-bold text-sky-200 mb-1 text-center">Operators & Parentheses:</div>
              <div class="grid grid-cols-6 gap-1.5 sm:gap-2">
                <button data-op="+" class="op-btn py-2 bg-indigo-900/90 hover:bg-indigo-800 text-white font-black text-lg sm:text-xl rounded-xl border border-indigo-400 shadow transition transform active:scale-95">+</button>
                <button data-op="−" class="op-btn py-2 bg-indigo-900/90 hover:bg-indigo-800 text-white font-black text-lg sm:text-xl rounded-xl border border-indigo-400 shadow transition transform active:scale-95">−</button>
                <button data-op="×" class="op-btn py-2 bg-indigo-900/90 hover:bg-indigo-800 text-white font-black text-lg sm:text-xl rounded-xl border border-indigo-400 shadow transition transform active:scale-95">×</button>
                <button data-op="÷" class="op-btn py-2 bg-indigo-900/90 hover:bg-indigo-800 text-white font-black text-lg sm:text-xl rounded-xl border border-indigo-400 shadow transition transform active:scale-95">÷</button>
                <button data-op="(" class="op-btn py-2 bg-slate-800 hover:bg-slate-700 text-sky-200 font-black text-lg sm:text-xl rounded-xl border border-slate-600 shadow transition transform active:scale-95">(</button>
                <button data-op=")" class="op-btn py-2 bg-slate-800 hover:bg-slate-700 text-sky-200 font-black text-lg sm:text-xl rounded-xl border border-slate-600 shadow transition transform active:scale-95">)</button>
              </div>
            </div>

            <!-- Utility Controls & Lock In -->
            <div class="flex gap-2 w-full mb-2">
              <button id="t24-clear-btn" class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-600 transition">
                🗑️ Clear
              </button>
              <button id="t24-backspace-btn" class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-600 transition">
                ⌫ Backspace
              </button>
            </div>

            <button id="t24-lockin-btn" class="w-full py-3 bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600 hover:brightness-110 font-black text-sm rounded-xl border-2 border-white/80 shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2">
              <span>🔒 Lock In Sum & Enter</span>
              <span class="text-xs opacity-80">(Cannot retry!)</span>
            </button>
          `
          }

        </div>
      </div>
    `;

    // Hook events
    this.container.querySelector('#close-t24-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.destroy();
      this.onCloseCallback();
    });

    this.container.querySelector('#t24-done-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.destroy();
      this.onCloseCallback();
    });

    if (!this.isGameOver) {
      this.container.querySelector('#t24-clear-btn')?.addEventListener('click', () => this.clearFormula());
      this.container.querySelector('#t24-backspace-btn')?.addEventListener('click', () => this.popLastToken());
      this.container.querySelector('#t24-lockin-btn')?.addEventListener('click', () => {
        soundAudio.playButtonClick();
        this.lockInFormula();
      });

      this.container.querySelectorAll('button[data-op]').forEach(btn => {
        btn.addEventListener('click', () => {
          const op = btn.getAttribute('data-op');
          if (op) this.addOperator(op);
        });
      });

      this.renderFormulaArea();
      this.renderTilesArea();
      this.updateTimerDisplay();
    }
  }
}
