// PLACEHOLDER — P3/P4 reemplazará con TDD (ver docs/track-i-plan.md, sec 2I.5).
// Vista real: jugadores empatados destacados, IMPOSTOR puede mover su voto.

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { JsonPipe } from '@angular/common';

import { GameState } from '../../models/game-state';

@Component({
  selector: 'app-tie-break-view',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './tie-break-view.html',
  styleUrl: './tie-break-view.css',
})
export class TieBreakView {
  @Input({ required: true }) state!: GameState;
  @Output() voteMoved = new EventEmitter<number>();
}
