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

export function getYesterdayDateKey(todayKey = getTodayDateKey()): string {
  const parts = todayKey.split('-').map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  date.setUTCDate(date.getUTCDate() - 1);
  const prevY = date.getUTCFullYear();
  const prevM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const prevD = String(date.getUTCDate()).padStart(2, '0');
  return `${prevY}-${prevM}-${prevD}`;
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
  return getDailyQuizQuestions(dateKey);
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

/**
 * Checks if the daily boat race is closed for points on a given dateKey.
 * Daily Boat Race closes at 21:00 GMT (UTC).
 * - Past dates: always closed.
 * - Today's date: closed if current UTC hour is >= 21.
 * - Future dates: not closed.
 */
export function isRaceClosedForDate(dateKey: string, now = new Date()): boolean {
  const todayKey = getTodayDateKey(now);
  if (dateKey < todayKey) return true;
  if (dateKey > todayKey) return false;
  return now.getUTCHours() >= 21;
}

/**
 * Information about today's race closing status (21:00 GMT).
 */
export function getRaceClosingStatus(now = new Date()): {
  isClosed: boolean;
  closesAtFormatted: string;
  timeRemainingFormatted: string;
} {
  const isClosed = now.getUTCHours() >= 21;

  // Next 21:00 GMT closing time
  const target = new Date(now);
  target.setUTCHours(21, 0, 0, 0);
  if (now.getUTCHours() >= 21) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const timeRemainingFormatted = `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

  return {
    isClosed,
    closesAtFormatted: '21:00 GMT',
    timeRemainingFormatted
  };
}
