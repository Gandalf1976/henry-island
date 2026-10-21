export type GameType = 'wordle' | 'lake' | 'quiz' | 'wordLadder';

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
      wordLadderScore?: number;
      scavengerScore?: number;
      scavengerFoundIds?: string[];
      scavengerCompleted?: boolean;
      completedGames: GameType[];
      totalDayScore: number;
    };
  };
}

export interface PlayerScoreStats {
  todayScore: number;
  cumulativeScore: number;
  daysPlayed: number;
  averageScore: number;
}

export interface BulletinMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarId: string;
  content: string;
  createdAt: string; // ISO string
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

export interface WordLadderPuzzle {
  startWord: string;
  targetWord: string;
  minSteps: number;
  samplePath?: string[];
}

export interface WordLadderRung {
  word: string;
  changedIndex: number;
}

export interface WordLadderState {
  puzzle: WordLadderPuzzle;
  ladder: string[]; // [startWord, rung1, rung2, ...]
  isComplete: boolean;
  isWin: boolean;
  score: number;
  maxSteps: number;
}

export interface ScavengerItemDef {
  id: string;
  name: string;
  emoji: string;
  icon: string;
  hint: string;
  locationName: string;
  x: number;
  y: number;
  z: number;
  color: number;
}
