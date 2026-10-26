import confetti from 'canvas-confetti';
import { familyStore } from '../state/familyStore';
import { QuizQuestion } from '../types';
import { soundAudio } from '../utils/audio';
import { getDailyQuizSet, getTodayDateKey } from '../utils/dailyClock';

export class QuizGame {
  private container: HTMLElement;
  private questions: QuizQuestion[] = [];
  private currentIndex: number = 0;
  private userAnswers: (number | null)[] = [];
  private score: number = 0;
  private timeLeftSeconds: number = 90;
  private timerInterval: number | null = null;
  private isGameOver: boolean = false;
  private isAnsweringLocked: boolean = false;
  private onCloseCallback: () => void;

  constructor(container: HTMLElement, onClose: () => void) {
    this.container = container;
    this.onCloseCallback = onClose;
    this.init();
  }

  private init(): void {
    const today = getTodayDateKey();
    this.questions = getDailyQuizSet(today);
    this.userAnswers = Array(this.questions.length).fill(null);

    // 90-second timer countdown (+30s extension)
    this.timerInterval = window.setInterval(() => {
      if (this.timeLeftSeconds > 0) {
        this.timeLeftSeconds--;
        if (this.timeLeftSeconds === 10) soundAudio.playWrong();
        this.updateTimerDisplay();
      } else {
        this.finishGame();
      }
    }, 1000);

    this.render();
  }

