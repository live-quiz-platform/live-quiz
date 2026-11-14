import { Component, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';

@Component({
  selector: 'app-login-characters',
  templateUrl: './login-characters.html',
  styleUrl: './login-characters.scss',
  host: {
    '[class.password-active]': 'passwordActive()',
    '[style.--look-x]': 'look().x + "px"',
    '[style.--look-y]': 'look().y + "px"',
    '(document:pointermove)': 'onPointerMove($event)',
    '(document:pointerout)': 'onPointerOut($event)',
    '(window:blur)': 'resetLook()'
  }
})
export class LoginCharacters {
  readonly passwordActive = input(false);
  protected readonly look = signal({ x: 0, y: 0 });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly view = this.element.ownerDocument.defaultView;
  private readonly reducedMotion = this.view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  private frameId: number | null = null;
  private pointer = { x: 0, y: 0 };

  constructor() {
    const reset = () => this.resetLook();
    this.reducedMotion?.addEventListener('change', reset);

    inject(DestroyRef).onDestroy(() => {
      this.resetLook();
      this.reducedMotion?.removeEventListener('change', reset);
    });
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.view || event.pointerType === 'touch' ||
        this.passwordActive() || this.reducedMotion?.matches) {
      return;
    }

    this.pointer = { x: event.clientX, y: event.clientY };

    if (this.frameId !== null) {
      return;
    }

    this.frameId = this.view.requestAnimationFrame(() => {
      this.frameId = null;

      if (this.passwordActive() || this.reducedMotion?.matches) {
        return;
      }

      const bounds = this.element.getBoundingClientRect();

      if (!bounds.width || !bounds.height) {
        return;
      }

      this.look.set({
        x: Math.max(-4, Math.min(4, (this.pointer.x - bounds.left - bounds.width / 2) / 80)),
        y: Math.max(-3, Math.min(3, (this.pointer.y - bounds.top - bounds.height / 2) / 100))
      });
    });
  }

  protected onPointerOut(event: PointerEvent): void {
    if (event.relatedTarget === null) {
      this.resetLook();
    }
  }

  protected resetLook(): void {
    if (this.frameId !== null) {
      this.view?.cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    this.look.set({ x: 0, y: 0 });
  }
}
