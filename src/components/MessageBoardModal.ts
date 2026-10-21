import { AVATAR_ROSTER } from '../data/avatars';
import { familyStore } from '../state/familyStore';
import { liveSyncManager } from '../utils/liveSync';
import { playSound } from '../utils/audio';

export class MessageBoardModal {
  private overlay: HTMLElement | null = null;
  private onMessagePosted?: () => void;

  constructor(onMessagePosted?: () => void) {
    this.onMessagePosted = onMessagePosted;
  }

  public show(): void {
    if (this.overlay) this.overlay.remove();
    familyStore.markMessagesAsRead();
    this.render();
  }

  private render(): void {
    const messages = familyStore.getMessages();
    const activePlayer = familyStore.getActivePlayer();
    const avatar = AVATAR_ROSTER.find(a => a.id === activePlayer.avatarId) || AVATAR_ROSTER[0];

    const modal = document.createElement('div');
    modal.id = 'message-board-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn';

    modal.innerHTML = `
      <div class="bg-gradient-to-b from-amber-950 to-stone-900 border-4 border-amber-600/80 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-white shadow-2xl relative max-h-[92vh] flex flex-col">
        <!-- Holiday Holly / Pin Decor -->
        <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-600 text-amber-100 font-extrabold px-6 py-1 rounded-full text-xs uppercase tracking-widest shadow-lg border border-amber-400">
          📌 Town Bulletin Board
        </div>

        <button id="close-board-btn" class="absolute top-4 right-4 text-amber-300 hover:text-white p-2 text-xl font-bold">✕</button>

        <div class="text-center mt-2 mb-4">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-amber-200 tracking-wide flex items-center justify-center gap-2">
            <span>🎄</span>
            <span>Family Message Board</span>
            <span>🎅</span>
          </h2>
          <p class="text-xs sm:text-sm text-amber-100/70 mt-1">
            Leave holiday greetings, celebrate game scores, or challenge each other!
          </p>
        </div>

        <!-- Messages Feed (Corkboard / Parchment Style) -->
        <div class="flex-1 overflow-y-auto space-y-3.5 pr-1.5 mb-4 max-h-[48vh]" id="board-messages-container">
          ${messages.length === 0 ? `
            <div class="text-center py-12 text-amber-200/50 italic text-sm">
              No notes on the bulletin board yet. Be the first to post a holiday message!
            </div>
          ` : messages.map(msg => {
            const authorAvatar = AVATAR_ROSTER.find(a => a.id === msg.authorAvatarId) || AVATAR_ROSTER[0];
            const timeFormatted = this.formatRelativeTime(msg.createdAt);

            return `
              <div class="bg-amber-100/10 border border-amber-500/30 rounded-2xl p-4 shadow-md backdrop-blur-sm relative">
                <div class="flex items-start justify-between gap-3 mb-2">
                  <div class="flex items-center space-x-2.5">
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center text-lg border border-white/20 shadow-inner" style="background-color: ${authorAvatar.color}">
                      ${authorAvatar.emoji}
                    </div>
                    <div>
                      <span class="font-bold text-sm text-amber-200">${msg.authorName}</span>
                      <span class="text-[11px] text-amber-300/50 block">${timeFormatted}</span>
                    </div>
                  </div>
                  <div class="text-amber-400/50 text-xs">📌</div>
                </div>
                <p class="text-sm text-amber-50 leading-relaxed font-medium pl-1 break-words">
                  ${this.escapeHtml(msg.content)}
                </p>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Compose Box -->
        <div class="border-t border-amber-800/80 pt-3">
          <div class="flex items-center space-x-2 mb-2">
            <div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style="background-color: ${avatar.color}">
              ${avatar.emoji}
            </div>
            <span class="text-xs text-amber-300/80">Posting as <strong class="text-amber-200 font-bold">${activePlayer.name}</strong></span>
          </div>

          <!-- Emoji quick tap bar -->
          <div class="flex gap-1.5 mb-2 overflow-x-auto pb-1 text-base" id="emoji-quick-bar">
            ${['🎄', '⛄', '🎅', '🎁', '❄️', '🦌', '🍪', '⭐', '🏆', '🥳', '🎉', '🔥'].map(emoji => `
              <button type="button" class="quick-emoji-btn px-2 py-1 bg-amber-900/60 hover:bg-amber-700/80 border border-amber-600/40 rounded-lg transition-transform active:scale-95 text-sm">
                ${emoji}
              </button>
            `).join('')}
          </div>

          <div class="flex gap-2">
            <textarea id="board-compose-input" rows="2" placeholder="Write a message to the family..." maxlength="200" class="flex-1 bg-amber-950/80 border border-amber-700 rounded-xl p-2.5 text-sm text-amber-50 placeholder-amber-400/40 focus:outline-none focus:border-amber-400 resize-none"></textarea>
            <button id="board-post-btn" class="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black px-4 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center">
              Post ✉️
            </button>
          </div>
        </div>
      </div>
    `;

    if (this.overlay) this.overlay.remove();
    document.body.appendChild(modal);
    this.overlay = modal;

    // Attach listeners
    modal.querySelector('#close-board-btn')?.addEventListener('click', () => this.close());

    const input = modal.querySelector('#board-compose-input') as HTMLTextAreaElement;
    const postBtn = modal.querySelector('#board-post-btn');

    modal.querySelectorAll('.quick-emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (input) {
          input.value += btn.textContent?.trim() || '';
          input.focus();
        }
      });
    });

    const handlePost = () => {
      const text = input?.value.trim();
      if (text) {
        familyStore.postMessage(text);
        liveSyncManager.broadcastState('new_message', `💬 ${activePlayer.name}: "${text.length > 30 ? text.substring(0, 30) + '...' : text}"`);
        playSound('victory');
        input.value = '';
        if (this.onMessagePosted) this.onMessagePosted();
        this.render();
      }
    };

    postBtn?.addEventListener('click', handlePost);
    input?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handlePost();
      }
    });
    input?.addEventListener('keyup', (e) => {
      e.stopPropagation();
    });
    input?.addEventListener('keypress', (e) => {
      e.stopPropagation();
    });
  }

  private formatRelativeTime(isoString: string): string {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
  }

  public close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
