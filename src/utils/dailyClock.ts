import { FALLBACK_ANSWERS } from '../data/wordleWords';
import { NINE_LETTER_ROOTS } from '../data/nineLetterWords';
import { getDailyQuizQuestions } from '../data/quizQuestions';
import { DailyChallengeInfo, QuizQuestion } from '../types';

export function getTodayDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDateSeed(dateKey: string): number {
  // Simple deterministic hash of the date string
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    const char = dateKey.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getDailyWordleWord(dateKey: string, answersList = FALLBACK_ANSWERS): string {
  const seed = getDateSeed(dateKey + '-wordle');
  const index = seed % answersList.length;
  return answersList[index].toUpperCase();
}

export function getDailyLakeWord(dateKey: string): string {
  const seed = getDateSeed(dateKey + '-lake');
  const index = seed % NINE_LETTER_ROOTS.length;
  return NINE_LETTER_ROOTS[index].toUpperCase();
}

export function getDailyQuizSet(dateKey: string): QuizQuestion[] {
  const seed = getDateSeed(dateKey + '-quiz');
  return getDailyQuizQuestions(seed);
}

export function getDailyChallenge(dateKey = getTodayDateKey()): DailyChallengeInfo {
  return {
    dateKey,
    wordleSecret: getDailyWordleWord(dateKey),
    lakeNineLetterWord: getDailyLakeWord(dateKey),
    quizQuestionIds: getDailyQuizSet(dateKey).map(q => q.id)
  };
}

export function getTimeUntilMidnight(): { hours: number; minutes: number; seconds: number; formatted: string } {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  const diffMs = Math.max(0, midnight.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  return { hours, minutes, seconds, formatted };
}
