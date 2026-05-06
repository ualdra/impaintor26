import { Component, EventEmitter, Input, Output } from '@angular/core';

import { GameState } from '../../models/game-state';
import { EndReason } from '../../models/game-event';

const REASON_TEXT: Record<EndReason, string> = {
  VOTED_OUT: 'El impostor fue expulsado por votación.',
  WORD_GUESSED: 'El impostor adivinó la palabra secreta.',
  OUT_OF_LIVES: 'El impostor agotó sus vidas adivinando.',
  TIE_NOT_BROKEN: 'Hubo un empate y el impostor no movió su voto a tiempo.',
  LAST_STANDING: 'Solo quedaba un pintor — el impostor sobrevivió hasta el último.',
};

/**
 * 2I.7 — Vista de fin de partida.
 *
 * Anuncia ganador, revela palabra secreta, pista, identidad del impostor y
 * número de rondas. Botón "jugar otra vez" emite playAgain.
 */
@Component({
  selector: 'app-game-over-view',
  standalone: true,
  imports: [],
  templateUrl: './game-over-view.html',
  styleUrl: './game-over-view.css',
})
export class GameOverView {
  @Input({ required: true }) state!: GameState;
  @Output() playAgain = new EventEmitter<void>();

  protected reasonText(reason: EndReason): string {
    return REASON_TEXT[reason];
  }
}
