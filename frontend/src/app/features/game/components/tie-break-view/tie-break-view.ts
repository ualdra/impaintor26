import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { GameState } from '../../models/game-state';

/**
 * 2I.5 — Vista de desempate.
 *
 * Muestra los jugadores empatados. El impostor puede mover su voto a uno
 * de ellos para romper el empate; los demás ven un estado pasivo de espera.
 */
@Component({
  selector: 'app-tie-break-view',
  standalone: true,
  imports: [],
  templateUrl: './tie-break-view.html',
  styleUrl: './tie-break-view.css',
})
export class TieBreakView {
  @Input({ required: true }) state!: GameState;
  @Input() myPlayerId: number | null = null;

  @Output() voteMoved = new EventEmitter<number>();

  protected readonly myMove = signal<number | null>(null);

  protected readonly isImpostor = computed(() => this.state.myRole === 'IMPOSTOR');

  protected onCardClick(playerId: number): void {
    if (!this.isImpostor()) return;
    if (this.myMove() !== null) return;
    this.myMove.set(playerId);
    this.voteMoved.emit(playerId);
  }
}