  public destroy(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private selectAnswer(optionIndex: number): void {
    if (this.isAnsweringLocked || this.isGameOver) return;
    this.isAnsweringLocked = true;

    const currentQ = this.questions[this.currentIndex];
    this.userAnswers[this.currentIndex] = optionIndex;
    const isCorrect = optionIndex === currentQ.correctIndex;

    if (isCorrect) {
      this.score += 1;
      soundAudio.playCorrect();
    } else {
      soundAudio.playWrong();
    }

    // Highlight options visually for a brief moment
    const buttons = this.container.querySelectorAll('.quiz-option-btn');
    buttons.forEach((btn, idx) => {
      if (idx === currentQ.correctIndex) {
        btn.classList.add('bg-emerald-600', 'text-white', 'border-emerald-700', 'font-black');
      } else if (idx === optionIndex && !isCorrect) {
        btn.classList.add('bg-rose-600', 'text-white', 'border-rose-700', 'font-black');
      }
    });

    // Advance to next question after 900ms
    setTimeout(() => {
      this.isAnsweringLocked = false;
      if (this.currentIndex + 1 < this.questions.length) {
        this.currentIndex++;
        this.render();
      } else {
        this.finishGame();
      }
    }, 900);
  }

  private finishGame(): void {
    this.isGameOver = true;
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    soundAudio.playVictory();
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

    // Save to active player
    const activePlayer = familyStore.getActivePlayer();
    familyStore.recordGameScore(activePlayer.id, 'quiz', this.score);

    this.render();
  }

  private updateTimerDisplay(): void {
    const timerEl = document.getElementById('quiz-timer');
    const barEl = document.getElementById('quiz-timer-bar');
    if (timerEl) {
      timerEl.textContent = `${this.timeLeftSeconds}s`;
      if (this.timeLeftSeconds <= 10) {
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

  private getCategoryIcon(category: QuizQuestion['category']): string {
    switch (category) {
      case 'Geography':
        return '🌍';
      case 'Science and Nature':
        return '🧬';
      case 'Entertainment':
        return '🎬';
      case 'Sport':
        return '⚽';
      case 'General Knowledge':
        return '💡';
      case 'Music':
        return '🎵';
      default:
        return '⭐';
    }
  }

  private render(): void {
    if (this.isGameOver) {
      this.container.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 overflow-y-auto">
          <div class="relative w-full max-w-lg bg-gradient-to-b from-indigo-900 to-slate-950 rounded-2xl shadow-2xl border-4 border-amber-400 p-5 flex flex-col items-center text-white text-center">
            
            <div class="text-4xl mb-2">🎉 ⛄ 🧠</div>
            <h3 class="text-2xl font-black text-amber-300">QUIZ COMPLETE!</h3>
            <p class="text-sm font-semibold text-indigo-200 mt-1">You answered 15 teen questions in 90 seconds!</p>

            <div class="my-4 py-3 px-6 bg-white/10 rounded-2xl border border-indigo-400/40 inline-block shadow-inner">
              <span class="text-xs font-bold text-amber-200 uppercase tracking-widest block mb-1">Final Quiz Score</span>
              <span class="text-4xl font-black text-emerald-400">${this.score} / 15 pts</span>
            </div>

            <!-- Question Review Breakdown -->
            <div class="w-full max-h-48 overflow-y-auto bg-slate-900/70 border border-indigo-800 rounded-xl p-3 text-left space-y-2 mb-4 text-xs">
              ${this.questions
                .map((q, idx) => {
                  const userAns = this.userAnswers[idx];
                  const isCorrect = userAns === q.correctIndex;
                  return `
                  <div class="flex items-start gap-2 border-b border-indigo-900/60 pb-1.5">
                    <span class="${isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}">${isCorrect ? '✓' : '✗'}</span>
                    <div class="flex-1">
                      <p class="font-semibold text-slate-100">${idx + 1}. ${q.question}</p>
                      <p class="text-[11px] ${isCorrect ? 'text-emerald-300' : 'text-rose-300'}">Correct: ${q.options[q.correctIndex]}</p>
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>

            <p class="text-xs text-indigo-200 mb-3">Saved to today's Island Snowman Leaderboard!</p>

            <button id="quiz-done-btn" class="w-full py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 font-black text-slate-900 rounded-xl shadow-lg transition">
              Return to Island ▶
            </button>
          </div>
        </div>
      `;

      this.container.querySelector('#quiz-done-btn')?.addEventListener('click', () => {
        soundAudio.playButtonClick();
        this.destroy();
        this.onCloseCallback();
      });
      return;
    }

    const currentQ = this.questions[this.currentIndex];
    const catIcon = this.getCategoryIcon(currentQ.category);

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 overflow-y-auto">
        <div class="relative w-full max-w-lg bg-gradient-to-b from-indigo-900 to-slate-950 rounded-2xl shadow-2xl border-4 border-amber-400 p-4 sm:p-5 flex flex-col items-center text-white">
          
          <!-- Header -->
          <div class="w-full flex justify-between items-center border-b border-indigo-700/60 pb-2 mb-2">
            <div class="flex items-center gap-2">
              <span class="text-3xl">🧠</span>
              <div>
                <h2 class="font-extrabold text-lg sm:text-xl text-white leading-tight">Henry-Quiz</h2>
                <p class="text-xs text-amber-300 font-semibold">Observatory • 90s Rapid Teen Trivia (15 Questions)</p>
              </div>
            </div>
            <button id="close-quiz-btn" class="w-8 h-8 rounded-full bg-indigo-800 hover:bg-indigo-700 text-indigo-200 font-bold flex items-center justify-center transition">✕</button>
          </div>

          <!-- Timer & Progress Bar -->
          <div class="w-full flex justify-between items-center px-1 mb-1.5 text-xs font-bold text-indigo-200">
            <div class="flex items-center gap-1.5">
              <span>⏳ Timer:</span>
              <span id="quiz-timer" class="font-black text-base text-amber-300">${this.timeLeftSeconds}s</span>
            </div>
            <div class="text-emerald-300 font-extrabold bg-indigo-800/80 px-2.5 py-0.5 rounded-full border border-indigo-600">
              Score: ${this.score} pts
            </div>
            <div>Question ${this.currentIndex + 1} of ${this.questions.length}</div>
          </div>

          <div class="w-full bg-indigo-950 rounded-full h-2 mb-3.5 overflow-hidden border border-indigo-700">
            <div id="quiz-timer-bar" class="h-2 rounded-full transition-all duration-1000 bg-gradient-to-r from-amber-400 to-emerald-400" style="width: ${(this.timeLeftSeconds / 90) * 100}%"></div>
          </div>

          <!-- Category Pill -->
          <div class="mb-2 px-3 py-1 rounded-full bg-indigo-800/90 border border-indigo-600 text-xs font-bold text-indigo-100 flex items-center gap-1.5 shadow">
            <span>${catIcon}</span>
            <span>${currentQ.category}</span>
          </div>

          <!-- Question Card -->
          <div class="w-full bg-white/10 rounded-2xl p-4 sm:p-5 mb-4 border border-indigo-400/40 shadow-lg text-center">
            <h3 class="text-base sm:text-lg font-bold text-white leading-snug">${currentQ.question}</h3>
          </div>

          <!-- Option Choices -->
          <div class="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            ${currentQ.options
              .map(
                (opt, idx) => `
              <button data-opt-idx="${idx}" class="quiz-option-btn w-full p-3 bg-indigo-800/80 hover:bg-indigo-700 border-2 border-indigo-500 rounded-xl font-bold text-sm text-left flex items-center gap-3 transition transform active:scale-95 shadow">
                <span class="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-400/60 font-black text-xs text-amber-300 flex items-center justify-center shrink-0">
                  ${String.fromCharCode(65 + idx)}
                </span>
                <span class="flex-1">${opt}</span>
              </button>
            `
              )
              .join('')}
          </div>

        </div>
      </div>
    `;

    // Hook listeners
    this.container.querySelector('#close-quiz-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.destroy();
      this.onCloseCallback();
    });

    this.container.querySelectorAll('.quiz-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-opt-idx'));
        this.selectAnswer(idx);
      });
    });

    this.updateTimerDisplay();
  }
}
