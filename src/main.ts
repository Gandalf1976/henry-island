import { AvatarModal } from './components/AvatarModal';
import { ClosedModal } from './components/ClosedModal';
import { DevicePlayerSelectModal } from './components/DevicePlayerSelectModal';
import { GuideModal } from './components/GuideModal';
import { LakeGame } from './components/LakeGame';
import { ManagePlayersModal } from './components/ManagePlayersModal';
import { MessageBoardModal } from './components/MessageBoardModal';
import { PreviousDayWinnersModal } from './components/PreviousDayWinnersModal';
import { QuizGame } from './components/QuizGame';
import { ScavengerHuntModal } from './components/ScavengerHuntModal';
import { SnowmanPodiumModal } from './components/SnowmanPodium';
import { Target24Game } from './components/Target24Game';
import { VirtualJoystick } from './components/VirtualJoystick';
import { WordLadderGame } from './components/WordLadderGame';
import { WordleGame } from './components/WordleGame';
import { AVATAR_ROSTER } from './data/avatars';
import { familyStore } from './state/familyStore';
import { GameType } from './types';
import { soundAudio } from './utils/audio';
import { getTodayDateKey } from './utils/dailyClock';
import { liveSyncManager } from './utils/liveSync';
import { IslandWorld3D } from './world/islandWorld3D';

class App {
  private world: IslandWorld3D;
  private modalHost: HTMLElement;
  private activeGameInstance: WordleGame | LakeGame | QuizGame | WordLadderGame | Target24Game | null = null;

  constructor() {
    const viewport = document.getElementById('island-viewport');
    if (!viewport) throw new Error('Could not find #island-viewport element');
    this.modalHost = document.getElementById('modal-host') as HTMLElement;

    // 1. Initialize Real-Time Live Cloud Sync
    liveSyncManager.init();

    // 2. Initialize 3D Animal Crossing World
    this.world = new IslandWorld3D(viewport, {
      onTriggerGame: (game) => this.triggerGame(game),
      onOpenPodium: () => this.openPodiumModal(),
      onOpenMessageBoard: () => this.openMessageBoardModal(),
      onOpenAvatar: () => this.openAvatarModal()
    });

    // 3. UI Setup & Header Badges
    this.setupUI();
    this.setupJoystick();

    // 4. Prompt device player selection if first time on this device, then check previous day's rankings
    setTimeout(() => {
      if (!familyStore.isDeviceLocked()) {
        new DevicePlayerSelectModal(() => {
          this.updateHeaderBadge();
          this.checkAndShowPreviousDayModal();
        }).show();
      } else {
        this.checkAndShowPreviousDayModal();
      }
    }, 400);
  }

  private setupUI(): void {
    // Format header date
    const dateEl = document.getElementById('island-date-display');
    if (dateEl) {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
      dateEl.textContent = now.toLocaleDateString(undefined, options);
    }

    // Sync header avatar badge and messages counter
    this.updateHeaderBadge();
    familyStore.subscribe(() => {
      this.updateHeaderBadge();
    });

    // Avatar Button -> Open Avatar Modal
    document.getElementById('header-avatar-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.openAvatarModal();
    });

