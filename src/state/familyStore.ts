import { AVATAR_ROSTER, DEFAULT_FAMILY_MEMBERS } from '../data/avatars';
import { BulletinMessage, GameType, PlayerProfile, PlayerScoreStats } from '../types';
import { getTodayDateKey, getYesterdayDateKey } from '../utils/dailyClock';

const STORAGE_KEY = 'henry_island_family_data_v1';
const ACTIVE_PLAYER_KEY = 'henry_island_active_player_id';
const DEVICE_LOCK_KEY = 'henry_island_device_player_id';
const MESSAGES_KEY = 'henry_island_bulletin_messages_v1';
const LAST_READ_MSG_KEY = 'henry_island_last_read_msg_ts';

export interface LeaderboardEntry {
  rank: number;
  player: PlayerProfile;
  stats: PlayerScoreStats;
  isPodium: boolean;
}

export interface DailyParticipantResult {
  rank: number;
  player: PlayerProfile;
  totalDayScore: number;
  completedGames: GameType[];
  wordleScore?: number;
  lakeScore?: number;
  quizScore?: number;
  wordLadderScore?: number;
  target24Score?: number;
  scavengerScore?: number;
}

export interface PreviousDayRankingResult {
  dateKey: string;
  dateFormatted: string;
  entries: DailyParticipantResult[];
  hasParticipants: boolean;
}

class FamilyStore {
  private players: PlayerProfile[] = [];
  private activePlayerId: string = '';
  private messages: BulletinMessage[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.load();
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  public notify(): void {
    this.save();
    this.listeners.forEach(fn => fn());
  }

  private load(): void {
    // 1. Load players
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.players = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved family roster from storage, resetting to defaults:', e);
    }

    if (this.players.length === 0) {
      this.players = DEFAULT_FAMILY_MEMBERS.map((m, idx) => ({
        id: 'player_' + (idx + 1),
        name: m.name,
        avatarId: m.avatarId,
        totalScore: 0,
        streak: 0,
        lastPlayedDate: '',
        history: {}
      }));
    }

    // 2. Resolve active player (prioritize device lock)
    const lockedId = localStorage.getItem(DEVICE_LOCK_KEY);
    const savedActiveId = localStorage.getItem(ACTIVE_PLAYER_KEY);

    if (lockedId && this.players.some(p => p.id === lockedId)) {
      this.activePlayerId = lockedId;
    } else if (savedActiveId && this.players.some(p => p.id === savedActiveId)) {
      this.activePlayerId = savedActiveId;
    } else {
      this.activePlayerId = this.players[0].id;
    }

    // 3. Load bulletin messages
    try {
      const rawMsgs = localStorage.getItem(MESSAGES_KEY);
      if (rawMsgs) {
        const parsedMsgs = JSON.parse(rawMsgs);
        if (Array.isArray(parsedMsgs)) {
          this.messages = parsedMsgs;
        }
      }
    } catch (e) {
      console.warn('Failed to load bulletin messages:', e);
    }

    // Default sample holiday welcome message if empty
    if (this.messages.length === 0) {
      this.messages = [
        {
          id: 'welcome_msg_1',
          authorId: 'player_1',
          authorName: 'Santa Explorer',
          authorAvatarId: 'santa',
          content: '🎄 Welcome to Henry Island! Check the daily games and leave a message on the board! 🎅❄️',
          createdAt: new Date().toISOString()
        }
      ];
    }
  }

