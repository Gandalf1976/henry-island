import { AVATAR_ROSTER, DEFAULT_FAMILY_MEMBERS } from '../data/avatars';
import { GameType, PlayerProfile } from '../types';
import { getTodayDateKey } from '../utils/dailyClock';

const STORAGE_KEY = 'henry_island_family_data_v1';
const ACTIVE_PLAYER_KEY = 'henry_island_active_player_id';

class FamilyStore {
  private players: PlayerProfile[] = [];
  private activePlayerId: string = '';
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

  private notify(): void {
    this.save();
    this.listeners.forEach(fn => fn());
  }

  private load(): void {
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

    const savedActiveId = localStorage.getItem(ACTIVE_PLAYER_KEY);
    if (savedActiveId && this.players.some(p => p.id === savedActiveId)) {
      this.activePlayerId = savedActiveId;
    } else {
      this.activePlayerId = this.players[0].id;
    }
  }

  public save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.players));
      localStorage.setItem(ACTIVE_PLAYER_KEY, this.activePlayerId);
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  public getPlayers(): PlayerProfile[] {
    return [...this.players];
  }

  public getActivePlayer(): PlayerProfile {
    const found = this.players.find(p => p.id === this.activePlayerId);
    if (found) return found;
    return this.players[0];
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
      name: name.trim() || 'Gardener',
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

  public updatePlayerAvatar(playerId: string, avatarId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (player && AVATAR_ROSTER.some(a => a.id === avatarId)) {
      player.avatarId = avatarId;
      this.notify();
    }
  }

  public updatePlayerName(playerId: string, newName: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (player && newName.trim()) {
      player.name = newName.trim();
      this.notify();
    }
  }

  public isGameCompletedToday(playerId: string, gameType: GameType, dateKey = getTodayDateKey()): boolean {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;
    const dayRecord = player.history[dateKey];
    if (!dayRecord) return false;
    return dayRecord.completedGames.includes(gameType);
  }

  public getUnplayedGamesToday(playerId: string, dateKey = getTodayDateKey()): GameType[] {
    const allGames: GameType[] = ['wordle', 'lake', 'quiz'];
    const player = this.players.find(p => p.id === playerId);
    if (!player) return allGames;
    const dayRecord = player.history[dateKey];
    if (!dayRecord) return allGames;
    return allGames.filter(g => !dayRecord.completedGames.includes(g));
  }

  public recordGameScore(playerId: string, gameType: GameType, score: number, dateKey = getTodayDateKey()): boolean {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;

    if (!player.history[dateKey]) {
      player.history[dateKey] = {
        completedGames: [],
        totalDayScore: 0
      };
    }

    const dayRecord = player.history[dateKey];
    if (dayRecord.completedGames.includes(gameType)) {
      // Already completed today
      return false;
    }

    dayRecord.completedGames.push(gameType);
    dayRecord.totalDayScore += score;
    player.totalScore += score;

    if (gameType === 'wordle') dayRecord.wordleScore = score;
    if (gameType === 'lake') dayRecord.lakeScore = score;
    if (gameType === 'quiz') dayRecord.quizScore = score;

    // Update streak logic
    if (player.lastPlayedDate !== dateKey) {
      // Check if lastPlayedDate was yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = getTodayDateKey(yesterday);

      if (player.lastPlayedDate === yesterdayKey) {
        player.streak += 1;
      } else if (!player.lastPlayedDate) {
        player.streak = 1;
      } else {
        // missed day, reset streak to 1
        player.streak = 1;
      }
      player.lastPlayedDate = dateKey;
    }

    this.notify();
    return true;
  }

  public getLeaderboard(): { rank: number; player: PlayerProfile; isPodium: boolean }[] {
    const sorted = [...this.players].sort((a, b) => b.totalScore - a.totalScore);
    return sorted.map((p, idx) => ({
      rank: idx + 1,
      player: p,
      isPodium: idx < 3
    }));
  }

  public exportDataJson(): string {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      players: this.players
    }, null, 2);
  }

  public importDataJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.players) && parsed.players.length > 0) {
        this.players = parsed.players;
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
