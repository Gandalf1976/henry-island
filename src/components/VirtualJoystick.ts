export class VirtualJoystick {
  private container: HTMLElement;
  private onMoveCallback: (dx: number, dy: number) => void;
  private isTouching: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private knobEl: HTMLElement | null = null;
  private baseEl: HTMLElement | null = null;
  private maxRadius: number = 42;

  constructor(container: HTMLElement, onMove: (dx: number, dy: number) => void) {
    this.container = container;
    this.onMoveCallback = onMove;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div id="joystick-base" class="relative w-28 h-28 rounded-full bg-slate-900/40 backdrop-blur-sm border-2 border-white/40 shadow-lg flex items-center justify-center touch-none select-none">
        <div id="joystick-knob" class="w-12 h-12 rounded-full bg-gradient-to-b from-amber-400 to-amber-500 border-2 border-white shadow-md flex items-center justify-center text-slate-900 font-black pointer-events-none transition-transform duration-75">
          ⛄
        </div>
      </div>
    `;

    this.baseEl = this.container.querySelector('#joystick-base');
    this.knobEl = this.container.querySelector('#joystick-knob');

    if (!this.baseEl) return;

    const handleStart = (clientX: number, clientY: number) => {
      this.isTouching = true;
      const rect = this.baseEl!.getBoundingClientRect();
      this.startX = rect.left + rect.width / 2;
      this.startY = rect.top + rect.height / 2;
      handleMove(clientX, clientY);
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!this.isTouching || !this.knobEl) return;
      const deltaX = clientX - this.startX;
      const deltaY = clientY - this.startY;
      const dist = Math.hypot(deltaX, deltaY);
      const angle = Math.atan2(deltaY, deltaX);

      const clampedDist = Math.min(dist, this.maxRadius);
      const knobX = Math.cos(angle) * clampedDist;
      const knobY = Math.sin(angle) * clampedDist;

      this.knobEl.style.transform = `translate(${knobX}px, ${knobY}px)`;

      // Normalized vector
      const normX = knobX / this.maxRadius;
      const normY = knobY / this.maxRadius;
      this.onMoveCallback(normX, normY);
    };

    const handleEnd = () => {
      this.isTouching = false;
      if (this.knobEl) {
        this.knobEl.style.transform = 'translate(0px, 0px)';
      }
      this.onMoveCallback(0, 0);
    };

    this.baseEl.addEventListener('pointerdown', (e: PointerEvent) => {
      handleStart(e.clientX, e.clientY);
      this.baseEl?.setPointerCapture(e.pointerId);
    });

    this.baseEl.addEventListener('pointermove', (e: PointerEvent) => {
      handleMove(e.clientX, e.clientY);
    });

    this.baseEl.addEventListener('pointerup', (e: PointerEvent) => {
      handleEnd();
      this.baseEl?.releasePointerCapture(e.pointerId);
    });

    this.baseEl.addEventListener('pointercancel', () => {
      handleEnd();
    });
  }
}