  public save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.players));
      localStorage.setItem(ACTIVE_PLAYER_KEY, this.activePlayerId);
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(this.messages));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  // --- Device Identity Locking ---

  public isDeviceLocked(): boolean {
    const lockedId = localStorage.getItem(DEVICE_LOCK_KEY);
    return Boolean(lockedId && this.players.some(p => p.id === lockedId));
  }

  public getLockedPlayerId(): string | null {
    const lockedId = localStorage.getItem(DEVICE_LOCK_KEY);
    if (lockedId && this.players.some(p => p.id === lockedId)) {
      return lockedId;
    }
    return null;
  }

  public lockDeviceToPlayer(playerId: string): void {
    if (this.players.some(p => p.id === playerId)) {
      localStorage.setItem(DEVICE_LOCK_KEY, playerId);
      this.activePlayerId = playerId;
      this.notify();
    }
  }

  public unlockDevice(): void {
    localStorage.removeItem(DEVICE_LOCK_KEY);
    this.notify();
  }

  // --- Player Management ---

  public getPlayers(): PlayerProfile[] {
    return [...this.players];
  }

  public getActivePlayer(): PlayerProfile {
    const found = this.players.find(p => p.id === this.activePlayerId);
    if (found) return found;
    return this.players[0] || {
      id: 'player_fallback',
      name: 'Islander',
      avatarId: 'santa',
      totalScore: 0,
      streak: 0,
      lastPlayedDate: '',
      history: {}
    };
  }

  public setActivePlayerId(id: string): void {
    if (this.players.some(p => p.id === id)) {
      this.activePlayerId = id;
      this.notify();
    }
  }

  public addPlayer(name: string, avatarId: string): PlayerProfile {
    const newPlayer: PlayerProfile = {
      id: 'player_' + Date.now(),
      name: name.trim() || 'New Islander',
      avatarId: AVATAR_ROSTER.some(a => a.id === avatarId) ? avatarId : AVATAR_ROSTER[0].id,
      totalScore: 0,
      streak: 0,
      lastPlayedDate: '',
      history: {}
    };
    this.players.push(newPlayer);
    this.activePlayerId = newPlayer.id;
    this.notify();
    return newPlayer;
  }

  public updatePlayer(playerId: string, name: string, avatarId: string): boolean {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;
    if (name.trim()) player.name = name.trim();
    if (AVATAR_ROSTER.some(a => a.id === avatarId)) player.avatarId = avatarId;
    this.notify();
    return true;
  }

  public deletePlayer(playerId: string): boolean {
    if (this.players.length <= 1) return false; // keep at least 1 player
    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) return false;
    this.players.splice(index, 1);
    if (this.activePlayerId === playerId) {
      this.activePlayerId = this.players[0].id;
      if (localStorage.getItem(DEVICE_LOCK_KEY) === playerId) {
        localStorage.removeItem(DEVICE_LOCK_KEY);
      }
    }
    this.notify();
    return true;
  }

  // --- Score Statistics & Leaderboard ---

  public getPlayerScoreStats(player: PlayerProfile, dateKey = getTodayDateKey()): PlayerScoreStats {
    const todayRecord = player.history?.[dateKey];
    const todayScore = todayRecord ? (todayRecord.totalDayScore || 0) : 0;

    let daysPlayed = 0;
    let cumulativeScore = 0;

    const dates = Object.keys(player.history || {});
    for (const d of dates) {
      const rec = player.history[d];
      if (rec && ((rec.completedGames && rec.completedGames.length > 0) || (rec.totalDayScore || 0) > 0)) {
        daysPlayed += 1;
        cumulativeScore += rec.totalDayScore || 0;
      }
    }

    // Fallback if legacy player has totalScore but empty history
    if (cumulativeScore === 0 && player.totalScore > 0) {
      cumulativeScore = player.totalScore;
      daysPlayed = 1;
    }

    const averageScore = daysPlayed > 0 ? Number((cumulativeScore / daysPlayed).toFixed(1)) : 0;

    return {
      todayScore,
      cumulativeScore,
      daysPlayed,
      averageScore
    };
  }

  public getLeaderboard(dateKey = getTodayDateKey()): LeaderboardEntry[] {
    const list = this.players.map(p => ({
      player: p,
      stats: this.getPlayerScoreStats(p, dateKey)
    }));

    // Sort primarily by average score descending, tie break by cumulativeScore
    list.sort((a, b) => {
      if (b.stats.averageScore !== a.stats.averageScore) {
        return b.stats.averageScore - a.stats.averageScore;
      }
      return b.stats.cumulativeScore - a.stats.cumulativeScore;
    });

    return list.map((item, idx) => ({
      rank: idx + 1,
      player: item.player,
      stats: item.stats,
      isPodium: idx < 3
    }));
  }

  // --- Previous Day Ranking & Winners ---

  public getPreviousDayRanking(targetDateKey?: string): PreviousDayRankingResult {
    const dateKey = targetDateKey || getYesterdayDateKey(getTodayDateKey());
    
    let dateFormatted = dateKey;
    try {
      const [y, m, d] = dateKey.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      dateFormatted = dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      dateFormatted = dateKey;
    }

    const participants: Omit<DailyParticipantResult, 'rank'>[] = [];

    for (const player of this.players) {
      const rec = player.history?.[dateKey];
      if (rec && ((rec.completedGames && rec.completedGames.length > 0) || (rec.totalDayScore || 0) > 0)) {
        participants.push({
          player,
          totalDayScore: rec.totalDayScore || 0,
          completedGames: rec.completedGames || [],
          wordleScore: rec.wordleScore,
          lakeScore: rec.lakeScore,
          quizScore: rec.quizScore,
          wordLadderScore: rec.wordLadderScore,
          target24Score: rec.target24Score,
          scavengerScore: rec.scavengerScore
        });
      }
    }

    // Sort descending by totalDayScore, then by completedGames count, then player name
    participants.sort((a, b) => {
      if (b.totalDayScore !== a.totalDayScore) {
        return b.totalDayScore - a.totalDayScore;
      }
      if (b.completedGames.length !== a.completedGames.length) {
        return b.completedGames.length - a.completedGames.length;
      }
      return a.player.name.localeCompare(b.player.name);
    });

    const entries: DailyParticipantResult[] = participants.map((p, idx) => ({
      ...p,
      rank: idx + 1
    }));

    return {
      dateKey,
      dateFormatted,
      entries,
      hasParticipants: entries.length > 0
    };
  }

  // --- Game Status & Daily Logic ---

  public isGameCompletedToday(playerId: string, gameType: GameType, dateKey = getTodayDateKey()): boolean {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;
    const dayRecord = player.history?.[dateKey];
    if (!dayRecord) return false;
    return dayRecord.completedGames?.includes(gameType) ?? false;
  }

  public getUnplayedGamesToday(playerId: string, dateKey = getTodayDateKey()): GameType[] {
    const allGames: GameType[] = ['wordle', 'lake', 'quiz', 'wordLadder', 'target24'];
    const player = this.players.find(p => p.id === playerId);
    if (!player) return allGames;
    const dayRecord = player.history?.[dateKey];
    if (!dayRecord) return allGames;
    return allGames.filter(g => !dayRecord.completedGames?.includes(g));
  }

  public recordGameScore(playerId: string, gameType: GameType, score: number, dateKey = getTodayDateKey()): boolean {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;

    if (!player.history) player.history = {};

    if (!player.history[dateKey]) {
      player.history[dateKey] = {
        completedGames: [],
        totalDayScore: 0
      };
    }

    const dayRecord = player.history[dateKey];
    if (dayRecord.completedGames.includes(gameType)) {
      return false; // Already played today
    }

    dayRecord.completedGames.push(gameType);
    dayRecord.totalDayScore += score;
    player.totalScore = (player.totalScore || 0) + score;

    if (gameType === 'wordle') dayRecord.wordleScore = score;
    if (gameType === 'lake') dayRecord.lakeScore = score;
    if (gameType === 'quiz') dayRecord.quizScore = score;
    if (gameType === 'wordLadder') dayRecord.wordLadderScore = score;
    if (gameType === 'target24') dayRecord.target24Score = score;

    // Update streak logic
    if (player.lastPlayedDate !== dateKey) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = getTodayDateKey(yesterday);

      if (player.lastPlayedDate === yesterdayKey) {
        player.streak = (player.streak || 0) + 1;
      } else {
        player.streak = 1;
      }
      player.lastPlayedDate = dateKey;
    }

    this.notify();
    return true;
  }

  // --- Dad Reset Day Feature ---

  public isDadActive(): boolean {
    const active = this.getActivePlayer();
    return active.name.trim().toLowerCase() === 'dad';
  }

  public resetTodayForDad(dateKey = getTodayDateKey()): boolean {
    const active = this.getActivePlayer();
    if (active.name.trim().toLowerCase() !== 'dad') {
      return false; // Only Dad can reset his day
    }

    const dayRecord = active.history?.[dateKey];
    if (dayRecord) {
      const dayScore = dayRecord.totalDayScore || 0;
      active.totalScore = Math.max(0, (active.totalScore || 0) - dayScore);
      dayRecord.totalDayScore = 0;
      dayRecord.completedGames = [];
      dayRecord.wordleScore = undefined;
      dayRecord.lakeScore = undefined;
      dayRecord.quizScore = undefined;
      dayRecord.wordLadderScore = undefined;
      dayRecord.target24Score = undefined;
      dayRecord.scavengerScore = undefined;
      dayRecord.scavengerFoundIds = [];
      dayRecord.scavengerCompleted = false;
    }

    this.notify();
    return true;
  }

  // --- Scavenger Hunt Tracking ---

  public getScavengerFoundIds(playerId?: string, dateKey = getTodayDateKey()): string[] {
    const p = playerId ? this.players.find(x => x.id === playerId) : this.getActivePlayer();
    if (!p || !p.history || !p.history[dateKey]) return [];
    return p.history[dateKey].scavengerFoundIds || [];
  }

  public isScavengerCompleted(playerId?: string, dateKey = getTodayDateKey()): boolean {
    const p = playerId ? this.players.find(x => x.id === playerId) : this.getActivePlayer();
    if (!p || !p.history || !p.history[dateKey]) return false;
    return Boolean(p.history[dateKey].scavengerCompleted);
  }

  public recordScavengerItemFound(
    itemId: string,
    playerId?: string,
    dateKey = getTodayDateKey()
  ): { newlyFound: boolean; completedAll: boolean; pointsAwarded: number } {
    const p = playerId ? this.players.find(x => x.id === playerId) : this.getActivePlayer();
    if (!p) return { newlyFound: false, completedAll: false, pointsAwarded: 0 };

    if (!p.history) p.history = {};
    if (!p.history[dateKey]) {
      p.history[dateKey] = {
        completedGames: [],
        totalDayScore: 0,
        scavengerFoundIds: [],
        scavengerCompleted: false
      };
    }

    const dayRecord = p.history[dateKey];
    if (!dayRecord.scavengerFoundIds) {
      dayRecord.scavengerFoundIds = [];
    }

    if (dayRecord.scavengerFoundIds.includes(itemId)) {
      return { newlyFound: false, completedAll: Boolean(dayRecord.scavengerCompleted), pointsAwarded: 0 };
    }

    dayRecord.scavengerFoundIds.push(itemId);
    let pointsAwarded = 0;
    let completedAll = false;

    // Check if all 5 items found
    if (dayRecord.scavengerFoundIds.length >= 5 && !dayRecord.scavengerCompleted) {
      dayRecord.scavengerCompleted = true;
      dayRecord.scavengerScore = 2;
      dayRecord.totalDayScore = (dayRecord.totalDayScore || 0) + 2;
      p.totalScore = (p.totalScore || 0) + 2;
      pointsAwarded = 2;
      completedAll = true;
    }

    this.notify();
    return { newlyFound: true, completedAll, pointsAwarded };
  }

  // --- Bulletin Board / Message Board ---

  public getMessages(): BulletinMessage[] {
    return [...this.messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public postMessage(content: string, authorPlayer?: PlayerProfile): BulletinMessage {
    const author = authorPlayer || this.getActivePlayer();
    const newMsg: BulletinMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      authorId: author.id,
      authorName: author.name,
      authorAvatarId: author.avatarId,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };
    this.messages.unshift(newMsg);
    // Keep max 50 recent messages
    if (this.messages.length > 50) {
      this.messages = this.messages.slice(0, 50);
    }
    this.markMessagesAsRead();
    this.notify();
    return newMsg;
  }

  public getUnreadMessageCount(): number {
    const lastReadTs = Number(localStorage.getItem(LAST_READ_MSG_KEY) || '0');
    return this.messages.filter(m => new Date(m.createdAt).getTime() > lastReadTs).length;
  }

  public markMessagesAsRead(): void {
    localStorage.setItem(LAST_READ_MSG_KEY, String(Date.now()));
  }

  // --- Remote Reconcile / Live Cloud Merge ---

  public mergeRemoteData(remotePlayers?: PlayerProfile[], remoteMessages?: BulletinMessage[]): boolean {
    let changed = false;

    // 1. Merge players
    if (Array.isArray(remotePlayers) && remotePlayers.length > 0) {
      for (const remoteP of remotePlayers) {
        const localP = this.players.find(p => p.id === remoteP.id);
        if (!localP) {
          // New player from another device!
          this.players.push(remoteP);
          changed = true;
        } else {
          // Update player info if remote has higher score or more history
          if (remoteP.name && remoteP.name !== localP.name) {
            localP.name = remoteP.name;
            changed = true;
          }
          if (remoteP.avatarId && remoteP.avatarId !== localP.avatarId) {
            localP.avatarId = remoteP.avatarId;
            changed = true;
          }
          if ((remoteP.totalScore || 0) > (localP.totalScore || 0)) {
            localP.totalScore = remoteP.totalScore;
            changed = true;
          }
          if ((remoteP.streak || 0) > (localP.streak || 0)) {
            localP.streak = remoteP.streak;
            changed = true;
          }

          // Deep merge history
          if (remoteP.history) {
            if (!localP.history) localP.history = {};
            for (const dateKey of Object.keys(remoteP.history)) {
              const remoteDay = remoteP.history[dateKey];
              const localDay = localP.history[dateKey];
              if (!localDay) {
                localP.history[dateKey] = { ...remoteDay };
                changed = true;
              } else {
                // Merge completed games
                const mergedCompleted = Array.from(new Set([
                  ...(localDay.completedGames || []),
                  ...(remoteDay.completedGames || [])
                ]));
                if (mergedCompleted.length !== (localDay.completedGames || []).length) {
                  localDay.completedGames = mergedCompleted;
                  changed = true;
                }
                if ((remoteDay.totalDayScore || 0) > (localDay.totalDayScore || 0)) {
                  localDay.totalDayScore = remoteDay.totalDayScore;
                  changed = true;
                }
                if (remoteDay.wordleScore !== undefined && (localDay.wordleScore === undefined || remoteDay.wordleScore > localDay.wordleScore)) {
                  localDay.wordleScore = remoteDay.wordleScore;
                  changed = true;
                }
                if (remoteDay.lakeScore !== undefined && (localDay.lakeScore === undefined || remoteDay.lakeScore > localDay.lakeScore)) {
                  localDay.lakeScore = remoteDay.lakeScore;
                  changed = true;
                }
                if (remoteDay.quizScore !== undefined && (localDay.quizScore === undefined || remoteDay.quizScore > localDay.quizScore)) {
                  localDay.quizScore = remoteDay.quizScore;
                  changed = true;
                }
                if (remoteDay.wordLadderScore !== undefined && (localDay.wordLadderScore === undefined || remoteDay.wordLadderScore > localDay.wordLadderScore)) {
                  localDay.wordLadderScore = remoteDay.wordLadderScore;
                  changed = true;
                }
                if (remoteDay.target24Score !== undefined && (localDay.target24Score === undefined || remoteDay.target24Score > localDay.target24Score)) {
                  localDay.target24Score = remoteDay.target24Score;
                  changed = true;
                }
                if (remoteDay.scavengerScore !== undefined && (localDay.scavengerScore === undefined || remoteDay.scavengerScore > localDay.scavengerScore)) {
                  localDay.scavengerScore = remoteDay.scavengerScore;
                  changed = true;
                }
              }
            }
          }
        }
      }
    }

    // 2. Merge messages
    if (Array.isArray(remoteMessages) && remoteMessages.length > 0) {
      for (const rMsg of remoteMessages) {
        if (!this.messages.some(m => m.id === rMsg.id)) {
          this.messages.push(rMsg);
          changed = true;
        }
      }
      this.messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (this.messages.length > 50) {
        this.messages = this.messages.slice(0, 50);
      }
    }

    if (changed) {
      this.save();
      this.listeners.forEach(fn => fn());
    }

    return changed;
  }

  // --- Export / Import JSON Fallback ---

  public exportDataJson(): string {
    return JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      players: this.players,
      messages: this.messages
    }, null, 2);
  }

  public importDataJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.players) && parsed.players.length > 0) {
        this.players = parsed.players;
        if (Array.isArray(parsed.messages)) {
          this.messages = parsed.messages;
        }
        if (!this.players.some(p => p.id === this.activePlayerId)) {
          this.activePlayerId = this.players[0].id;
        }
        this.notify();
        return true;
      }
    } catch (e) {
      console.error('Invalid import data:', e);
    }
    return false;
  }
}

export const familyStore = new FamilyStore();
