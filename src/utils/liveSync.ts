import { familyStore } from '../state/familyStore';
import { BulletinMessage, GameType, PlayerProfile } from '../types';
import { playSound } from './audio';

/**
 * Live Cloud Sync (ntfy.sh)
 *
 * Reliability design (v3 topic):
 *  - HEARTBEAT: every open device re-publishes the full family state every
 *    5 minutes, so the ntfy rolling cache (and anyone who opens/refreshes
 *    the app afterwards) always has a recent copy of everyone's scores.
 *    Publishing previously only happened on local *changes* and then stopped,
 *    which meant a device opening after the cache window saw nothing.
 *  - COMPACT WIRE FORMAT: payloads are encoded to stay under ntfy.sh's 4,096
 *    byte inline limit, so state rides in the message body instead of an
 *    attachment file (attachments expire after 3 hours).
 *  - RETRY QUEUE: a slow/failing network can no longer silently drop the
 *    first score broadcast after a game finishes.
 *
 * Inbound payloads from older builds (full PlayerProfile arrays on the v2
 * topic) are still understood and merged.
 */

/**
 * Bump this topic suffix when the family needs a hard state reset: the new
 * topic starts with an empty cache, so stale score broadcasts from the old
 * topic can never re-inflate a reset roster. Rotate v4 -> v5 -> ... as needed.
 */
const SYNC_TOPIC = 'henry_island_gandalf1976_v4';
const NTFY_BASE = 'https://ntfy.sh/' + SYNC_TOPIC;

// ntfy.sh stores messages larger than 4096 bytes as expiring attachments.
// Keep inline payloads comfortably below that.
const MAX_INLINE = 3900;

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // re-publish state every 5 min
const PULL_INTERVAL_MS = 20 * 1000; // re-pull cache every 20s
const RETRY_DELAY_MS = 30 * 1000;

// Fixed game order — the wire format packs completed games into a bitfield.
const GAME_ORDER: GameType[] = ['wordle', 'lake', 'quiz', 'wordLadder', 'target24'];

// Fixed scavenger item order (see src/data/scavengerItems.ts) — packed as a bitfield.
const SCAVENGER_ORDER = ['item_bell', 'item_cookie', 'item_gift', 'item_scarf', 'item_star'];

export interface LiveSyncPayload {
  type: 'score_update' | 'new_message' | 'player_update' | 'full_sync' | 'game_reset';
  senderDeviceId: string;
  senderName: string;
  timestamp: number;
  /** Old wire format: full player objects. */
  players?: PlayerProfile[];
  /** Old wire format: full bulletin messages. */
  messages?: BulletinMessage[];
  /** Compact wire format (enc v3): alias-keyed players, expanded on receipt. */
  p?: CompactPlayer[];
  /** Compact wire format: alias-keyed messages. */
  m?: CompactMessage[];
  enc?: 3;
  announcement?: string;
}

interface CompactDay {
  bf: number; // completed games bitfield
  ds: number; // totalDayScore
  w?: number;
  l?: number;
  q?: number;
  W?: number;
  T?: number;
  s5?: number;
  sf?: number; // scavenger found items bitfield (today/yesterday only, to keep size down)
  sc?: 0 | 1;
  rt?: number; // boat race best time (ms)
  rl?: number; // locked race points
  lk?: 0 | 1; // race ranking locked
}

interface CompactPlayer {
  id: string;
  n: string;
  av: string;
  ts: number;
  st: number;
  ld: string;
  h: { [date: string]: CompactDay };
}

interface CompactMessage {
  id: string;
  a: string; // authorId
  an: string; // authorName
  av: string; // authorAvatarId
  c: string; // content
  ct: string; // createdAt (ISO)
}

function dayBitfield(games: GameType[]): number {
  let bits = 0;
  for (let i = 0; i < GAME_ORDER.length; i++) {
    if (games.includes(GAME_ORDER[i])) bits |= 1 << i;
  }
  return bits;
}

