import { AVATAR_ROSTER } from '../data/avatars';
import { familyStore } from '../state/familyStore';
import { GameType, IslandPortal } from '../types';
import { soundAudio } from '../utils/audio';
import { getTimeUntilMidnight, getTodayDateKey } from '../utils/dailyClock';
import { drawSnowman } from '../utils/snowmanRenderer';

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  opacity: number;
  swaySpeed: number;
  swayOffset: number;
}

interface Footprint {
  x: number;
  y: number;
  alpha: number;
}

interface PenguinNpc {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  waddlePhase: number;
  facingLeft: boolean;
}

export class IslandWorld {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 1000;
  private height: number = 800;

  // Camera & view
  private cameraX: number = 500;
  private cameraY: number = 400;

  // Player state
  private playerX: number = 500;
  private playerY: number = 460;
  private targetX: number | null = null;
  private targetY: number | null = null;
  private playerSpeed: number = 3.6;
  private isMoving: boolean = false;
  private walkPhase: number = 0;
  private facingLeft: boolean = false;
  private lastStepAudioTime: number = 0;

  // Footprints in snow
  private footprints: Footprint[] = [];

  // Weather: Snow system
  private snowflakes: Snowflake[] = [];
  private snowIntensity: number = 0.6; // 0 to 1
  private snowTimer: number = 0;

  // Wandering Penguins
  private penguins: PenguinNpc[] = [];

  // Portals
  public portals: IslandPortal[] = [
    {
      id: 'wordle',
      title: 'Henry-Wordle',
      subtitle: 'Wordle Cottage',
      icon: '🟩',
      x: 320,
      y: 220,
      radius: 46
    },
    {
      id: 'lake',
      title: 'Henry-Lake',
      subtitle: 'Frozen Lake',
      icon: '🪷',
      x: 740,
      y: 260,
      radius: 48
    },
    {
      id: 'quiz',
      title: 'Henry-Quiz',
      subtitle: 'Quiz Observatory',
      icon: '🧠',
      x: 340,
      y: 620,
      radius: 46
    }
  ];

  // Callback hooks
  public onGamePortalTrigger?: (game: GameType) => void;
  public onAvatarClick?: () => void;
  public onPodiumClick?: () => void;

  private isRunning: boolean = false;
  private keysDown: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas 2d context');
    this.ctx = ctx;

