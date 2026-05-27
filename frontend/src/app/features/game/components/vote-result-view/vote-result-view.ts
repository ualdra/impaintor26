import { Component, Input } from '@angular/core';

import { GameState } from '../../models/game-state';

/**
 * 2I.6 — Resultado de votación.
 *
 * Revela quién fue eliminado (o que nadie lo fue en ronda 1), si era el
 * impostor, y la lista semi-anónima de jugadores más votados.
 */
@Component({
  selector: 'app-vote-result-view',
  standalone: true,
  imports: [],
  templateUrl: './vote-result-view.html',
  styleUrl: './vote-result-view.css',
})
export class VoteResultView {
  @Input({ required: true }) state!: GameState;
  @Input() playerNames: Record<number, string> = {};
}
