import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';

import { GameState } from '../../models/game-state';
import { StrokeBroadcast } from '../../models/game-event';
import { CanvasComponent } from '../canvas/canvas';
import { SpectatorCanvasService } from '../../services/spectator-canvas';

/**
 * 2I.2 — Vista de la fase de dibujo.
 *
 * - Si el jugador local es el dibujante actual y es PAINTER → canvas activo (delegado a CanvasComponent).
 * - En otro caso → modo espectador con miniatura del dibujante actual via SpectatorCanvasService.
 *
 * El IMPOSTOR ve además una caja inline de adivinación. Es un fallback hasta
 * que P6 entregue 2I.8 (UI flotante del impostor) — entonces este bloque
 * desaparece y el container monta el componente de P6 en el slot.
 */
@Component({
  selector: 'app-drawing-phase-view',
  standalone: true,
  imports: [CanvasComponent],
  templateUrl: './drawing-phase-view.html',
  styleUrl: './drawing-phase-view.css',
})
export class DrawingPhaseView {
  @Input({ required: true }) state!: GameState;
  @Input() myPlayerId: number | null = null;

  /** Trazo capturado por el canvas activo, listo para reenviar via WebSocket. */
  @Output() strokeEmitted = new EventEmitter<Omit<StrokeBroadcast, 'playerId' | 'type'>>();
  /** Texto de adivinación enviado por el impostor (fallback hasta 2I.8 de P6). */
  @Output() guessSubmitted = new EventEmitter<string>();

  protected readonly spectator = inject(SpectatorCanvasService);
  protected readonly guessText = signal('');

  protected readonly isMyTurn = computed(() => {
    return this.myPlayerId !== null && this.state.currentDrawerId === this.myPlayerId;
  });

  protected readonly isImpostor = computed(() => this.state.myRole === 'IMPOSTOR');

  protected readonly canDraw = computed(() => this.isMyTurn() && this.state.myRole === 'PAINTER');

  protected readonly drawerSnapshot = computed(() => {
    const id = this.state.currentDrawerId;
    if (id === null) return null;
    return this.spectator.snapshots()[id] ?? null;
  });

  protected onGuessInput(event: Event): void {
    this.guessText.set((event.target as HTMLInputElement).value);
  }

  protected submitGuess(): void {
    const text = this.guessText().trim();
    if (text.length > 0) {
      this.guessSubmitted.emit(text);
      this.guessText.set('');
    }
  }
}
