import { AvatarModal } from './components/AvatarModal';
import { ClosedModal } from './components/ClosedModal';
import { DevicePlayerSelectModal } from './components/DevicePlayerSelectModal';
import { LakeGame } from './components/LakeGame';
import { ManagePlayersModal } from './components/ManagePlayersModal';
import { MessageBoardModal } from './components/MessageBoardModal';
import { QuizGame } from './components/QuizGame';
import { SnowmanPodiumModal } from './components/SnowmanPodium';
import { VirtualJoystick } from './components/VirtualJoystick';
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
  private activeGameInstance: WordleGame | LakeGame | QuizGame | null = null;

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

    // 4. Prompt device player selection if first time on this device
    setTimeout(() => {
      if (!familyStore.isDeviceLocked()) {
        new DevicePlayerSelectModal(() => {
          this.updateHeaderBadge();
        }).show();
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

    // Fast-Travel Dock Buttons
    document.getElementById('travel-wordle')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.world.teleportTo('wordle');
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
    }
  }

  private openAvatarModal(): void {
    new AvatarModal(this.modalHost, () => this.closeModal());
  }

  private openPodiumModal(): void {
    new SnowmanPodiumModal(this.modalHost, () => this.closeModal());
  }

  private openMessageBoardModal(): void {
    new MessageBoardModal(() => {
      this.updateHeaderBadge();
    }).show();
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