    // Scavenger Hunt Button -> Open Scavenger Hunt Modal
    document.getElementById('header-scavenger-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      if (this.activeGameInstance || this.modalHost.children.length > 0) return;
      new ScavengerHuntModal(this.modalHost, () => this.closeModal());
    });

    // Dad Reset Day Button (Dad Only)
    document.getElementById('header-dad-reset-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      if (!familyStore.isDadActive()) return;
      const confirmed = window.confirm(
        "Dad, would you like to reset today's puzzles so you can play them again?\nYour score for today will be returned to 0."
      );
      if (confirmed) {
        familyStore.resetTodayForDad();
        liveSyncManager.broadcastState('game_reset', "🔄 Dad reset today's puzzles to play again!");
        this.updateHeaderBadge();
        this.showToast("🔄 Puzzles reset for Dad! Today's score returned to 0.");
      }
    });

    // Messages Button -> Open Message Board
    document.getElementById('header-messages-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.openMessageBoardModal();
    });

    // Podium Button -> Open Podium Modal
    document.getElementById('header-podium-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.openPodiumModal();
    });

    // How to Play / Guide Button
    document.getElementById('header-guide-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.openGuideModal();
    });

    // Manage Family Members Button
    document.getElementById('header-manage-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      new ManagePlayersModal().show();
    });

    // Sound Toggle Button
    const soundBtn = document.getElementById('header-sound-btn');
    const updateSoundBtn = () => {
      if (soundBtn) {
        soundBtn.textContent = soundAudio.getMuted() ? '🔇' : '🔊';
        soundBtn.title = soundAudio.getMuted() ? 'Unmute Sound' : 'Mute Sound';
      }
    };
    updateSoundBtn();
    soundBtn?.addEventListener('click', () => {
      soundAudio.toggleMute();
      updateSoundBtn();
    });

    // Zoom Controls
    document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.world.zoomIn();
    });

    document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.world.zoomOut();
    });

    // Fast-Travel Dock Buttons
    document.getElementById('travel-wordle')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.world.teleportTo('wordle');
    });

    document.getElementById('travel-ladder')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.world.teleportTo('wordLadder');
    });

    document.getElementById('travel-target24')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.world.teleportTo('target24');
    });

    document.getElementById('travel-town')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.world.teleportTo('podium');
    });

    document.getElementById('travel-board')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.world.teleportTo('board');
    });

    document.getElementById('travel-lake')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.world.teleportTo('lake');
    });

    document.getElementById('travel-quiz')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.world.teleportTo('quiz');
    });

    document.getElementById('travel-elves')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.world.teleportTo('elves');
    });

    document.getElementById('travel-hearth')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.world.teleportTo('hearth');
    });
  }

  private updateHeaderBadge(): void {
    const activePlayer = familyStore.getActivePlayer();
    const avatar = AVATAR_ROSTER.find(a => a.id === activePlayer.avatarId) || AVATAR_ROSTER[0];
    const stats = familyStore.getPlayerScoreStats(activePlayer);

    const emojiEl = document.getElementById('header-avatar-emoji');
    const nameEl = document.getElementById('header-avatar-name');
    const scoreEl = document.getElementById('header-avatar-score');

    if (emojiEl) emojiEl.textContent = avatar.emoji;
    if (nameEl) nameEl.textContent = activePlayer.name;
    if (scoreEl) scoreEl.textContent = `Avg ${stats.averageScore} pts`;

    // Dad Reset Day button visibility
    const dadBtn = document.getElementById('header-dad-reset-btn');
    if (dadBtn) {
      if (familyStore.isDadActive()) {
        dadBtn.classList.remove('hidden');
        dadBtn.classList.add('flex');
      } else {
        dadBtn.classList.add('hidden');
        dadBtn.classList.remove('flex');
      }
    }

    // Scavenger Hunt Badge
    const foundIds = familyStore.getScavengerFoundIds(activePlayer.id);
    const isScavCompleted = familyStore.isScavengerCompleted(activePlayer.id);
    const scavBadge = document.getElementById('header-scavenger-badge');
    if (scavBadge) {
      if (isScavCompleted) {
        scavBadge.textContent = '5/5 ✓';
        scavBadge.className = 'px-1.5 py-0.2 bg-amber-400 text-slate-900 text-[10px] font-black rounded-full';
      } else {
        scavBadge.textContent = `${foundIds.length}/5`;
        scavBadge.className = 'px-1.5 py-0.2 bg-emerald-400 text-slate-900 text-[10px] font-black rounded-full';
      }
    }

    // Unread messages badge
    const unreadCount = familyStore.getUnreadMessageCount();
    const unreadBadge = document.getElementById('header-unread-badge');
    if (unreadBadge) {
      if (unreadCount > 0) {
        unreadBadge.textContent = String(unreadCount);
        unreadBadge.classList.remove('hidden');
      } else {
        unreadBadge.classList.add('hidden');
      }
    }
  }

  private setupJoystick(): void {
    const joystickContainer = document.getElementById('joystick-container');
    if (joystickContainer) {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
      if (isTouch) {
        joystickContainer.classList.remove('hidden');
        new VirtualJoystick(joystickContainer, (dx, dy) => {
          this.world.setJoystickInput(dx, dy);
        });
      }
    }
  }

  private triggerGame(game: GameType): void {
    // Prevent duplicate modals or re-triggering while a game/modal is already open
    if (this.activeGameInstance || this.modalHost.children.length > 0) {
      return;
    }

    const activePlayer = familyStore.getActivePlayer();
    const today = getTodayDateKey();

    // Check if player has already completed this game today
    if (familyStore.isGameCompletedToday(activePlayer.id, game, today)) {
      new ClosedModal(this.modalHost, game, () => {
        this.closeModal();
      });
      return;
    }

    // Launch game modal
    soundAudio.playJingle();
    if (game === 'wordle') {
      this.activeGameInstance = new WordleGame(this.modalHost, () => {
        this.closeModal();
        liveSyncManager.broadcastState('score_update', `🟩 ${activePlayer.name} just finished Wordle!`);
      });
    } else if (game === 'lake') {
      this.activeGameInstance = new LakeGame(this.modalHost, () => {
        this.closeModal();
        liveSyncManager.broadcastState('score_update', `🪷 ${activePlayer.name} just finished Lake!`);
      });
    } else if (game === 'quiz') {
      this.activeGameInstance = new QuizGame(this.modalHost, () => {
        this.closeModal();
        liveSyncManager.broadcastState('score_update', `🧠 ${activePlayer.name} just finished Quiz!`);
      });
    } else if (game === 'wordLadder') {
      this.activeGameInstance = new WordLadderGame(this.modalHost, () => {
        this.closeModal();
        liveSyncManager.broadcastState('score_update', `🪜 ${activePlayer.name} just finished Word Ladder!`);
      });
    } else if (game === 'target24') {
      this.activeGameInstance = new Target24Game(this.modalHost, () => {
        this.closeModal();
        liveSyncManager.broadcastState('score_update', `🎯 ${activePlayer.name} just finished Target 24!`);
      });
    }
  }

  private showToast(text: string): void {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-2xl border-2 border-white/80 animate-bounce pointer-events-none flex items-center gap-2';
    toast.innerHTML = text;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

  private checkAndShowPreviousDayModal(): void {
    const todayKey = getTodayDateKey();
    const POPUP_SEEN_KEY = 'henry_island_yesterday_popup_seen_date';
    const seenDate = localStorage.getItem(POPUP_SEEN_KEY);

    if (seenDate !== todayKey) {
      localStorage.setItem(POPUP_SEEN_KEY, todayKey);
      const prevRanking = familyStore.getPreviousDayRanking();
      if (prevRanking.hasParticipants) {
        if (this.activeGameInstance || this.modalHost.children.length > 0) return;
        new PreviousDayWinnersModal(this.modalHost, () => {
          this.closeModal();
        });
      }
    }
  }

  private openAvatarModal(): void {
    if (this.activeGameInstance || this.modalHost.children.length > 0) return;
    new AvatarModal(this.modalHost, () => this.closeModal());
  }

  private openPodiumModal(): void {
    if (this.activeGameInstance || this.modalHost.children.length > 0) return;
    new SnowmanPodiumModal(this.modalHost, () => this.closeModal());
  }

  private openMessageBoardModal(): void {
    if (this.activeGameInstance || this.modalHost.children.length > 0) return;
    new MessageBoardModal(() => {
      this.updateHeaderBadge();
    }).show();
  }

  private openGuideModal(): void {
    if (this.activeGameInstance || this.modalHost.children.length > 0) return;
    new GuideModal(this.modalHost, () => this.closeModal());
  }

  private closeModal(): void {
    if (this.activeGameInstance) {
      this.activeGameInstance.destroy();
      this.activeGameInstance = null;
    }
    this.modalHost.innerHTML = '';
  }
}

// Start on DOM content loaded
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
