import { Component, EventEmitter, Output, computed, inject, input, signal } from '@angular/core';

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
  readonly state = input.required<GameState>();
  readonly myPlayerId = input<number | null>(null);

  @Output() voteCast = new EventEmitter<number>();

  protected readonly spectator = inject(SpectatorCanvasService);
  protected readonly myVote = signal<number | null>(null);

  protected readonly isLocalPlayerEliminated = computed(() => {
    const id = this.myPlayerId();
    return id != null && this.state().eliminatedPlayers.includes(id);
  });

  protected readonly votablePlayers = computed(() => {
    const eliminated = new Set(this.state().eliminatedPlayers);
    return this.state().drawingOrder.filter((id) => !eliminated.has(id));
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
