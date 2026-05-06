// PLACEHOLDER — P3/P4 reemplazará con TDD (ver docs/track-i-plan.md, sec 2I.6).
// Vista real: revela quién fue eliminado y si era el impostor.

import { Component, Input } from '@angular/core';
import { JsonPipe } from '@angular/common';

import { GameState } from '../../models/game-state';

@Component({
  selector: 'app-vote-result-view',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './vote-result-view.html',
  styleUrl: './vote-result-view.css',
})
export class VoteResultView {
  @Input({ required: true }) state!: GameState;
}
