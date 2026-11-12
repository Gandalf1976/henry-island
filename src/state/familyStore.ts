import { AVATAR_ROSTER, DEFAULT_FAMILY_MEMBERS } from '../data/avatars';
import { BulletinMessage, GameType, PlayerProfile, PlayerScoreStats } from '../types';
import { getTodayDateKey, getYesterdayDateKey, isRaceClosedForDate } from '../utils/dailyClock';
import { ADVENT_START, getDoor, adventDayFor, ADVENT_COSMETICS, AdventDoor } from '../data/advent';

const STORAGE_KEY = 'henry_island_family_data_v1';
const ACTIVE_PLAYER_KEY = 'henry_island_active_player_id';
const DEVICE_LOCK_KEY = 'henry_island_device_player_id';
const MESSAGES_KEY = 'henry_island_bulletin_messages_v1';
const LAST_READ_MSG_KEY = 'henry_island_last_read_msg_ts';
const DELETED_KEY = 'henry_island_deleted_players_v1';
// Deletion tombstones stay on the sync wire for 30 days (ntfy re-delivers
// old broadcasts — without a tombstone a removed player would come back).
const TOMBSTONE_SYNC_WINDOW = 30 * 24 * 3600 * 1000;
const TOMBSTONE_MAX = 50;

export interface AdventOpenResult {
  ok: boolean;
  already?: boolean;
  door?: AdventDoor;
  grantedPoints: number;
  unlockedCosmetic?: string;
  message: string;
}

