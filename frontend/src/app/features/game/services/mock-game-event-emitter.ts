import { Injectable } from '@angular/core';
import { Observable, Subject, timer } from 'rxjs';

import { GameEvent } from '../models/game-event';
import { RoleAssignment } from '../models/role-assignment';

/**
 * STUB DEV-ONLY — solo se usa cuando GameComponent recibe ?dev=true.
 *
 * Reproduce un guion fijo de eventos para que las 6 sub-vistas se vean
 * funcionar sin necesitar Track H levantado. P3 puede usarlo durante el
 * desarrollo de cada sub-vista; en CI nunca se ejerce.
 *
 * Cuando Track H mergee y emita eventos reales, este servicio sigue siendo
 * útil como herramienta de demo offline — no hay razón para borrarlo.
 */
@Injectable({ providedIn: 'root' })
export class MockGameEventEmitter {
  private readonly events$ = new Subject<GameEvent>();
  private readonly role$ = new Subject<RoleAssignment>();
  private timeouts: ReturnType<typeof setTimeout>[] = [];

  /** Stream de GameEvents (lo consume GameComponent en lugar del Stomp real). */
  asObservable(): Observable<GameEvent> {
    return this.events$.asObservable();
  }

  asRoleObservable(): Observable<RoleAssignment> {
    return this.role$.asObservable();
  }

  /** Asigna rol painter al usuario "yo" (id=42 en el script por defecto). */
  emitPainterAssignment(word = 'guitarra'): void {
    this.role$.next({ type: 'ROLE_ASSIGNMENT', role: 'PAINTER', word });
  }

  /** Asigna rol impostor con la pista. */
  emitImpostorAssignment(hint = 'piano', lives = 1): void {
    this.role$.next({ type: 'ROLE_ASSIGNMENT', role: 'IMPOSTOR', hint, lives });
  }

  /**
   * Reproduce el guion completo de un partido tipo (2 rondas + game over).
   * Cada paso se separa con `delayMs` para que el cambio de fase sea visible.
   */
  playFullGameScript(stepDelayMs = 1500): void {
    this.cancel();
    const drawingOrder = [42, 7, 13];

    const script: { delay: number; ev: GameEvent }[] = [
      { delay: 0, ev: { type: 'GAME_START', drawingOrder, round: 1 } },
      { delay: 1, ev: { type: 'TURN_START', playerId: 42, timeSeconds: 5 } },
      { delay: 2, ev: { type: 'TURN_END', playerId: 42 } },
      { delay: 3, ev: { type: 'TURN_START', playerId: 7, timeSeconds: 5 } },
      { delay: 4, ev: { type: 'TURN_END', playerId: 7 } },
      { delay: 5, ev: { type: 'TURN_START', playerId: 13, timeSeconds: 5 } },
      { delay: 6, ev: { type: 'TURN_END', playerId: 13 } },
      { delay: 7, ev: { type: 'GALLERY_PHASE' } },
      { delay: 8, ev: { type: 'VOTE_PHASE', timeSeconds: 5 } },
      {
        delay: 9,
        ev: {
          type: 'VOTE_RESULT',
          eliminated: 7,
          wasImpostor: false,
          topVoted: [{ id: 7, votes: 2 }],
        },
      },
      { delay: 10, ev: { type: 'NEW_ROUND', round: 2, drawingOrder: [42, 13] } },
      { delay: 11, ev: { type: 'TURN_START', playerId: 42, timeSeconds: 5 } },
      { delay: 12, ev: { type: 'TURN_END', playerId: 42 } },
      { delay: 13, ev: { type: 'TURN_START', playerId: 13, timeSeconds: 5 } },
      { delay: 14, ev: { type: 'TURN_END', playerId: 13 } },
      { delay: 15, ev: { type: 'GALLERY_PHASE' } },
      { delay: 16, ev: { type: 'VOTE_PHASE', timeSeconds: 5 } },
      {
        delay: 17,
        ev: {
          type: 'GAME_OVER',
          winner: 'PAINTERS',
          reason: 'VOTED_OUT',
          impostorId: 13,
          secretWord: 'guitarra',
        },
      },
    ];

    for (const step of script) {
      const t = setTimeout(() => this.events$.next(step.ev), step.delay * stepDelayMs);
      this.timeouts.push(t);
    }
  }

  /** Cancela cualquier guion en curso. Útil al destruir GameComponent. */
  cancel(): void {
    this.timeouts.forEach((t) => clearTimeout(t));
    this.timeouts = [];
  }

  /** Helper test-only para emitir un evento puntual sin temporizadores. */
  emit(event: GameEvent): void {
    this.events$.next(event);
  }
}
