export type GameType = 'wordle' | 'lake' | 'quiz';

export interface AvatarDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
  hatColor: string;
  description: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatarId: string;
  totalScore: number;
  streak: number;
  lastPlayedDate: string; // YYYY-MM-DD
  history: {
    [date: string]: {
      wordleScore?: number;
      lakeScore?: number;
      quizScore?: number;
      completedGames: GameType[];
      totalDayScore: number;
    };
  };
}

export interface DailyChallengeInfo {
  dateKey: string;
  wordleSecret: string;
  lakeNineLetterWord: string;
  quizQuestionIds: number[];
}

export interface QuizQuestion {
  id: number;
  category: 'Geography' | 'Science and Nature' | 'Entertainment' | 'Sport' | 'General Knowledge' | 'Music';
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface WordleGuessEvaluation {
  letter: string;
  status: 'correct' | 'present' | 'absent';
}

export interface WordleState {
  guesses: string[];
  evaluations: WordleGuessEvaluation[][];
  maxAttempts: number;
  isComplete: boolean;
  isWin: boolean;
  score: number;
}

export interface LakeFoundWord {
  word: string;
  points: number;
  isNineLetterBonus: boolean;
}

export interface LakeState {
  nineLetterWord: string;
  scrambledLetters: string[];
  foundWords: LakeFoundWord[];
  timeLeftSeconds: number;
  score: number;
  isComplete: boolean;
}

export interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  userAnswers: (number | null)[];
  score: number;
  timeLeftSeconds: number;
  isComplete: boolean;
}

export interface IslandPortal {
  id: GameType;
  title: string;
  subtitle: string;
  icon: string;
  x: number;
  y: number;
  radius: number;
}

export interface SnowmanVisualTier {
  minScore: number;
  name: string;
  baseRadius: number;
  midRadius: number;
  headRadius: number;
  hasCarrot: boolean;
  hasButtons: boolean;
  hasScarf: boolean;
  hasTopHat: boolean;
  hasArms: boolean;
  hasFairyLights: boolean;
}
