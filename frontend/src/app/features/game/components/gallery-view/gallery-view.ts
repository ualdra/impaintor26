// PLACEHOLDER — P3/P4 reemplazará con TDD (ver docs/track-i-plan.md, sec 2I.3).
// Vista real: cuadrícula de N canvas snapshots de los jugadores de la ronda.

import { Component, Input } from '@angular/core';
import { JsonPipe } from '@angular/common';

import { GameState } from '../../models/game-state';

@Component({
  selector: 'app-gallery-view',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './gallery-view.html',
  styleUrl: './gallery-view.css',
})
export class GalleryView {
  @Input({ required: true }) state!: GameState;
}
