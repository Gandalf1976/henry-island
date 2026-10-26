import { familyStore } from '../state/familyStore';
import { BulletinMessage, PlayerProfile } from '../types';
import { playSound } from './audio';

const SYNC_TOPIC = 'henry_island_gandalf1976_v2';
const NTFY_BASE = 'https://ntfy.sh/' + SYNC_TOPIC;

export interface LiveSyncPayload {
  type: 'score_update' | 'new_message' | 'player_update' | 'full_sync' | 'game_reset';
  senderDeviceId: string;
  senderName: string;
  timestamp: number;
  players?: PlayerProfile[];
  messages?: BulletinMessage[];
  announcement?: string;
}

class LiveSyncManager {
  private deviceId: string;
  private eventSource: EventSource | null = null;
  private isPublishing = false;
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

    // Auto-sync heartbeat every 20 seconds (useful when phone screen wakes up)
    if (typeof window !== 'undefined') {
      window.setInterval(() => {
        this.pullInitialState();
      }, 20000);

      // Reconnect when tab becomes visible again
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.pullInitialState();
          if (!this.isConnected) {
            this.connectSSE();
          }
        }
      });
    }

    // Subscribe to local store changes to broadcast outwards
    familyStore.subscribe(() => {
      this.broadcastStateDebounced();
    });
  }

  public subscribeStatus(fn: (status: { isConnected: boolean; lastSynced: Date | null }) => void): () => void {
    this.listeners.push(fn);
    fn({ isConnected: this.isConnected, lastSynced: this.lastSynced });
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notifyStatus(): void {
    this.listeners.forEach(fn => fn({ isConnected: this.isConnected, lastSynced: this.lastSynced }));
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
      // Poll recent cached messages from the topic
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

      const merged = familyStore.mergeRemoteData(payload.players, payload.messages);

      if (merged) {
        this.lastSynced = new Date();
        this.notifyStatus();

        if (triggerSound) {
          if (payload.type === 'score_update') {
            playSound('victory');
            this.showToastNotification(payload.announcement || `${payload.senderName} just updated their score! ⛄`);
          } else if (payload.type === 'new_message') {
            playSound('closedSign');
            this.showToastNotification(`💬 New message from ${payload.senderName}!`);
          } else if (payload.type === 'game_reset') {
            playSound('snowStep');
            this.showToastNotification(payload.announcement || '🔄 Puzzles reset by Dad to play again!');
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
      this.broadcastState();
    }, 1200);
  }

  /**
   * Constructs a compact player profile array containing recent day records
   * so payload stays strictly below ntfy's 4,096-byte attachment threshold.
   */
  private getCompactPlayers(players: PlayerProfile[], maxDays = 7): PlayerProfile[] {
    return players.map(p => {
      const dates = Object.keys(p.history || {}).sort().reverse().slice(0, maxDays);
      const compactHistory: typeof p.history = {};
      for (const d of dates) {
        compactHistory[d] = p.history[d];
      }
      return {
        id: p.id,
        name: p.name,
        avatarId: p.avatarId,
        totalScore: p.totalScore,
        streak: p.streak,
        lastPlayedDate: p.lastPlayedDate,
        history: compactHistory
      };
    });
  }

  public async broadcastState(type: LiveSyncPayload['type'] = 'score_update', announcement?: string): Promise<void> {
    if (this.isPublishing) return;

    const rawPlayers = familyStore.getPlayers();
    const rawMessages = familyStore.getMessages();
    const activePlayer = familyStore.getActivePlayer();

    // Prevent echoing identical payload
    const hash = JSON.stringify({ p: rawPlayers, m: rawMessages });
    if (hash === this.lastSentHash && type !== 'new_message') {
      return;
    }
    this.lastSentHash = hash;

    // Build compact payload: 7 days history, 10 recent messages
    let compactPlayers = this.getCompactPlayers(rawPlayers, 7);
    let compactMessages = rawMessages.slice(0, 10);

    let payload: LiveSyncPayload = {
      type,
      senderDeviceId: this.deviceId,
      senderName: activePlayer.name,
      timestamp: Date.now(),
      players: compactPlayers,
      messages: compactMessages,
      announcement
    };

    let bodyStr = JSON.stringify(payload);

    // If still large (>3500 chars), further compact to 3 days and 5 messages
    if (bodyStr.length > 3500) {
      payload.players = this.getCompactPlayers(rawPlayers, 3);
      payload.messages = rawMessages.slice(0, 5);
      bodyStr = JSON.stringify(payload);
    }

    this.isPublishing = true;
    try {
      await fetch(NTFY_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Title': `Henry Island: ${activePlayer.name}`,
          'Tags': 'island,christmas'
        },
        body: bodyStr
      });
      this.lastSynced = new Date();
      this.notifyStatus();
    } catch (e) {
      console.warn('LiveSync publish error (will retry next turn):', e);
    } finally {
      this.isPublishing = false;
    }
  }

  public showToastNotification(text: string): void {
    const existing = document.getElementById('henry-toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'henry-toast-notification';
    toast.className = 'fixed top-18 right-4 z-50 bg-emerald-900/90 text-white px-4 py-3 rounded-2xl shadow-2xl border-2 border-emerald-400/50 backdrop-blur-md flex items-center space-x-3 transition-all duration-300 transform translate-y-0 text-sm font-semibold';
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
