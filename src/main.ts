import { AvatarModal } from './components/AvatarModal';
import { ClosedModal } from './components/ClosedModal';
import { LakeGame } from './components/LakeGame';
import { QuizGame } from './components/QuizGame';
import { SnowmanPodiumModal } from './components/SnowmanPodium';
import { VirtualJoystick } from './components/VirtualJoystick';
import { WordleGame } from './components/WordleGame';
import { AVATAR_ROSTER } from './data/avatars';
import { familyStore } from './state/familyStore';
import { GameType } from './types';
import { soundAudio } from './utils/audio';
import { getTodayDateKey } from './utils/dailyClock';
import { IslandWorld } from './world/islandWorld';

class App {
  private world: IslandWorld;
  private modalHost: HTMLElement;
  private activeGameInstance: WordleGame | LakeGame | QuizGame | null = null;

  constructor() {
    const canvas = document.getElementById('island-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Could not find #island-canvas element');
    this.modalHost = document.getElementById('modal-host') as HTMLElement;

    this.world = new IslandWorld(canvas);
    this.setupUI();
    this.setupPortalTriggers();
    this.setupJoystick();
    this.world.start();
  }

  private setupUI(): void {
    // Format header date
    const dateEl = document.getElementById('island-date-display');
    if (dateEl) {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
      dateEl.textContent = now.toLocaleDateString(undefined, options);
    }

    // Sync header avatar badge
    this.updateHeaderBadge();
    familyStore.subscribe(() => {
      this.updateHeaderBadge();
    });

    // Avatar Button -> Open Avatar Modal
    document.getElementById('header-avatar-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.openAvatarModal();
    });

    // Podium Button -> Open Podium Modal
    document.getElementById('header-podium-btn')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.openPodiumModal();
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
      this.triggerGame('wordle');
    });

    document.getElementById('travel-town')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.openPodiumModal();
    });

    document.getElementById('travel-lake')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.triggerGame('lake');
    });

    document.getElementById('travel-quiz')?.addEventListener('click', () => {
      soundAudio.playButtonClick();
      this.triggerGame('quiz');
    });
  }

  private updateHeaderBadge(): void {
    const activePlayer = familyStore.getActivePlayer();
    const avatar = AVATAR_ROSTER.find(a => a.id === activePlayer.avatarId) || AVATAR_ROSTER[0];

    const emojiEl = document.getElementById('header-avatar-emoji');
    const nameEl = document.getElementById('header-avatar-name');
    const scoreEl = document.getElementById('header-avatar-score');

    if (emojiEl) emojiEl.textContent = avatar.emoji;
    if (nameEl) nameEl.textContent = activePlayer.name;
    if (scoreEl) scoreEl.textContent = `${activePlayer.totalScore} pts`;
  }

  private setupPortalTriggers(): void {
    this.world.onGamePortalTrigger = (game: GameType) => {
      this.triggerGame(game);
    };

    this.world.onAvatarClick = () => {
      this.openAvatarModal();
    };

    this.world.onPodiumClick = () => {
      this.openPodiumModal();
    };
  }

  private setupJoystick(): void {
    const joystickContainer = document.getElementById('joystick-container');
    if (joystickContainer) {
      // Show joystick if on touch screen or mobile viewport
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
      if (isTouch) {
        joystickContainer.classList.remove('hidden');
        new VirtualJoystick(joystickContainer, (dx, dy) => {
          this.world.setJoystickMovement(dx, dy);
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
      this.activeGameInstance = new WordleGame(this.modalHost, () => this.closeModal());
    } else if (game === 'lake') {
      this.activeGameInstance = new LakeGame(this.modalHost, () => this.closeModal());
    } else if (game === 'quiz') {
      this.activeGameInstance = new QuizGame(this.modalHost, () => this.closeModal());
    }
  }

  private openAvatarModal(): void {
    new AvatarModal(this.modalHost, () => this.closeModal());
  }

  private openPodiumModal(): void {
    new SnowmanPodiumModal(this.modalHost, () => this.closeModal());
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
