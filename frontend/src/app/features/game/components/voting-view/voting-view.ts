// PLACEHOLDER — P3/P4 reemplazará con TDD (ver docs/track-i-plan.md, sec 2I.4).
// Vista real: tarjetas de jugadores con miniatura de canvas, votación simultánea.

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { JsonPipe } from '@angular/common';

import { GameState } from '../../models/game-state';

@Component({
  selector: 'app-voting-view',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './voting-view.html',
  styleUrl: './voting-view.css',
})
export class VotingView {
  @Input({ required: true }) state!: GameState;
  @Output() voteCast = new EventEmitter<number>();
}
