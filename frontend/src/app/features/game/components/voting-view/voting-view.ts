import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';

import { GameState } from '../../models/game-state';
import { SpectatorCanvasService } from '../../services/spectator-canvas';

/**
 * 2I.4 — Vista de votación.
 *
 * Tarjetas de jugadores vivos con miniatura del dibujo. Click en una tarjeta
 * emite `voteCast` y bloquea reintentos (un voto por jugador). Excluye a los
 * jugadores ya eliminados (`state.eliminated`).
 */
@Component({
  selector: 'app-voting-view',
  standalone: true,
  imports: [],
  templateUrl: './voting-view.html',
  styleUrl: './voting-view.css',
})
export class VotingView {
  @Input({ required: true }) state!: GameState;
  @Input() myPlayerId: number | null = null;

  @Output() voteCast = new EventEmitter<number>();

  protected readonly spectator = inject(SpectatorCanvasService);
  protected readonly myVote = signal<number | null>(null);

  protected readonly votablePlayers = computed(() => {
    return this.state.drawingOrder.filter((id) => id !== this.state.eliminated);
  });

  protected snapshotFor(playerId: number): string | null {
    return this.spectator.snapshots()[playerId] ?? null;
  }

  protected onVote(playerId: number): void {
    if (this.myVote() !== null) return;
    this.myVote.set(playerId);
    this.voteCast.emit(playerId);
  }
}
