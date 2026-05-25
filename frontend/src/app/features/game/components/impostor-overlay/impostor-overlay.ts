import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';

/**
 * 2I.8 — UI de adivinación del impostor.
 *
 * Elemento flotante persistente visible en todas las fases del juego
 * (DRAWING, GALLERY, VOTING, TIE_BREAK). Se oculta en CONNECTING, RESULT y OVER.
 *
 * Muestra:
 *  - La pista recibida una sola vez en ROLE_ASSIGNMENT
 *  - Una caja de texto para escribir el intento de adivinación
 *  - Un botón de enviar
 *  - Las vidas restantes (corazones)
 *
 * El componente es puramente presentacional: recibe todo su estado como @Input()
 * desde GameComponent. Esto evita problemas de hydration SSR con signals.
 *
 * Solo se renderiza si `visible` es true (controlado por el padre).
 * El evento `guessSubmitted` lo recoge GameComponent y lo reenvía al servidor.
 */
@Component({
  selector: 'app-impostor-overlay',
  standalone: true,
  imports: [],
  templateUrl: './impostor-overlay.html',
  styleUrl: './impostor-overlay.css',
})
export class ImpostorOverlay {
  /** Controla si el panel es visible. El padre lo calcula como: isImpostor && fase activa. */
  @Input() visible = false;

  /** La pista que el impostor recibió en ROLE_ASSIGNMENT (no cambia durante la partida). */
  @Input() hint: string | null = null;

  /** Vidas restantes del impostor. */
  @Input() lives: number | null = null;

  /** Texto del input de adivinación. */
  protected readonly guessText = signal('');

  /** Corazones a mostrar como array de índices. */
  protected get livesArray(): number[] {
    if (this.lives === null || this.lives <= 0) return [];
    return Array.from({ length: this.lives }, (_, i) => i);
  }

  /** True si el impostor ya no tiene vidas (input bloqueado). */
  protected get outOfLives(): boolean {
    return (this.lives ?? 0) <= 0;
  }

  /** Texto del guess enviado (lo consume GameComponent). */
  @Output() guessSubmitted = new EventEmitter<string>();

  /** Estado de animación de shake (feedback de fallo). */
  protected shaking = false;

  /** Minimizado por el usuario. */
  protected minimized = false;

  // ── Event handlers ───────────────────────────────────────────────────────

  protected onInput(event: Event): void {
    this.guessText.set((event.target as HTMLInputElement).value);
  }

  protected submitGuess(): void {
    const text = this.guessText().trim();
    if (!text || this.outOfLives) return;
    this.guessSubmitted.emit(text);
    this.guessText.set('');
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.submitGuess();
  }

  protected toggleMinimize(): void {
    this.minimized = !this.minimized;
  }

  /**
   * Activa la animación de shake (llamada externamente tras un fallo).
   */
  triggerShake(): void {
    this.shaking = true;
    setTimeout(() => (this.shaking = false), 600);
  }
}