export interface RaceLeaderboardEntry {
  rank: number;
  player: PlayerProfile;
  timeMs: number;
  points: number;
}

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
  raceScore?: number;
  raceTimeMs?: number;
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
  private deletedPlayers: { id: string; ts: number }[] = [];
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

    // Deletion tombstones: players removed on any device. They keep the
    // union-merge from resurrecting someone the family deleted.
    try {
      const rawDeleted = localStorage.getItem(DELETED_KEY);
      if (rawDeleted) {
        const parsedDeleted = JSON.parse(rawDeleted);
        if (Array.isArray(parsedDeleted)) {
          this.deletedPlayers = parsedDeleted.filter((d) => d && typeof d.id === 'string');
        }
      }
    } catch (e) {
      console.warn('Failed to parse deletion tombstones, ignoring:', e);
    }
    if (this.deletedPlayers.length > 0) {
      const deleted = new Set(this.deletedPlayers.map((d) => d.id));
      this.players = this.players.filter((p) => !deleted.has(p.id));
    }
    if (this.players.length === 0) {
      // Everything was deleted — recover with the default family.
      this.deletedPlayers = [];
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

    // Reset advent state for any player on a stale calendar session.
    let adventChanged = false;
    for (const p of this.players) {
      if (p.adventSession !== ADVENT_START) {
        p.adventSession = ADVENT_START;
        p.adventOpened = 0;
        p.adventUnlocked = 0;
        p.adventCosmetic = '';
        adventChanged = true;
      }
    }

    // Prune ghost players accumulated by duplicate cross-device adds
    this.pruneGhostPlayers();

    if (adventChanged) this.save();

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
      localStorage.setItem(DELETED_KEY, JSON.stringify(this.deletedPlayers));
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
    const trimmed = name.trim();
    // Return existing profile if player with this exact name already exists
    const existing = this.players.find(p => p.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      this.activePlayerId = existing.id;
      this.notify();
      return existing;
    }

    const newPlayer: PlayerProfile = {
      id: 'player_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: trimmed || 'New Islander',
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
    // Tombstone the deletion so live sync can never resurrect the player.
    this.markPlayerDeleted(playerId);
    this.notify();
    return true;
  }

  /** Record a deletion tombstone (persisted, and synced to the family). */
  public markPlayerDeleted(playerId: string): void {
    if (!playerId) return;
    this.deletedPlayers = this.deletedPlayers.filter(d => d.id !== playerId);
    this.deletedPlayers.push({ id: playerId, ts: Date.now() });
    if (this.deletedPlayers.length > TOMBSTONE_MAX) {
      this.deletedPlayers = this.deletedPlayers.slice(-TOMBSTONE_MAX);
    }
  }

  public getDeletedPlayerIds(): string[] {
    return this.deletedPlayers.map(d => d.id);
  }

  /** Tombstones still worth syncing (recent 30 days) — keeps the wire small. */
  public getSyncableDeletedIds(): string[] {
    const cutoff = Date.now() - TOMBSTONE_SYNC_WINDOW;
    return this.deletedPlayers.filter(d => d.ts >= cutoff).map(d => d.id);
  }

  /**
   * Apply deletions reported by another device: record tombstones and drop
   * the players from the local roster (honouring the "at least one player"
   * invariant — a device never deletes its only player).
   */
  public applyRemoteDeletions(ids: string[]): { removedNames: string[]; changed: boolean } {
    const removedNames: string[] = [];
    let changed = false;
    for (const id of ids) {
      if (!id || typeof id !== 'string') continue;
      const idx = this.players.findIndex(p => p.id === id);
      const present = idx !== -1;
      // Tombstone players we drop — or that aren't here (so they never get
      // re-added). If it's our only player we keep it and take no tombstone.
      if (!present || this.players.length > 1) {
        if (!this.deletedPlayers.some(d => d.id === id)) {
          this.markPlayerDeleted(id);
          changed = true;
        }
      }
      if (present && this.players.length > 1) {
        const [removed] = this.players.splice(idx, 1);
        removedNames.push(removed.name);
        if (this.activePlayerId === id) {
          this.activePlayerId = this.players[0].id;
          if (localStorage.getItem(DEVICE_LOCK_KEY) === id) {
            localStorage.removeItem(DEVICE_LOCK_KEY);
          }
        }
        changed = true;
      }
    }
    if (changed) {
      this.save();
      this.listeners.forEach(fn => fn());
    }
    return { removedNames, changed };
  }

  // --- Score Statistics & Leaderboard ---

  public getPlayerScoreStats(player: PlayerProfile, dateKey = getTodayDateKey()): PlayerScoreStats {
    const todayRecord = player.history?.[dateKey];
    const todayScore = (todayRecord ? (todayRecord.totalDayScore || 0) : 0) + this.getPlayerRacePoints(player.id, dateKey);

    let daysPlayed = 0;
    let cumulativeScore = 0;

    const dates = Object.keys(player.history || {});
    for (const d of dates) {
      const rec = player.history[d];
      const racePts = this.getPlayerRacePoints(player.id, d);
      if (rec && ((rec.completedGames && rec.completedGames.length > 0) || (rec.totalDayScore || 0) > 0 || rec.raceTimeMs !== undefined)) {
        daysPlayed += 1;
        cumulativeScore += (rec.totalDayScore || 0) + racePts;
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
    
    // Ensure race scores for the date are locked and points computed
    this.lockRaceScoresForDate(dateKey);

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
      const racePts = this.getPlayerRacePoints(player.id, dateKey);
      const totalDayScore = (rec?.totalDayScore || 0) + racePts;
      const hasGames = rec?.completedGames && rec.completedGames.length > 0;
      const hasRace = rec?.raceTimeMs !== undefined;

      if (rec && (hasGames || totalDayScore > 0 || hasRace)) {
        participants.push({
          player,
          totalDayScore,
          completedGames: rec.completedGames || [],
          wordleScore: rec.wordleScore,
          lakeScore: rec.lakeScore,
          quizScore: rec.quizScore,
          wordLadderScore: rec.wordLadderScore,
          target24Score: rec.target24Score,
          scavengerScore: rec.scavengerScore,
          raceScore: racePts > 0 ? racePts : undefined,
          raceTimeMs: rec.raceTimeMs
        });
      }
    }

    // Sort descending by totalDayScore, then by total completed activities, then player name
    participants.sort((a, b) => {
      if (b.totalDayScore !== a.totalDayScore) {
        return b.totalDayScore - a.totalDayScore;
      }
      const aCount = a.completedGames.length + (a.raceTimeMs ? 1 : 0);
      const bCount = b.completedGames.length + (b.raceTimeMs ? 1 : 0);
      if (bCount !== aCount) {
        return bCount - aCount;
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

    // Advent variant day: the day's door multiplies this game's payout.
    let finalScore = score;
    const advDay = adventDayFor(dateKey);
    const advDoor = advDay > 0 ? getDoor(advDay) : undefined;
    if (advDoor && advDoor.type === 'variant' && advDoor.variantGame === gameType && advDoor.variantMult) {
      finalScore = score * advDoor.variantMult;
    }

    dayRecord.completedGames.push(gameType);
    dayRecord.totalDayScore += finalScore;
    player.totalScore = (player.totalScore || 0) + finalScore;

    if (gameType === 'wordle') dayRecord.wordleScore = finalScore;
    if (gameType === 'lake') dayRecord.lakeScore = finalScore;
    if (gameType === 'quiz') dayRecord.quizScore = finalScore;
    if (gameType === 'wordLadder') dayRecord.wordLadderScore = finalScore;
    if (gameType === 'target24') dayRecord.target24Score = finalScore;

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

  // --- Boat Race (daily, repeatable; best time counts) ---

  /** Points table by race rank: 1st=15, 2nd=12, 3rd=10, 4th=8, 5th=5, 6th=3. */
  static readonly RACE_POINTS_TABLE: number[] = [15, 12, 10, 8, 5, 3];

  /** All players who completed the race on a given date, fastest first. */
  public getRacersForDate(dateKey: string): { player: PlayerProfile; timeMs: number }[] {
    const racers = this.players
      .map(p => ({ player: p, timeMs: p.history?.[dateKey]?.raceTimeMs }))
      .filter((r): r is { player: PlayerProfile; timeMs: number } => r.timeMs !== undefined && r.timeMs > 0);
    racers.sort((a, b) => a.timeMs - b.timeMs);
    return racers;
  }

  /**
   * Daily race leaderboard. Identical times share the same rank (and points);
   * the next distinct time takes its true position. Points follow
   * RACE_POINTS_TABLE by rank; anything beyond 6th scores nothing.
   */
  public getRaceLeaderboard(dateKey: string = getTodayDateKey()): RaceLeaderboardEntry[] {
    const racers = this.getRacersForDate(dateKey);
    const ranks: number[] = new Array(racers.length);
    for (let i = 0; i < racers.length; i++) {
      if (i > 0 && racers[i].timeMs === racers[i - 1].timeMs) {
        ranks[i] = ranks[i - 1]; // tied: same rank, same points
      } else {
        ranks[i] = i + 1;
      }
    }
    return racers.map((r, i) => ({
      rank: ranks[i],
      player: r.player,
      timeMs: r.timeMs,
      points: FamilyStore.RACE_POINTS_TABLE[ranks[i] - 1] ?? 0
    }));
  }

  /**
   * Records a completed race. Only an IMPROVED best time is stored (lower
   * is better); the merge is min-only so personal bests never regress.
   * If the race is already closed for points (past 21:00 GMT), earlier racers
   * remain locked and new racers are locked with 0 daily points (practice mode).
   */
  public recordRaceTime(playerId: string, timeMs: number, dateKey: string = getTodayDateKey()): boolean {
    const player = this.players.find(p => p.id === playerId);
    if (!player || timeMs <= 0) return false;
    if (!player.history) player.history = {};
    if (!player.history[dateKey]) {
      player.history[dateKey] = { completedGames: [], totalDayScore: 0 };
    }
    const dayRecord = player.history[dateKey];

    const isClosed = isRaceClosedForDate(dateKey);
    // If race is closed for points for this date, ensure earlier racers are locked
    if (isClosed) {
      this.lockRaceScoresForDate(dateKey);
    }

    if (dayRecord.raceTimeMs !== undefined && dayRecord.raceTimeMs <= timeMs) {
      return false; // not a personal best
    }
    dayRecord.raceTimeMs = timeMs;

    // If the race was already closed and this player had not already locked points from before cutoff,
    // lock them at 0 pts so post-cutoff practice runs don't alter standings
    if (isClosed && !dayRecord.raceLocked) {
      dayRecord.raceLocked = true;
      dayRecord.raceLockedPoints = 0;
    }

    this.notify();
    return true;
  }

  /**
   * Race points for a player on a date.
   * - If closed (past day or today >= 21:00 GMT): returns locked points (auto-locks if needed).
   * - If open (today < 21:00 GMT): derived from the current daily leaderboard (re-ranks live).
   */
  public getPlayerRacePoints(playerId: string, dateKey: string = getTodayDateKey()): number {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return 0;
    const rec = player.history?.[dateKey];
    if (!rec || rec.raceTimeMs === undefined) return 0;
    if (rec.raceLocked) return rec.raceLockedPoints ?? 0;

    // If race is closed for this date (e.g. past day or after 21:00 GMT today), lock now
    if (isRaceClosedForDate(dateKey)) {
      this.lockRaceScoresForDate(dateKey);
      return rec.raceLockedPoints ?? 0;
    }

    const entry = this.getRaceLeaderboard(dateKey).find(e => e.player.id === playerId);
    return entry?.points ?? 0;
  }

  /**
   * Finalisation (at 21:00 GMT, rollover, or on-demand): lock each player's race points
   * for a closed race day (idempotent — skips days already locked unless force is true).
   * Points then become permanent.
   */
  public lockRaceScoresForDate(dateKey: string, force = false): boolean {
    const racers = this.getRacersForDate(dateKey);
    if (racers.length === 0) return false;
    const board = this.getRaceLeaderboard(dateKey);
    let changed = false;
    for (const racer of racers) {
      const rec = racer.player.history?.[dateKey];
      if (!rec) continue;
      if (rec.raceLocked && !force) continue;
      const entry = board.find(e => e.player.id === racer.player.id);
      rec.raceLockedPoints = entry?.points ?? 0;
      rec.raceLocked = true;
      changed = true;
    }
    if (changed) this.save();
    return changed;
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

  // --- Advent Calendar (24 doors, date-driven, shared by the family) ---

  /** The calendar's session id (its start date). Changing it resets everyone. */
  public adventSessionId(): string {
    return ADVENT_START;
  }

  /** Reset a player's advent state if the calendar session changed (e.g. Nov test -> Dec). */
  private adventResetIfNewSession(p: PlayerProfile | undefined): void {
    if (!p) return;
    if (p.adventSession !== ADVENT_START) {
      p.adventSession = ADVENT_START;
      p.adventOpened = 0;
      p.adventUnlocked = 0;
      p.adventCosmetic = '';
    }
  }

  public getAdventOpened(playerId: string): number {
    const p = this.players.find(x => x.id === playerId);
    this.adventResetIfNewSession(p);
    return p?.adventOpened || 0;
  }

  public getAdventUnlocked(playerId: string): number {
    const p = this.players.find(x => x.id === playerId);
    this.adventResetIfNewSession(p);
    return p?.adventUnlocked || 0;
  }

  public hasOpenedAdventDoor(playerId: string, day: number): boolean {
    const p = this.players.find(x => x.id === playerId);
    this.adventResetIfNewSession(p);
    return !!(p && p.adventOpened && ((p.adventOpened >> (day - 1)) & 1));
  }

  public getWornAdventCosmetic(playerId: string): string {
    const p = this.players.find(x => x.id === playerId);
    this.adventResetIfNewSession(p);
    return p?.adventCosmetic || '';
  }

  /** Equip an owned cosmetic (or '' to take it off). Personal choice, not merge-synced. */
  public setAdventCosmetic(playerId: string, cosmeticId: string): boolean {
    const p = this.players.find(x => x.id === playerId);
    if (!p) return false;
    this.adventResetIfNewSession(p);
    if (cosmeticId && !ADVENT_COSMETICS.some((c, i) => c.id === cosmeticId && ((p.adventUnlocked || 0) >> i & 1))) {
      return false; // not owned
    }
    p.adventCosmetic = cosmeticId || '';
    this.notify();
    return true;
  }

  /**
   * Open an advent box for a player. Doors that have already arrived (current
   * day or missed earlier days) can be opened; each door opens once.
   * Bonus/finale doors grant points on opening; cosmetic doors unlock a
   * wearable; treasure/challenge doors pay out when the event is completed.
   */
  public openAdventDoor(playerId: string, day: number, dateKey = getTodayDateKey()): AdventOpenResult {
    const p = this.players.find(x => x.id === playerId);
    if (!p) return { ok: false, grantedPoints: 0, message: 'No such player' };
    this.adventResetIfNewSession(p);

    const door = getDoor(day);
    if (!door) return { ok: false, grantedPoints: 0, message: 'No such door' };

    // Only doors whose date has arrived (day <= the door for this date) may open.
    const arrived = adventDayFor(dateKey);
    if (arrived > 0 && day > arrived) {
      return { ok: false, grantedPoints: 0, message: 'That door has not opened yet.' };
    }
    if (this.hasOpenedAdventDoor(playerId, day)) {
      return { ok: false, already: true, door, grantedPoints: 0, message: 'You already opened this box.' };
    }

    if (!p.history) p.history = {};
    if (!p.history[dateKey]) p.history[dateKey] = { completedGames: [], totalDayScore: 0 };

    let granted = 0;
    let unlocked: string | undefined;

    p.adventOpened = (p.adventOpened || 0) | (1 << (day - 1));

    if (door.type === 'cosmetic' && door.cosmeticId) {
      const idx = ADVENT_COSMETICS.findIndex(c => c.id === door.cosmeticId);
      if (idx >= 0) p.adventUnlocked = (p.adventUnlocked || 0) | (1 << idx);
      p.adventCosmetic = door.cosmeticId; // auto-wear the new look
      unlocked = door.cosmeticId;
    } else if (door.type === 'bonus' || door.type === 'finale') {
      granted = door.points || 0;
      if (granted > 0) this.addAdventPoints(p, dateKey, granted);
    }
    // treasure / challenge: reward granted when the event is completed.

    this.notify();
    return {
      ok: true,
      door,
      grantedPoints: granted,
      unlockedCosmetic: unlocked,
      message: door.type === 'cosmetic' ? `Unlocked: ${door.title}!` : granted > 0 ? `+${granted} points!` : `${door.title} is open!`
    };
  }

  private addAdventPoints(p: PlayerProfile, dateKey: string, amount: number): void {
    if (amount <= 0) return;
    if (!p.history) p.history = {};
    if (!p.history[dateKey]) p.history[dateKey] = { completedGames: [], totalDayScore: 0 };
    const d = p.history[dateKey];
    d.totalDayScore = (d.totalDayScore || 0) + amount;
    p.totalScore = (p.totalScore || 0) + amount;
  }

  /** Family finale bonus: grant to every player only if the whole family opened the door. */
  public applyAdventFamilyBonus(dateKey = getTodayDateKey()): number {
    const arrived = adventDayFor(dateKey);
    if (arrived <= 0) return 0;
    const door = getDoor(arrived);
    if (!door || door.type !== 'finale') return 0;
    const allOpened = this.players.every(p => this.hasOpenedAdventDoor(p.id, arrived));
    if (!allOpened) return 0;
    let granted = 0;
    for (const p of this.players) {
      this.addAdventPoints(p, dateKey, door.points || 0);
      granted = door.points || 0;
    }
    if (granted > 0) this.notify();
    return granted;
  }

  /** Record the day's golden treasure being collected. Single family taker. */
  public recordAdventTreasure(playerId: string, points: number, dateKey = getTodayDateKey()): { found: boolean; awarded: number } {
    const p = this.players.find(x => x.id === playerId);
    if (!p) return { found: false, awarded: 0 };
    this.adventResetIfNewSession(p);
    if (!p.history) p.history = {};
    if (!p.history[dateKey]) p.history[dateKey] = { completedGames: [], totalDayScore: 0 };
    const d = p.history[dateKey];
    if (d.adventTreasureFound) return { found: true, awarded: 0 };
    // Single taker: if another player already got it, no reward.
    const alreadyTaken = this.players.some(x => x.id !== p.id && x.history?.[dateKey]?.adventTreasureFound);
    d.adventTreasureFound = true;
    let awarded = 0;
    if (!alreadyTaken && points > 0) {
      this.addAdventPoints(p, dateKey, points);
      awarded = points;
    }
    this.notify();
    return { found: true, awarded };
  }

  public getAdventTreasureTaker(dateKey = getTodayDateKey()): PlayerProfile | undefined {
    return this.players.find(x => x.history?.[dateKey]?.adventTreasureFound);
  }

  /** Best challenge time + rank-based points for a player on a given date. */
  public recordAdventChallenge(playerId: string, timeMs: number, basePoints: number, dateKey = getTodayDateKey()): { best: boolean; points: number } {
    const p = this.players.find(x => x.id === playerId);
    if (!p) return { best: false, points: 0 };
    this.adventResetIfNewSession(p);
    if (!p.history) p.history = {};
    if (!p.history[dateKey]) p.history[dateKey] = { completedGames: [], totalDayScore: 0 };
    const d = p.history[dateKey];
    const isBest = d.adventChallengeTimeMs === undefined || timeMs < d.adventChallengeTimeMs;
    if (isBest) d.adventChallengeTimeMs = timeMs;

    // Rank by best times among players who finished that day.
    const racers = this.players
      .filter(x => x.history?.[dateKey]?.adventChallengeTimeMs !== undefined)
      .sort((a, b) => (a.history[dateKey].adventChallengeTimeMs! - b.history[dateKey].adventChallengeTimeMs!));
    const rank = racers.findIndex(x => x.id === p.id) + 1;
    const table = [15, 12, 10, 8, 5, 3];
    const pts = rank > 0 ? (table[rank - 1] ?? 0) : 0;
    // Award the max of ranked points and the flat completion bonus, but only once.
    const award = Math.max(pts, basePoints || 0);
    const prev = d.adventChallengePoints || 0;
    if (award > prev) {
      d.adventChallengePoints = award;
      const diff = award - prev;
      this.addAdventPoints(p, dateKey, diff);
    }
    this.notify();
    return { best: isBest, points: award };
  }

  public getAdventChallengeLeaderboard(dateKey = getTodayDateKey()) {
    return this.players
      .filter(p => p.history?.[dateKey]?.adventChallengeTimeMs !== undefined)
      .map(p => ({ player: p, timeMs: p.history[dateKey].adventChallengeTimeMs!, points: p.history[dateKey].adventChallengePoints || 0 }))
      .sort((a, b) => a.timeMs - b.timeMs)
      .map((e, i) => ({ ...e, rank: i + 1 }));
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

  public mergeRemoteData(remotePlayers?: PlayerProfile[], remoteMessages?: BulletinMessage[], remoteDeleted?: string[]): { changed: boolean; removedNames: string[] } {
    let changed = false;

    // 0. Apply deletion tombstones reported by the other device, so removed
    //    players disappear here too (and the merge below won't resurrect them).
    let removedNames: string[] = [];
    if (Array.isArray(remoteDeleted) && remoteDeleted.length > 0) {
      const rem = this.applyRemoteDeletions(remoteDeleted);
      removedNames = rem.removedNames;
      if (rem.changed) changed = true;
    }

    // 1. Merge players
    if (Array.isArray(remotePlayers) && remotePlayers.length > 0) {
      for (const remoteP of remotePlayers) {
        const localP = this.players.find(p => p.id === remoteP.id);
        if (!localP) {
          // Deleted on another device? The tombstone wins — never resurrect.
          if (remoteP.id && this.deletedPlayers.some(d => d.id === remoteP.id)) {
            continue;
          }
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
          if (remoteP.lastPlayedDate && remoteP.lastPlayedDate > (localP.lastPlayedDate || '')) {
            localP.lastPlayedDate = remoteP.lastPlayedDate;
            changed = true;
          }

          // Advent calendar: a box, once opened, stays opened everywhere. If the
          // calendar session rolled over, start fresh before OR-merging.
          if (remoteP.adventSession && remoteP.adventSession !== localP.adventSession) {
            localP.adventSession = remoteP.adventSession;
            localP.adventOpened = 0;
            localP.adventUnlocked = 0;
            localP.adventCosmetic = '';
            changed = true;
          }
          if ((remoteP.adventOpened || 0) !== 0) {
            const mo = (localP.adventOpened || 0) | (remoteP.adventOpened || 0);
            if (mo !== (localP.adventOpened || 0)) { localP.adventOpened = mo; changed = true; }
          }
          if ((remoteP.adventUnlocked || 0) !== 0) {
            const mu = (localP.adventUnlocked || 0) | (remoteP.adventUnlocked || 0);
            if (mu !== (localP.adventUnlocked || 0)) { localP.adventUnlocked = mu; changed = true; }
          }
          // Worn cosmetic: adopt the remote look when it is set (equipings
          // propagate; an empty remote value is ignored so unequips stay local).
          if (remoteP.adventCosmetic && remoteP.adventCosmetic !== (localP.adventCosmetic || '')) {
            localP.adventCosmetic = remoteP.adventCosmetic;
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
                // Union scavenger found-items & completed flag so discoveries
                // made on one device appear on all of them.
                if (remoteDay.scavengerFoundIds && remoteDay.scavengerFoundIds.length > 0) {
                  if (!localDay.scavengerFoundIds) localDay.scavengerFoundIds = [];
                  const mergedFound = Array.from(new Set([...localDay.scavengerFoundIds, ...remoteDay.scavengerFoundIds]));
                  if (mergedFound.length !== localDay.scavengerFoundIds.length) {
                    localDay.scavengerFoundIds = mergedFound;
                    changed = true;
                  }
                }
                if (remoteDay.scavengerCompleted && !localDay.scavengerCompleted) {
                  localDay.scavengerCompleted = true;
                  changed = true;
                }
                // Boat race: personal best is a MIN merge (times only improve);
                // locked points/flag are final once written.
                if (remoteDay.raceTimeMs !== undefined && (localDay.raceTimeMs === undefined || remoteDay.raceTimeMs < localDay.raceTimeMs)) {
                  localDay.raceTimeMs = remoteDay.raceTimeMs;
                  changed = true;
                }
                if (remoteDay.raceLockedPoints !== undefined && (localDay.raceLockedPoints === undefined || remoteDay.raceLockedPoints > localDay.raceLockedPoints)) {
                  localDay.raceLockedPoints = remoteDay.raceLockedPoints;
                  changed = true;
                }
                if (remoteDay.raceLocked && !localDay.raceLocked) {
                  localDay.raceLocked = true;
                  changed = true;
                }
                // Advent daily events: treasure OR, challenge time MIN, points MAX.
                if (remoteDay.adventTreasureFound && !localDay.adventTreasureFound) {
                  localDay.adventTreasureFound = true;
                  changed = true;
                }
                if (remoteDay.adventChallengeTimeMs !== undefined && (localDay.adventChallengeTimeMs === undefined || remoteDay.adventChallengeTimeMs < localDay.adventChallengeTimeMs)) {
                  localDay.adventChallengeTimeMs = remoteDay.adventChallengeTimeMs;
                  changed = true;
                }
                if (remoteDay.adventChallengePoints !== undefined && (localDay.adventChallengePoints === undefined || remoteDay.adventChallengePoints > localDay.adventChallengePoints)) {
                  localDay.adventChallengePoints = remoteDay.adventChallengePoints;
                  changed = true;
                }
              }
            }
          }
        }
      }
    }

    // Clean up untouched default template placeholders that don't exist remotely
    if (Array.isArray(remotePlayers) && remotePlayers.length > 0) {
      const remoteIds = new Set(remotePlayers.map(p => p.id));
      const lockedId = this.getLockedPlayerId();
      const beforeCount = this.players.length;
      this.players = this.players.filter(p => {
        if (remoteIds.has(p.id)) return true;
        if (p.id === lockedId) return true;
        // Keep if it has any activity
        const hasHistory = p.history && Object.keys(p.history).length > 0;
        if ((p.totalScore || 0) > 0 || (p.streak || 0) > 0 || hasHistory) return true;
        // If it's a default template placeholder with 0 activity not present on remote, drop it
        const isDefaultName = DEFAULT_FAMILY_MEMBERS.some(d => d.name.toLowerCase() === p.name.trim().toLowerCase());
        if (isDefaultName) return false;
        return true;
      });
      if (this.players.length !== beforeCount) changed = true;
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

    // 3. Prune ghost players (see pruneGhostPlayers)
    if (this.pruneGhostPlayers()) {
      changed = true;
    }

    // 4. Ensure device lock is respected if locked player was just synced in
    const lockedId = this.getLockedPlayerId();
    if (lockedId && this.activePlayerId !== lockedId && this.players.some(p => p.id === lockedId)) {
      this.activePlayerId = lockedId;
      changed = true;
    }

    if (changed) {
      this.save();
      this.listeners.forEach(fn => fn());
    }

    return { changed, removedNames };
  }

  /**
   * Remove "ghost" players that never had any activity and are not the
   * active/locked identity — these accumulate as duplicates when two devices
   * add the same person (e.g. two "Lee" entries) and then pollute every
   * subsequent broadcast payload. Players who have ever played, are the
   * active player, or are the device's locked identity are always kept.
   */
  /**
   * Remove duplicate roster entries (the same display name added on two
   * devices creates two IDs — e.g. two "Lee" rows that pollute every
   * broadcast payload).
   *
   * IMPORTANT: only exact-name DUPLICATES are pruned. Zero-activity
   * singletons are never removed — after an admin score reset every real
   * player is legitimately at zero, and pruning them would gut the family
   * roster (and trigger a re-broadcast storm across devices).
   */
  public pruneGhostPlayers(): boolean {
    const byName = new Map<string, PlayerProfile[]>();
    for (const p of this.players) {
      const key = p.name.trim().toLowerCase();
      byName.set(key, [...(byName.get(key) || []), p]);
    }

    const dataAmount = (p: PlayerProfile): number => {
      let total = (p.totalScore || 0) + (p.streak || 0);
      for (const d of Object.values(p.history || {})) {
        total += d.totalDayScore || 0;
      }
      return total;
    };

    const lockedId = this.getLockedPlayerId();
    const remove = new Set<string>();
    for (const group of byName.values()) {
      if (group.length < 2) continue;
      const sorted = [...group].sort((a, b) => {
        // Never remove this device's locked identity or active player
        if (a.id === lockedId) return -1;
        if (b.id === lockedId) return 1;
        if (a.id === this.activePlayerId) return -1;
        if (b.id === this.activePlayerId) return 1;
        const diff = dataAmount(b) - dataAmount(a);
        if (diff !== 0) return diff; // keep the one with more data
        return a.id.localeCompare(b.id); // stable: keep the older ID
      });
      for (const p of sorted.slice(1)) {
        if (p.id !== lockedId && p.id !== this.activePlayerId) {
          remove.add(p.id);
        }
      }
    }

    if (remove.size === 0) return false;
    this.players = this.players.filter((p) => !remove.has(p.id));
    return true;
  }

  /**
   * Authoritative roster replacement (used for admin resets via liveSync
   * 'full_sync'). Unlike mergeRemoteData (max-only), this replaces the
   * local roster wholesale so scores can also be lowered/zeroed.
   */
  public applyAuthoritativePlayers(remotePlayers: PlayerProfile[]): boolean {
    if (!Array.isArray(remotePlayers) || remotePlayers.length === 0) return false;

    const clean: PlayerProfile[] = remotePlayers.map(p => ({
      id: p.id,
      name: p.name || 'Islander',
      avatarId: AVATAR_ROSTER.some(a => a.id === p.avatarId) ? p.avatarId : AVATAR_ROSTER[0].id,
      totalScore: p.totalScore || 0,
      streak: p.streak || 0,
      lastPlayedDate: p.lastPlayedDate || '',
      history: p.history || {}
    }));

    // Never lose the device's identity: re-add it (zeroed) if the
    // authoritative roster doesn't include it.
    const lockedId = this.getLockedPlayerId();
    for (const keepId of [this.activePlayerId, lockedId]) {
      if (!keepId) continue;
      if (!clean.some(p => p.id === keepId)) {
        const local = this.players.find(p => p.id === keepId);
        clean.push({
          id: keepId,
          name: local?.name || 'Islander',
          avatarId: local?.avatarId || AVATAR_ROSTER[0].id,
          totalScore: 0,
          streak: 0,
          lastPlayedDate: '',
          history: {}
        });
      }
    }

    this.players = clean;
    // An admin rebuild that intentionally includes a player supersedes any
    // stale deletion tombstone for them (they were re-added on purpose).
    const present = new Set(clean.map(p => p.id));
    this.deletedPlayers = this.deletedPlayers.filter(d => !present.has(d.id));
    this.save();
    this.listeners.forEach(fn => fn());
    return true;
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
        // Imported roster is intentional — clear stale deletion tombstones for it.
        const present = new Set(this.players.map(p => p.id));
        this.deletedPlayers = this.deletedPlayers.filter(d => !present.has(d.id));
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
