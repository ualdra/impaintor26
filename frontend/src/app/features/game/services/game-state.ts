import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';

import { GameEvent } from '../models/game-event';
import { RoleAssignment } from '../models/role-assignment';
import { GameState, INITIAL_STATE, Phase } from '../models/game-state';

/**
 * Store con signals que centraliza el estado del juego en el cliente.
 * Único source of truth para todas las sub-vistas (DrawingPhaseView, etc).
 *
 * Las mutaciones solo ocurren vía applyEvent / applyRoleAssignment / reset.
 * gameEvents$ se expone como Subject para que P6 (SFX) pueda enchufar
 * efectos de audio sin acoplarse a la implementación de las vistas.
 */
@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly _state = signal<GameState>(structuredClone(INITIAL_STATE));

  /** Signal readonly del estado completo. */
  readonly state = this._state.asReadonly();

  /** Stream de eventos aplicados (para SFX, debugging, P6). */
  readonly gameEvents$ = new Subject<GameEvent>();

  // ── Selectores ───────────────────────────────────────────────────────────

  readonly phase = computed<Phase>(() => this._state().phase);
  readonly isImpostor = computed<boolean>(() => this._state().myRole === 'IMPOSTOR');
  readonly hint = computed<string | null>(() => this._state().hint);
  readonly impostorLives = computed<number | null>(() => this._state().impostorLives);
  readonly secretWord = computed<string | null>(() => this._state().secretWord);

  /** True si el id pasado es el dibujante actual. */
  isMyTurn(myId: number): boolean {
    return this._state().currentDrawerId === myId;
  }

  // ── Mutaciones ───────────────────────────────────────────────────────────

  applyEvent(event: GameEvent): void {
    this._state.update((s) => this.reduce(s, event));
    this.gameEvents$.next(event);
  }

  applyRoleAssignment(role: RoleAssignment): void {
    this._state.update((s) =>
      role.role === 'PAINTER'
        ? { ...s, myRole: 'PAINTER', secretWord: role.word, hint: null, impostorLives: null }
        : { ...s, myRole: 'IMPOSTOR', hint: role.hint, impostorLives: role.lives, secretWord: null },
    );
  }

  reset(): void {
    this._state.set(structuredClone(INITIAL_STATE));
  }

  // ── Reducer ──────────────────────────────────────────────────────────────

  private reduce(s: GameState, e: GameEvent): GameState {
    switch (e.type) {
      case 'GAME_START':
        return { ...s, phase: 'DRAWING', round: e.round, drawingOrder: e.drawingOrder };
      case 'TURN_START':
        return { ...s, currentDrawerId: e.playerId, timeRemainingSec: e.timeSeconds };
      case 'TURN_END':
        return { ...s, currentDrawerId: null };
      case 'GALLERY_PHASE':
        return { ...s, phase: 'GALLERY' };
      case 'VOTE_PHASE':
        return { ...s, phase: 'VOTING', timeRemainingSec: e.timeSeconds };
      case 'VOTE_RESULT':
        return {
          ...s,
          phase: 'RESULT',
          eliminated: e.eliminated,
          wasImpostorEliminated: e.wasImpostor,
          topVoted: e.topVoted,
        };
      case 'VOTE_TIE':
        return { ...s, phase: 'TIE_BREAK', tiedPlayers: e.tiedPlayers, timeRemainingSec: e.timeSeconds };
      case 'GUESS_ATTEMPT':
        // Solo actualizamos las vidas si el jugador es impostor (los demás reciben el evento por broadcast pero no afecta su estado interno).
        return s.myRole === 'IMPOSTOR' ? { ...s, impostorLives: e.livesRemaining } : s;
      case 'NEW_ROUND':
        return {
          ...s,
          phase: 'DRAWING',
          round: e.round,
          drawingOrder: e.drawingOrder,
          currentDrawerId: null,
          eliminated: null,
          wasImpostorEliminated: null,
          topVoted: [],
          tiedPlayers: [],
        };
      case 'GAME_OVER':
        return {
          ...s,
          phase: 'OVER',
          gameOver: {
            winner: e.winner,
            reason: e.reason,
            impostorId: e.impostorId,
            secretWord: e.secretWord,
          },
        };
      default: {
        // Exhaustiveness check — el compilador grita si añadimos un GameEvent nuevo y olvidamos su case.
        const _exhaustive: never = e;
        return s;
      }
    }
  }
}
