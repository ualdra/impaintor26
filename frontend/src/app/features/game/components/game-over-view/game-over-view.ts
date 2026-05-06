// PLACEHOLDER — P3/P4 reemplazará con TDD (ver docs/track-i-plan.md, sec 2I.7).
// Vista real: anuncio del ganador, palabra secreta revelada, botón "jugar otra vez".

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { JsonPipe } from '@angular/common';

import { GameState } from '../../models/game-state';

@Component({
  selector: 'app-game-over-view',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './game-over-view.html',
  styleUrl: './game-over-view.css',
})
export class GameOverView {
  @Input({ required: true }) state!: GameState;
  @Output() playAgain = new EventEmitter<void>();
}
