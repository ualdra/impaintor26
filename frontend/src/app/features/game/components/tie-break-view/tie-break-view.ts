import { Component, EventEmitter, Output, computed, inject, input, signal } from '@angular/core';

import { GameState } from '../../models/game-state';
import { SpectatorCanvasService } from '../../services/spectator-canvas';

/**
 * 2I.5 — Vista de desempate.
 *
 * Muestra los jugadores empatados con sus dibujos. El impostor recibe un
 * voto extra que puede depositar en cualquiera de los jugadores empatados
 * para romper el empate. Su voto original permanece inalterado, por lo que
 * siempre puede resolver el empate sin delatarse a sí mismo.
 */
@Component({
  selector: 'app-tie-break-view',
  standalone: true,
  imports: [],
  templateUrl: './tie-break-view.html',
  styleUrl: './tie-break-view.css',
})
export class TieBreakView {
  readonly state = input.required<GameState>();
  readonly myPlayerId = input<number | null>(null);

  @Output() voteMoved = new EventEmitter<number>();

  protected readonly spectator = inject(SpectatorCanvasService);
  protected readonly myMove = signal<number | null>(null);

  protected readonly isImpostor = computed(() => this.state().myRole === 'IMPOSTOR');

  protected snapshotFor(playerId: number): string | null {
    return this.spectator.snapshots()[playerId] ?? null;
  }

  protected onCardClick(playerId: number): void {
    if (!this.isImpostor()) return;
    if (this.myMove() !== null) return;
    this.myMove.set(playerId);
    this.voteMoved.emit(playerId);
  }
}
