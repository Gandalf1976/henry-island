import confetti from 'canvas-confetti';
import {
  calculateLadderScore,
  getDailyWordLadder,
  getDiffIndex,
  isSingleLetterDiff,
  isValidLadderWord
} from '../data/wordLadderDictionary';
import { familyStore } from '../state/familyStore';
import { WordLadderPuzzle } from '../types';
import { soundAudio } from '../utils/audio';
import { getTodayDateKey } from '../utils/dailyClock';

export class WordLadderGame {
  private container: HTMLElement;
  private puzzle: WordLadderPuzzle;
  private ladder: string[] = []; // [startWord, ...rungs]
  private currentInput: string = '';
  private errorMessage: string = '';
  private isGameOver: boolean = false;
  private isWin: boolean = false;
  private finalScore: number = 0;
  private onCloseCallback: () => void;
  private keydownHandler?: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, onClose: () => void) {
    this.container = container;
    this.onCloseCallback = onClose;

    const today = getTodayDateKey();
    this.puzzle = getDailyWordLadder(today);
    this.ladder = [this.puzzle.startWord];

    this.initKeyboard();
    this.render();
  }

  private initKeyboard(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      if (this.isGameOver) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.submitWord();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        this.deleteLetter();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        this.addLetter(e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', this.keydownHandler);
  }

  public destroy(): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
    }
  }

  private addLetter(char: string): void {
    if (this.currentInput.length < 4) {
      this.currentInput += char;
      this.errorMessage = '';
      soundAudio.playButtonClick();
      this.render();
    }
  }

  private deleteLetter(): void {
    if (this.currentInput.length > 0) {
      this.currentInput = this.currentInput.slice(0, -1);
      this.errorMessage = '';
      this.render();
    }
  }

  private submitWord(): void {
    const word = this.currentInput.trim().toUpperCase();
    if (word.length !== 4) {
      this.showError('Must be a 4-letter word!');
      soundAudio.playWrong();
      return;
    }

    const prevWord = this.ladder[this.ladder.length - 1];

    if (word === prevWord) {
      this.showError('Word is the same as previous step!');
      soundAudio.playWrong();
      return;
    }

    if (!isSingleLetterDiff(prevWord, word)) {
      this.showError(`Must change exactly 1 letter from ${prevWord}!`);
      soundAudio.playWrong();
      return;
    }

    if (!isValidLadderWord(word)) {
      this.showError(`"${word}" is not in the dictionary!`);
      soundAudio.playWrong();
      return;
    }

    if (this.ladder.includes(word)) {
      this.showError(`"${word}" already used on the ladder!`);
      soundAudio.playWrong();
      return;
    }

    // Valid rung added!
    this.ladder.push(word);
    this.currentInput = '';
    this.errorMessage = '';
    soundAudio.playCorrect();

    const currentStepCount = this.ladder.length - 1;

    // Check if reached target
    if (word === this.puzzle.targetWord) {
      this.onWin(currentStepCount);
      return;
    }

    // Check if max 6 steps reached without reaching target
    if (currentStepCount >= 6) {
      this.errorMessage = 'Maximum 6 steps reached! Undo a step or reset to try another path.';
    }

    this.render();
  }

  private undoStep(): void {
    if (this.ladder.length > 1 && !this.isWin) {
      this.ladder.pop();
      this.currentInput = '';
      this.errorMessage = '';
      soundAudio.playButtonClick();
      this.render();
    }
  }

  private resetLadder(): void {
    if (!this.isWin) {
      this.ladder = [this.puzzle.startWord];
      this.currentInput = '';
      this.errorMessage = '';
      soundAudio.playButtonClick();
      this.render();
    }
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    this.render();
  }

  private onWin(steps: number): void {
    this.isGameOver = true;
    this.isWin = true;
    this.finalScore = calculateLadderScore(steps);

    const player = familyStore.getActivePlayer();
    familyStore.recordGameScore(player.id, 'wordLadder', this.finalScore);

    soundAudio.playVictory();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    this.render();
  }

  public render(): void {
    const currentStepCount = this.ladder.length - 1;
    const canUndo = this.ladder.length > 1 && !this.isGameOver;
    const isTargetReached = this.ladder[this.ladder.length - 1] === this.puzzle.targetWord;

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
        <div class="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-sky-950 to-slate-900 border-2 border-amber-400/50 rounded-3xl shadow-2xl p-4 sm:p-6 text-white flex flex-col max-h-[92vh]">
          
          <!-- Header Bar -->
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🪜</span>
              <div>
                <h2 class="text-lg sm:text-xl font-black tracking-wide text-amber-300">Henry Word Ladder</h2>
                <p class="text-[11px] text-sky-200">Change 1 letter at each step to reach the target!</p>
              </div>
            </div>
            <button id="ladder-close-btn" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition">
              ✕
            </button>
          </div>

          <!-- Goal Summary & Points Banner -->
          <div class="mt-3 bg-white/5 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="px-2.5 py-1 bg-emerald-600 rounded-lg font-black text-xs sm:text-sm tracking-wider">
                ${this.puzzle.startWord}
              </div>
              <span class="text-xs text-sky-300 font-bold">➔</span>
              <div class="px-2.5 py-1 bg-amber-500 rounded-lg font-black text-xs sm:text-sm tracking-wider text-slate-950">
                ${this.puzzle.targetWord}
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-sky-300 block uppercase font-bold">Steps: ${currentStepCount} / 6</span>
              <span class="text-xs font-black ${currentStepCount <= 3 ? 'text-emerald-400' : currentStepCount === 4 ? 'text-amber-400' : currentStepCount === 5 ? 'text-orange-400' : 'text-sky-300'}">
                ${currentStepCount < 3 ? 'Target: 3 steps = 10 pts' : currentStepCount === 3 ? '10 pts (3 steps)' : currentStepCount === 4 ? '6 pts (4 steps)' : currentStepCount === 5 ? '3 pts (5 steps)' : '1 pt (6 steps)'}
              </span>
            </div>
          </div>

          <!-- Ladder Visual Rungs Display -->
          <div class="flex-1 my-3 overflow-y-auto pr-1 flex flex-col items-center gap-2 min-h-[160px] max-h-[220px]">
            ${this.ladder
              .map((word, idx) => {
                const isStart = idx === 0;
                const isTarget = word === this.puzzle.targetWord;
                const prev = idx > 0 ? this.ladder[idx - 1] : null;
                const changedIdx = prev ? getDiffIndex(prev, word) : -1;

                return `
                  <div class="flex items-center gap-2 animate-scale-in">
                    <span class="text-[10px] font-bold text-sky-400 w-12 text-right">
                      ${isStart ? 'START' : `Step ${idx}`}
                    </span>
                    <div class="flex gap-1.5 p-1.5 rounded-xl border ${
                      isStart
                        ? 'bg-emerald-950/70 border-emerald-500'
                        : isTarget
                        ? 'bg-amber-950/70 border-amber-400'
                        : 'bg-slate-800/80 border-slate-600'
                    }">
                      ${word
                        .split('')
                        .map((char, cIdx) => {
                          const isChanged = cIdx === changedIdx;
                          return `
                            <span class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-black text-base sm:text-lg rounded-lg ${
                              isChanged
                                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                                : isStart
                                ? 'bg-emerald-600 text-white'
                                : isTarget
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-700 text-white'
                            }">
                              ${char}
                            </span>
                          `;
                        })
                        .join('')}
                    </div>
                    ${
                      isTarget
                        ? '<span class="text-amber-400 text-sm">⭐ Target!</span>'
                        : isStart
                        ? '<span class="text-emerald-400 text-xs">Origin</span>'
                        : ''
                    }
                  </div>
                `;
              })
              .join('')}

            ${
              !isTargetReached && currentStepCount < 6
                ? `
                  <!-- Destination Preview -->
                  <div class="flex items-center gap-2 opacity-50 border-t border-dashed border-white/20 pt-1 mt-1">
                    <span class="text-[10px] font-bold text-amber-300 w-12 text-right">GOAL</span>
                    <div class="flex gap-1.5 p-1.5 rounded-xl border border-dashed border-amber-400/50">
                      ${this.puzzle.targetWord
                        .split('')
                        .map(
                          c => `
                            <span class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-sm text-amber-200 bg-amber-950/30 rounded-lg">
                              ${c}
                            </span>
                          `
                        )
                        .join('')}
                    </div>
                  </div>
                `
                : ''
            }
          </div>

          <!-- Status / Error Notification -->
          ${
            this.errorMessage
              ? `
                <div class="mb-2 py-1.5 px-3 bg-red-950/80 border border-red-500/80 rounded-xl text-center text-xs text-red-200 font-bold animate-shake">
                  ⚠️ ${this.errorMessage}
                </div>
              `
              : ''
          }

          ${
            this.isWin
              ? `
                <!-- Victory Banner -->
                <div class="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded-2xl p-4 text-center shadow-lg my-2">
                  <div class="text-3xl mb-1">🎉 🏆 🌟</div>
                  <h3 class="text-xl font-black uppercase tracking-wide">Word Ladder Complete!</h3>
                  <p class="text-xs font-bold mt-1">
                    Reached <strong>${this.puzzle.targetWord}</strong> in <strong>${currentStepCount} steps</strong>!
                  </p>
                  <div class="inline-block mt-2 px-4 py-1.5 bg-slate-950 text-amber-300 font-black text-lg rounded-xl shadow">
                    +${this.finalScore} Points Awarded!
                  </div>
                  <div class="mt-3">
                    <button id="ladder-finish-btn" class="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl transition shadow">
                      Return to Island 🏝️
                    </button>
                  </div>
                </div>
              `
              : `
                <!-- Current Input Display -->
                <div class="bg-white/5 rounded-2xl p-3 border border-white/10 mb-2 flex flex-col items-center">
                  <div class="text-[11px] text-sky-200 font-bold mb-1">
                    Type your next 4-letter word (Step ${currentStepCount + 1} of 6):
                  </div>
                  <div class="flex gap-2 mb-2">
                    ${[0, 1, 2, 3]
                      .map(idx => {
                        const letter = this.currentInput[idx] || '';
                        return `
                          <div class="w-10 h-10 sm:w-11 sm:h-11 border-2 ${
                            letter ? 'border-amber-400 bg-amber-400/20' : 'border-sky-400/50 bg-slate-900/60'
                          } rounded-xl flex items-center justify-center font-black text-xl text-amber-300 shadow-inner">
                            ${letter}
                          </div>
                        `;
                      })
                      .join('')}
                  </div>

                  <!-- Controls: Undo / Reset / Submit -->
                  <div class="flex items-center gap-2 w-full max-w-xs justify-center">
                    <button id="ladder-undo-btn" ${!canUndo ? 'disabled' : ''} class="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-bold text-sky-200 transition border border-white/10">
                      ↩ Undo
                    </button>
                    <button id="ladder-reset-btn" ${this.ladder.length <= 1 ? 'disabled' : ''} class="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-bold text-red-300 transition border border-white/10">
                      🔄 Reset
                    </button>
                    <button id="ladder-submit-btn" ${this.currentInput.length !== 4 ? 'disabled' : ''} class="flex-1 py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-black text-white transition shadow">
                      Enter ↵
                    </button>
                  </div>
                </div>

                <!-- On-Screen Virtual Keyboard -->
                <div class="flex flex-col gap-1 items-center pb-1">
                  ${[
                    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
                    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
                    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
                  ]
                    .map(row => `
                      <div class="flex gap-1 justify-center w-full">
                        ${row
                          .map(key => {
                            const isAction = key === 'ENTER' || key === '⌫';
                            return `
                              <button
                                data-key="${key}"
                                class="ladder-key-btn ${isAction ? 'px-2 text-[10px] sm:text-xs font-black min-w-[42px] sm:min-w-[50px] bg-sky-900 hover:bg-sky-800' : 'w-7 sm:w-8 bg-slate-800 hover:bg-slate-700 font-bold text-xs sm:text-sm'} h-9 rounded-lg flex items-center justify-center transition border border-white/10 active:scale-95 text-white shadow-sm"
                              >
                                ${key}
                              </button>
                            `;
                          })
                          .join('')}
                      </div>
                    `)
                    .join('')}
                </div>
              `
          }

          <!-- Scoring Legend Footer -->
          <div class="pt-2 mt-1 border-t border-white/10 flex items-center justify-around text-[10px] text-sky-300/80">
            <span>3 steps: <strong>10 pts</strong></span>
            <span>4 steps: <strong>6 pts</strong></span>
            <span>5 steps: <strong>3 pts</strong></span>
            <span>6 steps: <strong>1 pt</strong></span>
          </div>

        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const closeBtn = this.container.querySelector('#ladder-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.destroy();
        this.onCloseCallback();
      });
    }

    const finishBtn = this.container.querySelector('#ladder-finish-btn');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => {
        this.destroy();
        this.onCloseCallback();
      });
    }

    const undoBtn = this.container.querySelector('#ladder-undo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undoStep());
    }

    const resetBtn = this.container.querySelector('#ladder-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetLadder());
    }

    const submitBtn = this.container.querySelector('#ladder-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitWord());
    }

    const keyButtons = this.container.querySelectorAll<HTMLButtonElement>('.ladder-key-btn');
    keyButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (!key) return;
        if (key === 'ENTER') {
          this.submitWord();
        } else if (key === '⌫') {
          this.deleteLetter();
        } else {
          this.addLetter(key);
        }
      });
    });
  }
}