    this.initSnowflakes(160);
    this.initPenguins();
    this.setupEvents();
    this.resize();
  }

  public resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.parentElement?.getBoundingClientRect() || { width: 1000, height: 750 };

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  private initSnowflakes(count: number): void {
    this.snowflakes = [];
    for (let i = 0; i < count; i++) {
      this.snowflakes.push({
        x: Math.random() * 1200 - 100,
        y: Math.random() * 1000 - 100,
        radius: 1 + Math.random() * 2.8,
        speedY: 0.8 + Math.random() * 1.5,
        speedX: -0.5 + Math.random() * 1,
        opacity: 0.3 + Math.random() * 0.7,
        swaySpeed: 0.02 + Math.random() * 0.03,
        swayOffset: Math.random() * Math.PI * 2
      });
    }
  }

  private initPenguins(): void {
    this.penguins = [
      { x: 680, y: 380, targetX: 740, targetY: 410, speed: 0.8, waddlePhase: 0, facingLeft: false },
      { x: 790, y: 350, targetX: 720, targetY: 340, speed: 0.7, waddlePhase: 1.5, facingLeft: true },
      { x: 470, y: 280, targetX: 520, targetY: 260, speed: 0.9, waddlePhase: 0.7, facingLeft: false },
      { x: 260, y: 550, targetX: 290, targetY: 590, speed: 0.75, waddlePhase: 2.1, facingLeft: false }
    ];
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Don't capture keys if modal input is focused
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }
      this.keysDown.add(e.key.toLowerCase());
      this.keysDown.add(e.code);
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keysDown.delete(e.key.toLowerCase());
      this.keysDown.delete(e.code);
    });

    // Pointer / Touch / Click-to-move
    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Transform to world coordinates
      const worldX = clickX - (this.width / 2 - this.cameraX);
      const worldY = clickY - (this.height / 2 - this.cameraY);

      // Check if clicking own avatar
      const distToPlayer = Math.hypot(worldX - this.playerX, worldY - this.playerY);
      if (distToPlayer < 35) {
        soundAudio.playButtonClick();
        if (this.onAvatarClick) this.onAvatarClick();
        return;
      }

      // Check if clicking podium center
      const distToPodium = Math.hypot(worldX - 500, worldY - 450);
      if (distToPodium < 70) {
        soundAudio.playButtonClick();
        if (this.onPodiumClick) this.onPodiumClick();
        return;
      }

      // Check if clicking a portal
      for (const portal of this.portals) {
        const d = Math.hypot(worldX - portal.x, worldY - portal.y);
        if (d < portal.radius + 15) {
          // Walk toward portal or trigger
          this.targetX = portal.x;
          this.targetY = portal.y + 25;
          soundAudio.playButtonClick();
          return;
        }
      }

      // Walk to clicked location
      this.targetX = Math.max(120, Math.min(880, worldX));
      this.targetY = Math.max(120, Math.min(740, worldY));
    });
  }

  public setJoystickMovement(dx: number, dy: number): void {
    if (Math.hypot(dx, dy) > 0.1) {
      this.targetX = null;
      this.targetY = null;
      this.playerX += dx * this.playerSpeed;
      this.playerY += dy * this.playerSpeed;
      this.isMoving = true;
      this.facingLeft = dx < 0;
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    const loop = () => {
      if (!this.isRunning) return;
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  public stop(): void {
    this.isRunning = false;
  }

  private update(): void {
    let moveX = 0;
    let moveY = 0;

    // 1. Keyboard input
    if (this.keysDown.has('arrowleft') || this.keysDown.has('a') || this.keysDown.has('keya')) moveX -= 1;
    if (this.keysDown.has('arrowright') || this.keysDown.has('d') || this.keysDown.has('keyd')) moveX += 1;
    if (this.keysDown.has('arrowup') || this.keysDown.has('w') || this.keysDown.has('keyw')) moveY -= 1;
    if (this.keysDown.has('arrowdown') || this.keysDown.has('s') || this.keysDown.has('keys')) moveY += 1;

    if (moveX !== 0 || moveY !== 0) {
      this.targetX = null;
      this.targetY = null;
      const len = Math.hypot(moveX, moveY);
      moveX /= len;
      moveY /= len;
      this.playerX += moveX * this.playerSpeed;
      this.playerY += moveY * this.playerSpeed;
      this.isMoving = true;
      if (moveX !== 0) this.facingLeft = moveX < 0;
    } else if (this.targetX !== null && this.targetY !== null) {
      // 2. Click to move waypoint
      const dx = this.targetX - this.playerX;
      const dy = this.targetY - this.playerY;
      const dist = Math.hypot(dx, dy);

      if (dist < 4) {
        this.playerX = this.targetX;
        this.playerY = this.targetY;
        this.targetX = null;
        this.targetY = null;
        this.isMoving = false;
      } else {
        this.playerX += (dx / dist) * this.playerSpeed;
        this.playerY += (dy / dist) * this.playerSpeed;
        this.isMoving = true;
        this.facingLeft = dx < 0;
      }
    } else {
      this.isMoving = false;
    }

    // Island boundary clamp
    this.playerX = Math.max(120, Math.min(880, this.playerX));
    this.playerY = Math.max(120, Math.min(740, this.playerY));

    // Smooth camera follow
    this.cameraX += (this.playerX - this.cameraX) * 0.1;
    this.cameraY += (this.playerY - this.cameraY) * 0.1;

    // Walk animation & footsteps in snow
    if (this.isMoving) {
      this.walkPhase += 0.22;
      const now = performance.now();
      if (now - this.lastStepAudioTime > 280) {
        soundAudio.playSnowStep();
        this.lastStepAudioTime = now;
        // Leave footprint
        this.footprints.push({
          x: this.playerX + (Math.sin(this.walkPhase) > 0 ? 5 : -5),
          y: this.playerY + 8,
          alpha: 0.6
        });
      }
    } else {
      this.walkPhase = 0;
    }

    // Decay footprints slowly
    for (let i = this.footprints.length - 1; i >= 0; i--) {
      this.footprints[i].alpha -= 0.003;
      if (this.footprints[i].alpha <= 0) {
        this.footprints.splice(i, 1);
      }
    }

    // Update wandering penguins
    this.penguins.forEach(p => {
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 6) {
        // Pick new random wander target near current spot
        p.targetX = p.x + (Math.random() * 140 - 70);
        p.targetY = p.y + (Math.random() * 100 - 50);
        p.targetX = Math.max(160, Math.min(840, p.targetX));
        p.targetY = Math.max(160, Math.min(700, p.targetY));
      } else {
        p.x += (dx / dist) * p.speed;
        p.y += (dy / dist) * p.speed;
        p.facingLeft = dx < 0;
        p.waddlePhase += 0.18;
      }
    });

    // Snow weather oscillator
    this.snowTimer += 0.01;
    this.snowIntensity = 0.5 + 0.4 * Math.sin(this.snowTimer); // oscillates between 0.1 and 0.9

    // Snowflakes drift
    const activeSnowCount = Math.floor(this.snowflakes.length * this.snowIntensity);
    for (let i = 0; i < activeSnowCount; i++) {
      const f = this.snowflakes[i];
      f.y += f.speedY;
      f.x += f.speedX + Math.sin(f.swayOffset + this.snowTimer * 2) * 0.4;

      if (f.y > 900) {
        f.y = -20;
        f.x = Math.random() * 1000;
      }
      if (f.x > 1050) f.x = -20;
      if (f.x < -20) f.x = 1050;
    }

    // Portal proximity check
    for (const portal of this.portals) {
      const d = Math.hypot(this.playerX - portal.x, this.playerY - portal.y);
      if (d < portal.radius * 0.75) {
        if (this.onGamePortalTrigger) {
          this.onGamePortalTrigger(portal.id);
          // Gently push player back so it doesn't immediately re-trigger in a loop
          this.playerY += 12;
          this.targetX = null;
          this.targetY = null;
        }
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    // Center camera on player with smooth offset
    const offsetX = Math.round(this.width / 2 - this.cameraX);
    const offsetY = Math.round(this.height / 2 - this.cameraY);
    ctx.translate(offsetX, offsetY);

    // 1. Surrounding Ocean with festive animated water & waves
    this.drawOcean(ctx);

    // 2. Island Base & Snowy Terrain
    this.drawIslandTerrain(ctx);

    // 3. Cobblestone / Snow Paths
    this.drawPaths(ctx);

    // 4. Frozen Lake & Ice Floes (Henry-Lake area)
    this.drawLakeArea(ctx);

    // 5. Scenery Decor (Log Cabins, Candy Canes, Santa Sleigh, Pines)
    this.drawDecor(ctx);

    // 6. Central Town Square: Podium & Dynamic Snowmen Leaderboard
    this.drawTownSquare(ctx);

    // 7. Portals & Entrance Signposts ("OPEN" vs "CLOSED")
    this.drawPortals(ctx);

    // 8. Footprints in snow
    this.drawFootprints(ctx);

    // 9. Wandering Penguins
    this.drawPenguins(ctx);

    // 10. Player Avatar
    this.drawPlayer(ctx);

    // 11. Snow Particle Overlay
    this.drawSnowflakes(ctx);

    ctx.restore();

    // 12. Screen HUD Vignette / Weather indicator
    this.drawHudOverlay(ctx);
  }

  private drawOcean(ctx: CanvasRenderingContext2D): void {
    // Deep crystal winter sea
    const seaGrad = ctx.createRadialGradient(500, 420, 300, 500, 420, 750);
    seaGrad.addColorStop(0, '#1e3a8a');
    seaGrad.addColorStop(0.7, '#1e40af');
    seaGrad.addColorStop(1, '#0f172a');

    ctx.fillStyle = seaGrad;
    ctx.fillRect(-200, -200, 1400, 1200);

    // Gentle wave foam ripples
    const time = Date.now() / 1200;
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.28)';
    ctx.lineWidth = 3;
    for (let r = 460; r <= 560; r += 28) {
      ctx.beginPath();
      ctx.ellipse(500, 430, r + Math.sin(time + r) * 6, (r * 0.72) + Math.cos(time + r) * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawIslandTerrain(ctx: CanvasRenderingContext2D): void {
    // Outer sandy snowy beach
    ctx.beginPath();
    ctx.ellipse(500, 430, 440, 330, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#cbd5e1'; // frosty shore
    ctx.fill();

    // Soft winter white snow blanket
    ctx.beginPath();
    ctx.ellipse(500, 420, 410, 305, 0, 0, Math.PI * 2);
    const snowGrad = ctx.createRadialGradient(500, 400, 50, 500, 420, 410);
    snowGrad.addColorStop(0, '#ffffff');
    snowGrad.addColorStop(0.65, '#f8fafc');
    snowGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = snowGrad;
    ctx.fill();

    // Gentle soft snow banks / topography shading
    ctx.fillStyle = 'rgba(186, 230, 253, 0.35)';
    ctx.beginPath();
    ctx.arc(380, 340, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(620, 520, 140, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPaths(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = '#e0e7ff';
    ctx.fillStyle = '#f1f5f9';
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Central circular plaza path
    ctx.beginPath();
    ctx.ellipse(500, 450, 130, 75, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Path to Wordle Cottage (North-West)
    ctx.beginPath();
    ctx.moveTo(430, 410);
    ctx.quadraticCurveTo(380, 310, 320, 250);
    ctx.stroke();

    // Path to Henry-Lake (East)
    ctx.beginPath();
    ctx.moveTo(580, 430);
    ctx.quadraticCurveTo(660, 380, 720, 300);
    ctx.stroke();

    // Path to Quiz Observatory (South-West)
    ctx.beginPath();
    ctx.moveTo(440, 490);
    ctx.quadraticCurveTo(390, 560, 350, 600);
    ctx.stroke();

    // Cobblestone stepping stones along paths
    ctx.fillStyle = '#cbd5e1';
    const stones = [
      { x: 400, y: 350 }, { x: 360, y: 300 }, { x: 330, y: 260 },
      { x: 620, y: 400 }, { x: 660, y: 350 }, { x: 700, y: 310 },
      { x: 420, y: 520 }, { x: 390, y: 550 }, { x: 360, y: 580 }
    ];
    stones.forEach(s => {
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 7, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  private drawLakeArea(ctx: CanvasRenderingContext2D): void {
    const lx = 740;
    const ly = 260;

    // Outer frozen shoreline
    ctx.beginPath();
    ctx.ellipse(lx, ly, 105, 75, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#bfdbfe';
    ctx.fill();

    // Shimmering ice lake surface
    ctx.beginPath();
    ctx.ellipse(lx, ly, 92, 64, -0.15, 0, Math.PI * 2);
    const iceGrad = ctx.createLinearGradient(lx - 80, ly - 50, lx + 80, ly + 50);
    iceGrad.addColorStop(0, '#93c5fd');
    iceGrad.addColorStop(0.5, '#60a5fa');
    iceGrad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = iceGrad;
    ctx.fill();

    // Ice cracks / glistening lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx - 40, ly - 15);
    ctx.lineTo(lx - 10, ly);
    ctx.lineTo(lx + 20, ly - 20);
    ctx.moveTo(lx - 10, ly);
    ctx.lineTo(lx + 15, ly + 22);
    ctx.stroke();

    // Floating green lilypads with frosted edges
    const lilypads = [
      { x: lx - 45, y: ly + 15, r: 12 },
      { x: lx + 35, y: ly - 18, r: 14 },
      { x: lx + 10, y: ly + 25, r: 11 },
      { x: lx - 20, y: ly - 25, r: 13 }
    ];

    lilypads.forEach(lp => {
      ctx.beginPath();
      ctx.arc(lp.x, lp.y, lp.r, 0.2, Math.PI * 1.85);
      ctx.lineTo(lp.x, lp.y);
      ctx.closePath();
      ctx.fillStyle = '#15803d';
      ctx.fill();
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Lake banner title
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('❄️ Frozen Lake ❄️', lx, ly - 72);
  }

  private drawDecor(ctx: CanvasRenderingContext2D): void {
    // 1. Wordle Cottage (North-West)
    this.drawLogCabin(ctx, 320, 190, 'Wordle Cottage');

    // 2. Quiz Observatory (South-West)
    this.drawObservatory(ctx, 340, 600, 'Quiz Observatory');

    // 3. Santa & Sleigh (North-East clearing)
    this.drawSantaAndSleigh(ctx, 580, 180);

    // 4. Reindeer (Grazing near trees)
    this.drawReindeer(ctx, 680, 190);
    this.drawReindeer(ctx, 220, 380);

    // 5. Pine Trees with snow & fairy lights
    const trees = [
      { x: 190, y: 220, s: 1.1 },
      { x: 230, y: 170, s: 1.3 },
      { x: 450, y: 150, s: 1.2 },
      { x: 830, y: 180, s: 1.3 },
      { x: 870, y: 270, s: 1.2 },
      { x: 850, y: 410, s: 1.1 },
      { x: 780, y: 550, s: 1.4 },
      { x: 670, y: 640, s: 1.2 },
      { x: 500, y: 680, s: 1.3 },
      { x: 210, y: 510, s: 1.2 },
      { x: 170, y: 620, s: 1.3 }
    ];
    trees.forEach(t => this.drawPineTree(ctx, t.x, t.y, t.s));

    // 6. Candy Canes along path entrances
    const canes = [
      { x: 380, y: 400 },
      { x: 420, y: 380 },
      { x: 590, y: 410 },
      { x: 420, y: 510 }
    ];
    canes.forEach(c => this.drawCandyCane(ctx, c.x, c.y));
  }

  private drawLogCabin(ctx: CanvasRenderingContext2D, x: number, y: number, name: string): void {
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 30, 48, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wood walls
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-38, -10, 76, 38);

    // Horizontal log lines
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    for (let ly = -2; ly <= 24; ly += 7) {
      ctx.beginPath();
      ctx.moveTo(-38, ly);
      ctx.lineTo(38, ly);
      ctx.stroke();
    }

    // Door
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-10, 6, 20, 22);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(6, 17, 2, 0, Math.PI * 2);
    ctx.fill(); // knob

    // Holiday Wreath on door
    ctx.beginPath();
    ctx.arc(0, 12, 5.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-1.5, 7, 3, 3); // red bow

    // Glowing warm windows
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 8;
    ctx.fillRect(-28, 4, 12, 12);
    ctx.fillRect(16, 4, 12, 12);
    ctx.shadowBlur = 0;

    // Window frames
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-28, 4, 12, 12);
    ctx.strokeRect(16, 4, 12, 12);

    // Snow-covered roof
    ctx.beginPath();
    ctx.moveTo(-48, -10);
    ctx.lineTo(0, -42);
    ctx.lineTo(48, -10);
    ctx.closePath();
    ctx.fillStyle = '#b45309';
    ctx.fill();

    // Thick snow layer on roof
    ctx.beginPath();
    ctx.moveTo(-52, -10);
    ctx.lineTo(0, -46);
    ctx.lineTo(52, -10);
    ctx.lineTo(46, -6);
    ctx.lineTo(0, -38);
    ctx.lineTo(-46, -6);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e0f2fe';
    ctx.stroke();

    // Chimney & smoke
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(18, -44, 10, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, -46, 14, 4);

    // Smoke puffs
    const time = Date.now() / 600;
    ctx.fillStyle = 'rgba(241, 245, 249, 0.7)';
    for (let p = 0; p < 3; p++) {
      const py = -52 - p * 12 - (time * 10) % 30;
      const px = 23 + Math.sin(time + p) * 6;
      ctx.beginPath();
      ctx.arc(px, py, 4 + p * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sign title
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 0, 48);

    ctx.restore();
  }

  private drawObservatory(ctx: CanvasRenderingContext2D, x: number, y: number, name: string): void {
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 42, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone base building
    ctx.fillStyle = '#475569';
    ctx.fillRect(-32, -4, 64, 28);

    // Observatory Dome
    ctx.beginPath();
    ctx.arc(0, -4, 30, Math.PI, 0);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Telescope protruding through dome slit
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.rect(-6, -34, 12, 22);
    ctx.fill();

    // Snow caps on dome
    ctx.beginPath();
    ctx.arc(0, -4, 30, Math.PI * 1.15, Math.PI * 1.85);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Warm door
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-8, 6, 16, 18);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 0, 42);

    ctx.restore();
  }

  private drawSantaAndSleigh(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);

    // Wooden Sleigh Runners
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-35, 12);
    ctx.lineTo(25, 12);
    ctx.quadraticCurveTo(35, 12, 38, -2);
    ctx.stroke();

    // Sleigh Carriage Body
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(-32, 8);
    ctx.lineTo(22, 8);
    ctx.lineTo(26, -10);
    ctx.quadraticCurveTo(10, -8, -10, -8);
    ctx.lineTo(-30, -2);
    ctx.closePath();
    ctx.fill();

    // Gold trim
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Santa in sleigh
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎅', -4, -6);

    // Gift sacks behind
    ctx.font = '16px sans-serif';
    ctx.fillText('🎁', -22, -4);
    ctx.fillText('🎄', -14, -14);

    ctx.restore();
  }

  private drawReindeer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🦌', 0, 0);
    ctx.restore();
  }

  private drawPineTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1.0): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Trunk
    ctx.fillStyle = '#543217';
    ctx.fillRect(-5, 6, 10, 18);

    // 3 Tier Foliage with snow caps
    const tiers = [
      { y: 8, w: 26, h: 18 },
      { y: -4, w: 22, h: 16 },
      { y: -16, w: 16, h: 14 }
    ];

    tiers.forEach((t, i) => {
      // Green tree layer
      ctx.beginPath();
      ctx.moveTo(-t.w, t.y);
      ctx.lineTo(0, t.y - t.h);
      ctx.lineTo(t.w, t.y);
      ctx.closePath();
      ctx.fillStyle = '#166534';
      ctx.fill();

      // Snow on branches
      ctx.beginPath();
      ctx.moveTo(-t.w, t.y);
      ctx.lineTo(-t.w * 0.5, t.y - 2);
      ctx.lineTo(0, t.y - t.h + 4);
      ctx.lineTo(t.w * 0.5, t.y - 2);
      ctx.lineTo(t.w, t.y);
      ctx.lineTo(t.w * 0.8, t.y + 3);
      ctx.lineTo(0, t.y - 2);
      ctx.lineTo(-t.w * 0.8, t.y + 3);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Baubles / fairy lights
      const baubleColors = ['#ef4444', '#f59e0b', '#3b82f6', '#ec4899'];
      ctx.fillStyle = baubleColors[i % baubleColors.length];
      ctx.beginPath();
      ctx.arc(-t.w * 0.45, t.y - 1, 2.2, 0, Math.PI * 2);
      ctx.arc(t.w * 0.45, t.y - 1, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Star on top
    ctx.fillStyle = '#facc15';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⭐', 0, -28);

    ctx.restore();
  }

  private drawCandyCane(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🦯', 0, 0);
    ctx.restore();
  }

  private drawTownSquare(ctx: CanvasRenderingContext2D): void {
    const cx = 500;
    const cy = 450;

    // Podium for top 3 players
    const leaderboard = familyStore.getLeaderboard();

    // Central Festive Tree in town center
    this.drawPineTree(ctx, cx, cy - 65, 1.6);

    // Podium Plinth base
    const podiumSlots = [
      { rank: 2, label: '2nd', x: cx - 75, y: cy + 15, h: 26, color: '#94a3b8' },
      { rank: 1, label: '1st', x: cx, y: cy + 25, h: 38, color: '#f59e0b' },
      { rank: 3, label: '3rd', x: cx + 75, y: cy + 10, h: 18, color: '#b45309' }
    ];

    podiumSlots.forEach(slot => {
      // Pedestal Block
      ctx.fillStyle = slot.color;
      ctx.fillRect(slot.x - 28, slot.y - slot.h, 56, slot.h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(slot.x - 28, slot.y - slot.h, 56, slot.h);

      // Rank Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(slot.label, slot.x, slot.y - slot.h * 0.4);

      // Find player with this rank
      const entry = leaderboard.find(l => l.rank === slot.rank);
      if (entry) {
        // Draw their dynamic Snowman on the podium!
        drawSnowman(ctx, {
          score: entry.player.totalScore,
          x: slot.x,
          y: slot.y - slot.h - 8,
          scale: 0.85
        });

        // Player Name & Score badge
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(entry.player.name, slot.x, slot.y + 16);

        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`⛄ ${entry.player.totalScore} pts`, slot.x, slot.y + 28);
      }
    });

    // Town Square Banner
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎄 Henry Island Town Square 🎄', cx, cy - 120);

    // Click podium hint
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('(Tap Podium for Full Leaderboard)', cx, cy + 50);
  }

  private drawPortals(ctx: CanvasRenderingContext2D): void {
    const activePlayer = familyStore.getActivePlayer();
    const today = getTodayDateKey();
    const countdown = getTimeUntilMidnight();

    for (const portal of this.portals) {
      const isCompleted = familyStore.isGameCompletedToday(activePlayer.id, portal.id, today);

      ctx.save();
      ctx.translate(portal.x, portal.y);

      // Portal base halo
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
      ctx.fillStyle = isCompleted ? 'rgba(148, 163, 184, 0.25)' : 'rgba(56, 189, 248, 0.3)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isCompleted ? '#94a3b8' : '#38bdf8';
      ctx.stroke();

      // Signpost post
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-3, 15, 6, 20);

      // Signboard
      const signY = -12;
      ctx.fillStyle = isCompleted ? '#b91c1c' : '#15803d'; // Red if Closed, Green if Open
      ctx.beginPath();
      ctx.roundRect(-42, signY - 14, 84, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text inside signboard
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px sans-serif';

      if (isCompleted) {
        ctx.fillText('🔒 CLOSED', 0, signY);
        ctx.font = '9px sans-serif';
        ctx.fillText(countdown.formatted, 0, signY + 10);
      } else {
        ctx.fillText('⭐ OPEN', 0, signY);
        ctx.font = '9px sans-serif';
        ctx.fillText('Play Today!', 0, signY + 10);
      }

      // Portal Title & Icon
      ctx.font = '22px sans-serif';
      ctx.fillText(portal.icon, 0, -32);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(portal.title, 0, 48);

      ctx.restore();
    }
  }

  private drawFootprints(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const fp of this.footprints) {
      ctx.beginPath();
      ctx.ellipse(fp.x, fp.y, 3, 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(147, 197, 253, ${fp.alpha})`;
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPenguins(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    this.penguins.forEach(p => {
      ctx.translate(p.x, p.y);
      const waddle = Math.sin(p.waddlePhase) * 0.15;
      ctx.rotate(waddle);

      // Shadow
      ctx.beginPath();
      ctx.ellipse(0, 8, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fill();

      // Emoji Penguin with flip
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      if (p.facingLeft) {
        ctx.scale(-1, 1);
      }
      ctx.fillText('🐧', 0, 4);

      if (p.facingLeft) {
        ctx.scale(-1, 1);
      }
      ctx.rotate(-waddle);
      ctx.translate(-p.x, -p.y);
    });
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    const activePlayer = familyStore.getActivePlayer();
    const avatar = AVATAR_ROSTER.find(a => a.id === activePlayer.avatarId) || AVATAR_ROSTER[0];

    ctx.save();
    ctx.translate(this.playerX, this.playerY);

    // Walking vertical bob
    const bob = this.isMoving ? Math.abs(Math.sin(this.walkPhase)) * 3 : 0;

    // Ground Shadow
    ctx.beginPath();
    ctx.ellipse(0, 10, 16, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fill();

    // Player Avatar Emoji & Character Body
    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(avatar.emoji, 0, -4 - bob);

    if (this.facingLeft) {
      ctx.scale(-1, 1); // unflip for name label
    }

    // Name tag banner above player
    ctx.font = 'bold 11px sans-serif';
    const tagWidth = ctx.measureText(activePlayer.name).width + 16;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(-tagWidth / 2, -32 - bob, tagWidth, 16, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(activePlayer.name, 0, -24 - bob);

    // Click indicator badge
    ctx.fillStyle = '#f59e0b';
    ctx.font = '9px sans-serif';
    ctx.fillText('👤 Status', 0, 24);

    ctx.restore();
  }

  private drawSnowflakes(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    const activeSnowCount = Math.floor(this.snowflakes.length * this.snowIntensity);
    for (let i = 0; i < activeSnowCount; i++) {
      const f = this.snowflakes[i];
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
      ctx.fill();
    }
    ctx.restore();
  }

  private drawHudOverlay(ctx: CanvasRenderingContext2D): void {
    // Gentle vignette around edges for warm Animal Crossing winter atmosphere
    const grad = ctx.createRadialGradient(
      this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.45,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.75
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, 'rgba(219, 234, 254, 0.35)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
