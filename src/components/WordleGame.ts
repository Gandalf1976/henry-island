import confetti from 'canvas-confetti';
import { loadWordleLists } from '../data/wordleWords';
import { familyStore } from '../state/familyStore';
import { WordleGuessEvaluation } from '../types';
import { soundAudio } from '../utils/audio';
import { getDailyWordleWord, getTodayDateKey } from '../utils/dailyClock';

export class WordleGame {
  private container: HTMLElement;
  private secretWord: string = 'SANTA';
  private guesses: string[] = [];
  private currentInput: string = '';
  private evaluations: WordleGuessEvaluation[][] = [];
  private maxAttempts: number = 6;
  private isGameOver: boolean = false;
  private isWin: boolean = false;
  private score: number = 0;
  private validGuessesSet: Set<string> = new Set();
  private letterStatuses: Record<string, 'correct' | 'present' | 'absent'> = {};
  private onCloseCallback: () => void;
  private keydownHandler?: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, onClose: () => void) {
    this.container = container;
    this.onCloseCallback = onClose;
    this.init();
  }

  private async init(): Promise<void> {
    const today = getTodayDateKey();
    const lists = await loadWordleLists();
    this.validGuessesSet = lists.guesses;
    this.secretWord = getDailyWordleWord(today, lists.answers);

    // Setup keyboard listener
    this.keydownHandler = (e: KeyboardEvent) => {
      if (this.isGameOver) return;
      if (e.key === 'Enter') {
        this.submitGuess();
      } else if (e.key === 'Backspace') {
        this.deleteLetter();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        this.addLetter(e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', this.keydownHandler);

    this.render();
  }

  public destroy(): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
    }
  }

  // --- Two-Pass Evaluation Logic (Exact User Requirement) ---
  public evaluateGuess(guess: string, secret: string): WordleGuessEvaluation[] {
    const result: WordleGuessEvaluation[] = Array(5).fill(null);
    const secretLetters = secret.split('');
    const guessLetters = guess.split('');
    const letterCounts: Record<string, number> = {};

    // First Pass: Identify Exact Matches (Green)
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === secretLetters[i]) {
        result[i] = { letter: guessLetters[i], status: 'correct' };
      } else {
        const char = secretLetters[i];
        letterCounts[char] = (letterCounts[char] || 0) + 1;
      }
    }

    // Second Pass: Identify Misplaced (Yellow) or Absent (Gray)
    for (let i = 0; i < 5; i++) {
      if (result[i] === null) {
        const char = guessLetters[i];
        if (letterCounts[char] && letterCounts[char] > 0) {
          result[i] = { letter: char, status: 'present' };
          letterCounts[char]--;
        } else {
          result[i] = { letter: char, status: 'absent' };
        }
      }
    }

    return result;
  }

  private addLetter(char: string): void {
    if (this.currentInput.length < 5) {
      this.currentInput += char;
      soundAudio.playButtonClick();
      this.render();
    }
  }

  private deleteLetter(): void {
    if (this.currentInput.length > 0) {
      this.currentInput = this.currentInput.slice(0, -1);
      soundAudio.playButtonClick();
      this.render();
    }
  }

  private submitGuess(): void {
    if (this.currentInput.length !== 5) {
      this.flashMessage('Please enter a 5-letter word!');
      soundAudio.playWrong();
      return;
    }

    const guess = this.currentInput.toUpperCase();
    if (this.validGuessesSet.size > 0 && !this.validGuessesSet.has(guess)) {
      this.flashMessage('Word not in dictionary list!');
      soundAudio.playWrong();
      return;
    }

    const evalResult = this.evaluateGuess(guess, this.secretWord);
    this.evaluations.push(evalResult);
    this.guesses.push(guess);

    // Update keyboard statuses (highest priority: correct > present > absent)
    evalResult.forEach(item => {
      const prev = this.letterStatuses[item.letter];
      if (item.status === 'correct') {
        this.letterStatuses[item.letter] = 'correct';
      } else if (item.status === 'present' && prev !== 'correct') {
        this.letterStatuses[item.letter] = 'present';
      } else if (!prev) {
        this.letterStatuses[item.letter] = 'absent';
      }
    });

    this.currentInput = '';

    // Check Win/Loss conditions
    if (guess === this.secretWord) {
      this.isGameOver = true;
      this.isWin = true;
      const attempt = this.guesses.length;
      // Scoring rules: 1st=10, 2nd=5, 3rd=4, 4th=3, 5th=2, 6th=1
      const pointsMap: Record<number, number> = { 1: 10, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };
      this.score = pointsMap[attempt] || 1;

      soundAudio.playVictory();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });

      const activePlayer = familyStore.getActivePlayer();
      familyStore.recordGameScore(activePlayer.id, 'wordle', this.score);
    } else if (this.guesses.length >= this.maxAttempts) {
      this.isGameOver = true;
      this.isWin = false;
      this.score = 0;
      soundAudio.playWrong();

      const activePlayer = familyStore.getActivePlayer();
      familyStore.recordGameScore(activePlayer.id, 'wordle', 0);
    } else {
      soundAudio.playWordleReveal('present');
    }

    this.render();
  }

  private flashMessage(msg: string): void {
    const el = document.getElementById('wordle-flash-message');
    if (el) {
      el.textContent = msg;
      el.classList.remove('hidden');
      setTimeout(() => {
        el.classList.add('hidden');
      }, 1800);
    }
  }

  private render(): void {
    const rowsHtml = [];
    for (let r = 0; r < this.maxAttempts; r++) {
      let cellsHtml = '';
      if (r < this.guesses.length) {
        const guessEval = this.evaluations[r];
        for (let c = 0; c < 5; c++) {
          const item = guessEval[c];
          const bgClass =
            item.status === 'correct'
              ? 'bg-emerald-600 border-emerald-700 text-white'
              : item.status === 'present'
              ? 'bg-amber-500 border-amber-600 text-white'
              : 'bg-slate-500 border-slate-600 text-slate-100';
          cellsHtml += `
            <div class="w-11 h-11 sm:w-13 sm:h-13 rounded-lg border-2 flex items-center justify-center font-black text-xl sm:text-2xl shadow-sm transition-all transform duration-300 ${bgClass}">
              ${item.letter}
            </div>
          `;
        }
      } else if (r === this.guesses.length && !this.isGameOver) {
        for (let c = 0; c < 5; c++) {
          const char = this.currentInput[c] || '';
          const activeBorder = char ? 'border-sky-500 bg-sky-50 text-slate-800 scale-105' : 'border-slate-300 bg-white';
          cellsHtml += `
            <div class="w-11 h-11 sm:w-13 sm:h-13 rounded-lg border-2 flex items-center justify-center font-black text-xl sm:text-2xl shadow-sm transition-all ${activeBorder}">
              ${char}
            </div>
          `;
        }
      } else {
        for (let c = 0; c < 5; c++) {
          cellsHtml += `
            <div class="w-11 h-11 sm:w-13 sm:h-13 rounded-lg border-2 border-slate-200 bg-slate-50 flex items-center justify-center font-bold text-xl text-slate-300">
            </div>
          `;
        }
      }

      rowsHtml.push(`<div class="flex gap-1.5 sm:gap-2 justify-center">${cellsHtml}</div>`);
    }

    // Keyboard layout
    const keyboardRows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
    ];

    const keyboardHtml = keyboardRows
      .map(row => {
        const keysHtml = row
          .map(k => {
            const status = this.letterStatuses[k];
            let keyStyle = 'bg-slate-200 text-slate-800 hover:bg-slate-300 active:bg-slate-400';
            if (status === 'correct') keyStyle = 'bg-emerald-600 text-white font-bold';
            else if (status === 'present') keyStyle = 'bg-amber-500 text-white font-bold';
            else if (status === 'absent') keyStyle = 'bg-slate-400 text-slate-200';

            const widthClass = k === 'ENTER' || k === '⌫' ? 'px-2.5 sm:px-3 text-xs sm:text-sm font-bold' : 'w-7 sm:w-9 font-semibold text-sm sm:text-base';

            return `
            <button data-key="${k}" class="key-btn h-11 sm:h-12 rounded-md ${widthClass} ${keyStyle} flex items-center justify-center shadow transition-all">
              ${k}
            </button>
          `;
          })
          .join('');
        return `<div class="flex gap-1 justify-center my-0.5 sm:my-1">${keysHtml}</div>`;
      })
      .join('');

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 overflow-y-auto">
        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-4 border-emerald-600 p-4 sm:p-5 flex flex-col items-center">
          
          <!-- Header -->
          <div class="w-full flex justify-between items-center border-b pb-2 mb-3">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🟩</span>
              <div>
                <h2 class="font-extrabold text-lg sm:text-xl text-slate-900 leading-tight">Henry-Wordle</h2>
                <p class="text-xs text-emerald-700 font-semibold">Wordle Cottage • Daily Word</p>
              </div>
            </div>
            <button id="close-wordle-btn" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition">✕</button>
          </div>

          <!-- Toast Flash message -->
          <div id="wordle-flash-message" class="hidden mb-2 px-3 py-1 bg-amber-500 text-white font-bold text-xs rounded-full shadow-md animate-bounce"></div>

          <!-- Scoring Legend helper -->
          <div class="w-full bg-emerald-50 rounded-lg p-1.5 mb-3 flex justify-around text-xs font-semibold text-emerald-900 border border-emerald-200">
            <span>1st: 10pts</span>
            <span>2nd: 5pts</span>
            <span>3rd: 4pts</span>
            <span>4th: 3pts</span>
            <span>5th: 2pts</span>
            <span>6th: 1pt</span>
          </div>

          <!-- Wordle Grid -->
          <div class="flex flex-col gap-1.5 sm:gap-2 mb-4">
            ${rowsHtml.join('')}
          </div>

          ${
            this.isGameOver
              ? `
            <div class="w-full bg-gradient-to-r ${this.isWin ? 'from-emerald-500 to-green-600' : 'from-rose-500 to-red-600'} text-white rounded-xl p-4 text-center mb-3 shadow-lg animate-fade-in">
              <div class="text-3xl mb-1">${this.isWin ? '🎉 ⛄ ⭐' : '❄️ 💔'}</div>
              <h3 class="text-lg font-black">${this.isWin ? 'BRILLIANT!' : 'NICE TRY!'}</h3>
              <p class="text-sm font-semibold">${this.isWin ? `You solved it in ${this.guesses.length} guess(es)!` : `The word was: <span class="font-black text-amber-200 tracking-wider">${this.secretWord}</span>`}</p>
              <div class="mt-2 text-xl font-extrabold bg-white/20 py-1 px-3 rounded-lg inline-block">
                Points Earned: +${this.score} pts
              </div>
              <p class="text-xs mt-2 text-white/90">Saved to today's Island Snowman Leaderboard!</p>
              <button id="wordle-done-btn" class="mt-3 w-full py-2 bg-white text-emerald-800 font-bold rounded-lg shadow hover:bg-emerald-50 transition">
                Return to Island ▶
              </button>
            </div>
          `
              : `
            <!-- Keyboard -->
            <div class="w-full max-w-sm mt-1">
              ${keyboardHtml}
            </div>
          `
          }

        </div>
      </div>
    `;

    // Hook listeners
    this.container.querySelector('#close-wordle-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.destroy();
      this.onCloseCallback();
    });

    this.container.querySelector('#wordle-done-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.destroy();
      this.onCloseCallback();
    });

    // Key button clicks
    this.container.querySelectorAll('.key-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        if (!key) return;
        if (key === 'ENTER') {
          this.submitGuess();
        } else if (key === '⌫') {
          this.deleteLetter();
        } else {
          this.addLetter(key);
        }
      });
    });
  }
}