function bitfieldToGames(bits: number): GameType[] {
  const games: GameType[] = [];
  for (let i = 0; i < GAME_ORDER.length; i++) {
    if (bits & (1 << i)) games.push(GAME_ORDER[i]);
  }
  return games;
}

function scavengerBitfield(ids?: string[]): number {
  if (!ids) return 0;
  let bits = 0;
  for (let i = 0; i < SCAVENGER_ORDER.length; i++) {
    if (ids.includes(SCAVENGER_ORDER[i])) bits |= 1 << i;
  }
  return bits;
}

function bitfieldToScavenger(bits?: number): string[] | undefined {
  if (!bits) return undefined;
  const ids: string[] = [];
  for (let i = 0; i < SCAVENGER_ORDER.length; i++) {
    if (bits & (1 << i)) ids.push(SCAVENGER_ORDER[i]);
  }
  return ids;
}

/**
 * Build the compact payload for a given history window and message count.
 */
function buildCompactPayload(
  players: PlayerProfile[],
  messages: BulletinMessage[],
  maxDays: number,
  maxMessages: number,
  senderName: string
): LiveSyncPayload {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const todayKey = localDateKey(today);
  const yesterdayKey = localDateKey(yesterday);

  const compactPlayers: CompactPlayer[] = players.map((p) => {
    const dates = Object.keys(p.history || {})
      .sort()
      .reverse()
      .slice(0, maxDays);
    const h: { [date: string]: CompactDay } = {};
    for (const d of dates) {
      const day = p.history[d];
      if (!day) continue;
      const dayRec: CompactDay = {
        bf: dayBitfield(day.completedGames || []),
        ds: day.totalDayScore || 0
      };
      if (day.wordleScore !== undefined) dayRec.w = day.wordleScore;
      if (day.lakeScore !== undefined) dayRec.l = day.lakeScore;
      if (day.quizScore !== undefined) dayRec.q = day.quizScore;
      if (day.wordLadderScore !== undefined) dayRec.W = day.wordLadderScore;
      if (day.target24Score !== undefined) dayRec.T = day.target24Score;
      if (day.scavengerScore !== undefined) dayRec.s5 = day.scavengerScore;
      // Full found-item lists are only needed for the two most recent days
      // (the scavenger hunt UI only acts on today; yesterday is the newest
      // one that can still be reviewed).
      if (d === todayKey || d === yesterdayKey) {
        dayRec.sf = scavengerBitfield(day.scavengerFoundIds);
        if (day.scavengerCompleted) dayRec.sc = 1;
      }
      // Boat race best time & lock state (kept for every synced day so the
      // live daily ranking — and locked past results — reconstruct fully).
      if (day.raceTimeMs !== undefined) dayRec.rt = day.raceTimeMs;
      if (day.raceLockedPoints !== undefined) dayRec.rl = day.raceLockedPoints;
      if (day.raceLocked) dayRec.lk = 1;
      h[d] = dayRec;
    }
    return {
      id: p.id,
      n: p.name,
      av: p.avatarId,
      ts: p.totalScore || 0,
      st: p.streak || 0,
      ld: p.lastPlayedDate || '',
      h
    };
  });

  const compactMessages: CompactMessage[] = messages.slice(0, maxMessages).map((m) => ({
    id: m.id,
    a: m.authorId,
    an: m.authorName,
    av: m.authorAvatarId,
    c: m.content,
    ct: m.createdAt
  }));

  return {
    enc: 3,
    type: 'score_update',
    senderDeviceId: '', // filled in by caller
    senderName,
    timestamp: Date.now(),
    p: compactPlayers,
    m: compactMessages
  };
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Expand compact wire players back into full PlayerProfiles.
 * Day records expand to a shape compatible with familyStore.mergeRemoteData.
 */
function expandCompactPlayers(compact?: CompactPlayer[]): PlayerProfile[] | undefined {
  if (!Array.isArray(compact)) return undefined;
  return compact.map((cp) => {
    const history: PlayerProfile['history'] = {};
    for (const [date, day] of Object.entries(cp.h || {})) {
      const foundIds = bitfieldToScavenger(day.sf);
      history[date] = {
        completedGames: bitfieldToGames(day.bf),
        totalDayScore: day.ds || 0,
        ...(day.w !== undefined ? { wordleScore: day.w } : {}),
        ...(day.l !== undefined ? { lakeScore: day.l } : {}),
        ...(day.q !== undefined ? { quizScore: day.q } : {}),
        ...(day.W !== undefined ? { wordLadderScore: day.W } : {}),
        ...(day.T !== undefined ? { target24Score: day.T } : {}),
        ...(day.s5 !== undefined ? { scavengerScore: day.s5 } : {}),
        ...(foundIds ? { scavengerFoundIds: foundIds } : {}),
        ...(day.sc === 1 ? { scavengerCompleted: true } : {}),
        ...(day.rt !== undefined ? { raceTimeMs: day.rt } : {}),
        ...(day.rl !== undefined ? { raceLockedPoints: day.rl } : {}),
        ...(day.lk === 1 ? { raceLocked: true } : {})
      };
    }
    return {
      id: cp.id,
      name: cp.n,
      avatarId: cp.av,
      totalScore: cp.ts || 0,
      streak: cp.st || 0,
      lastPlayedDate: cp.ld || '',
      history
    };
  });
}

function expandCompactMessages(compact?: CompactMessage[]): BulletinMessage[] | undefined {
  if (!Array.isArray(compact)) return undefined;
  return compact.map((cm) => ({
    id: cm.id,
    authorId: cm.a,
    authorName: cm.an,
    authorAvatarId: cm.av,
    content: cm.c,
    createdAt: cm.ct
  }));
}

class LiveSyncManager {
  private deviceId: string;
  private eventSource: EventSource | null = null;
  private isPublishing = false;
  private retryPending = false;
  private retryTimer: number | null = null;
  private lastSentHash = '';
  private listeners: ((status: { isConnected: boolean; lastSynced: Date | null }) => void)[] = [];
  private isConnected = false;
  private lastSynced: Date | null = null;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  private getOrCreateDeviceId(): string {
    let id = localStorage.getItem('henry_island_unique_device_id');
    if (!id) {
      id = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      localStorage.setItem('henry_island_unique_device_id', id);
    }
    return id;
  }

  public init(): void {
    this.pullInitialState();
    this.connectSSE();

    if (typeof window === 'undefined') return;

    // Keep the ntfy rolling cache warm with our full state so that any
    // family device opening/refreshing the app afterwards can recover it.
    window.setInterval(() => {
      this.pullInitialState();
      this.broadcastState('score_update', undefined, { force: true });
    }, HEARTBEAT_INTERVAL_MS);

    // Pull on a faster cadence to pick up others' heartbeats/scores quickly.
    window.setInterval(() => {
      this.pullInitialState();
    }, PULL_INTERVAL_MS);

    // Reconnect when tab becomes visible again, and re-publish a fresh copy.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.pullInitialState();
        if (!this.isConnected) {
          this.connectSSE();
        }
        this.broadcastState('score_update', undefined, { force: true });
      }
    });

    // Re-broadcast whenever local state changes (debounced).
    familyStore.subscribe(() => {
      this.broadcastStateDebounced();
    });
  }

  public subscribeStatus(fn: (status: { isConnected: boolean; lastSynced: Date | null }) => void): () => void {
    this.listeners.push(fn);
    fn({ isConnected: this.isConnected, lastSynced: this.lastSynced });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notifyStatus(): void {
    this.listeners.forEach((fn) => fn({ isConnected: this.isConnected, lastSynced: this.lastSynced }));
  }

  private connectSSE(): void {
    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource(NTFY_BASE + '/sse');

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.lastSynced = new Date();
        this.notifyStatus();
      };

      this.eventSource.onmessage = async (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw) {
            if (raw.attachment?.url) {
              try {
                const res = await fetch(raw.attachment.url);
                if (res.ok) {
                  const json = await res.json();
                  this.handleIncomingPayload(json);
                }
              } catch (e) {
                console.warn('Failed to load attachment from SSE:', e);
              }
            } else if (raw.message) {
              this.handleIncomingPayload(raw.message);
            }
          }
        } catch (e) {
          // Ignore parse errors on ping frames
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.notifyStatus();
        // Browser automatically retries EventSource
      };
    } catch (e) {
      console.warn('Could not establish real-time SSE stream:', e);
    }
  }

  private async pullInitialState(): Promise<void> {
    try {
      const res = await fetch(NTFY_BASE + '/json?poll=1', { cache: 'no-cache' });
      if (!res.ok) return;

      const text = await res.text();
      const lines = text.trim().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.attachment?.url) {
            try {
              const fileRes = await fetch(parsed.attachment.url);
              if (fileRes.ok) {
                const json = await fileRes.json();
                this.handleIncomingPayload(json, false);
              }
            } catch (e) {
              console.warn('Failed to load initial attachment file:', e);
            }
          } else if (parsed.message) {
            this.handleIncomingPayload(parsed.message, false);
          }
        } catch (err) {
          // continue
        }
      }

      this.lastSynced = new Date();
      this.isConnected = true;
      this.notifyStatus();
    } catch (e) {
      // offline or network hiccup
    }
  }

  private handleIncomingPayload(input: string | LiveSyncPayload, triggerSound = true): void {
    try {
      let payload: LiveSyncPayload;
      if (typeof input === 'string') {
        if (input.startsWith('You received a file:')) {
          // Skip placeholder text if attachment wasn't extracted
          return;
        }
        payload = JSON.parse(input);
      } else {
        payload = input;
      }

      if (!payload || payload.senderDeviceId === this.deviceId) {
        // Skip self-broadcasts
        return;
      }

      // Accept both the old full format and the new compact format.
      const players = payload.players ?? expandCompactPlayers(payload.p);
      const messages = payload.messages ?? expandCompactMessages(payload.m);

      // full_sync is AUTHORITATIVE: replace the local roster wholesale
      // (used for admin resets — a max-merge would never lower scores).
      // It is a one-shot COMMAND: ntfy re-delivers cached messages on every
      // poll, so dedupe by sender+timestamp to avoid re-wiping scores that
      // the family earns after the reset.
      let merged: boolean;
      if (payload.type === 'full_sync') {
        if (!Array.isArray(players) || players.length === 0) {
          return;
        }
        const fp = `${payload.senderDeviceId}|${payload.timestamp}`;
        const APPLIED_KEY = 'henry_island_applied_full_syncs';
        let applied: string[] = [];
        try {
          applied = JSON.parse(localStorage.getItem(APPLIED_KEY) || '[]');
        } catch {
          applied = [];
        }
        if (!applied.includes(fp)) {
          if (applied.length > 10) applied = applied.slice(-10);
          applied.push(fp);
          try {
            localStorage.setItem(APPLIED_KEY, JSON.stringify(applied));
          } catch {
            // storage full — proceed with the reset anyway
          }
        } else {
          // Already applied this reset — ignore the redelivery.
          return;
        }
        merged = familyStore.applyAuthoritativePlayers(players);
      } else {
        merged = familyStore.mergeRemoteData(players, messages);
      }

      if (merged) {
        this.lastSynced = new Date();
        this.notifyStatus();

        if (triggerSound) {
          if (payload.type === 'score_update') {
            playSound('victory');
            this.showToastNotification(
              payload.announcement || `${payload.senderName} just updated their score! ⛄`
            );
          } else if (payload.type === 'new_message') {
            playSound('closedSign');
            this.showToastNotification(`💬 New message from ${payload.senderName}!`);
          } else if (payload.type === 'game_reset') {
            playSound('snowStep');
            this.showToastNotification(payload.announcement || '🔄 Puzzles reset by Dad to play again!');
          } else if (payload.type === 'full_sync') {
            playSound('victory');
            this.showToastNotification(payload.announcement || '🔄 Family scores were reset!');
          }
        }
      }
    } catch (e) {
      // Ignore non-json messages
    }
  }

  private debounceTimer: number | null = null;
  private broadcastStateDebounced(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.broadcastState('score_update');
    }, 1200);
  }

  /**
   * Publish the full family state to the shared topic.
   *
   * The payload is encoded in a compact form that fits under ntfy.sh's
   * 4 KB inline limit. Payload tiers are tried largest-first; the largest
   * tier that fits is used, so a small family keeps 7 days of history on
   * the wire while a large family degrades gracefully to 2 days / 3 messages.
   */
  public async broadcastState(
    type: LiveSyncPayload['type'] = 'score_update',
    announcement?: string,
    opts: { force?: boolean } = {}
  ): Promise<void> {
    if (this.isPublishing) {
      // Don't drop the request — retry once the in-flight publish settles.
      this.retryPending = true;
      return;
    }

    const rawPlayers = familyStore.getPlayers();
    const rawMessages = familyStore.getMessages();
    const activePlayer = familyStore.getActivePlayer();

    // Prevent echoing identical state (unless a heartbeat forces it).
    const hash = JSON.stringify({ p: rawPlayers, m: rawMessages });
    if (!opts.force && hash === this.lastSentHash && type !== 'new_message') {
      return;
    }
    this.lastSentHash = hash;

    let bodyStr = '';
    let payload: LiveSyncPayload;

    const build = (maxDays: number, maxMessages: number): string => {
      const compact = buildCompactPayload(rawPlayers, rawMessages, maxDays, maxMessages, activePlayer.name);
      compact.type = type;
      compact.senderDeviceId = this.deviceId;
      compact.announcement = announcement;
      return JSON.stringify(compact);
    };

    // Tiers: keep the richest one that fits the inline limit.
    bodyStr = build(7, 10);
    if (bodyStr.length > MAX_INLINE) bodyStr = build(3, 5);
    if (bodyStr.length > MAX_INLINE) bodyStr = build(2, 3);

    payload = JSON.parse(bodyStr) as LiveSyncPayload;
    void payload; // (parsed only for clarity; bodyStr is what gets sent)

    await this.publish(bodyStr, announcement);
  }

  private async publish(bodyStr: string, announcement?: string): Promise<void> {
    this.isPublishing = true;
    try {
      await fetch(NTFY_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          Title: `Henry Island: ${familyStore.getActivePlayer().name}`,
          Tags: 'island,christmas'
        },
        body: bodyStr
      });
      this.lastSynced = new Date();
      this.notifyStatus();
    } catch (e) {
      console.warn('LiveSync publish failed (will retry):', e);
      this.retryPending = true;
    } finally {
      this.isPublishing = false;
      if (this.retryPending) {
        this.retryPending = false;
        if (this.retryTimer) window.clearTimeout(this.retryTimer);
        this.retryTimer = window.setTimeout(() => {
          this.retryTimer = null;
          this.broadcastState('score_update', announcement, { force: true });
        }, RETRY_DELAY_MS);
      }
    }
  }

  public showToastNotification(text: string): void {
    const existing = document.getElementById('henry-toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'henry-toast-notification';
    toast.className =
      'fixed top-18 right-4 z-50 bg-emerald-900/90 text-white px-4 py-3 rounded-2xl shadow-2xl border-2 border-emerald-400/50 backdrop-blur-md flex items-center space-x-3 transition-all duration-300 transform translate-y-0 text-sm font-semibold';
    toast.innerHTML = `
      <span class="text-xl">🔔</span>
      <span>${text}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }
}

export const liveSyncManager = new LiveSyncManager();
