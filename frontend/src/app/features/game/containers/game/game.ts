import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { GameStateService } from '../../services/game-state';
import { MockGameEventEmitter } from '../../services/mock-game-event-emitter';
import { SpectatorCanvasService } from '../../services/spectator-canvas';
import { StompClientService } from '../../../realtime/services/stomp-client';
import { DrawingPhaseView } from '../../components/drawing-phase-view/drawing-phase-view';
import { GalleryView } from '../../components/gallery-view/gallery-view';
import { VotingView } from '../../components/voting-view/voting-view';
import { TieBreakView } from '../../components/tie-break-view/tie-break-view';
import { VoteResultView } from '../../components/vote-result-view/vote-result-view';
import { GameOverView } from '../../components/game-over-view/game-over-view';
import { DrawBroadcast, GameEvent, StrokeBroadcast } from '../../models/game-event';
import { RoleAssignment } from '../../models/role-assignment';

const TOKEN_KEY = 'jwt';

/**
 * Container raíz del flujo del juego (Track I, 2I.1).
 *
 * Responsabilidades:
 *  - Conectar al WebSocket con el JWT del usuario (o usar MockGameEventEmitter en modo ?dev=true)
 *  - Suscribirse a /topic/room.{code}.game y /user/queue/private
 *  - Aplicar cada evento al GameStateService
 *  - Renderizar la sub-vista correcta según gameState.phase()
 *  - Slot <ng-content> para que P6 enchufe el ImpostorOverlay (2I.8)
 *
 * No contiene lógica de juego — solo orquestación.
 */
@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    DrawingPhaseView,
    GalleryView,
    VotingView,
    TieBreakView,
    VoteResultView,
    GameOverView,
  ],
  templateUrl: './game.html',
  styleUrl: './game.css',
})
export class GameComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly stomp = inject(StompClientService);
  private readonly mock = inject(MockGameEventEmitter);
  private readonly platformId = inject(PLATFORM_ID);
  readonly gameState = inject(GameStateService);
  // Inyectado para que el servicio se construya y se subscriba a gameEvents$
  // (reset automático en GAME_START / NEW_ROUND). Se pasa via DI a las vistas.
  private readonly spectator = inject(SpectatorCanvasService);

  /** Id del jugador local. PENDING — Track E lo extraerá del JWT decodificado.
   *  En modo dev hardcoded a 42 (coincide con el guion de MockGameEventEmitter). */
  protected myPlayerId: number | null = null;

  /** True si no se conecta a Stomp (sin token y sin ?dev=true). */
  notAuthenticated = false;

  /** True si estamos usando el emitter mock (modo dev). */
  devMode = false;

  private readonly destroy$ = new Subject<void>();
  private connectedToStomp = false;

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.devMode = this.route.snapshot.queryParamMap.get('dev') === 'true';

    if (this.devMode) {
      this.myPlayerId = 42;
      this.wireMockEmitter();
      // Aviso visual inicial para el demo.
      queueMicrotask(() => this.mock.emitPainterAssignment('guitarra'));
      queueMicrotask(() => this.mock.playFullGameScript());
      return;
    }

    const token = this.readStoredToken();
    if (!token) {
      this.notAuthenticated = true;
      return;
    }

    this.connectStomp(code, token);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.mock.cancel();
    if (this.connectedToStomp) {
      this.stomp.disconnect();
    }
    this.gameState.reset();
  }

  // ── Wiring ───────────────────────────────────────────────────────────────

  private wireMockEmitter(): void {
    this.mock
      .asObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe((ev: GameEvent) => this.gameState.applyEvent(ev));
    this.mock
      .asRoleObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe((role: RoleAssignment) => this.gameState.applyRoleAssignment(role));
  }

  private connectStomp(code: string, token: string): void {
    this.stomp.connect({ url: '/ws', jwt: token });
    this.connectedToStomp = true;

    this.stomp
      .subscribe<GameEvent>(`/topic/room.${code}.game`)
      .pipe(takeUntil(this.destroy$))
      .subscribe((ev) => this.gameState.applyEvent(ev));

    this.stomp
      .subscribe<DrawBroadcast>(`/topic/room.${code}.draw`)
      .pipe(takeUntil(this.destroy$))
      .subscribe((broadcast) => this.spectator.replayBroadcast(broadcast));

    this.stomp
      .subscribe<RoleAssignment>('/user/queue/private')
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => {
        if (msg.type === 'ROLE_ASSIGNMENT') {
          this.gameState.applyRoleAssignment(msg);
        }
        // GuessResult del impostor: lo deja al GameStateService como mejora futura.
      });
  }

  /** Reenvía un stroke local al servidor. Invocado por DrawingPhaseView. */
  protected sendStroke(stroke: Omit<StrokeBroadcast, 'playerId' | 'type'>): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.stomp.send(`/app/room.${code}.draw`, { type: 'STROKE', ...stroke });
  }

  /** Envía el voto al servidor. Invocado por VotingView. */
  protected sendVote(votedPlayerId: number): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.stomp.send(`/app/room.${code}.vote`, { votedPlayerId });
  }

  /** Envía un intento de adivinación. Invocado por DrawingPhaseView (fallback impostor). */
  protected sendGuess(guess: string): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.stomp.send(`/app/room.${code}.guess`, { guess });
  }

  /** Botón "jugar otra vez" en GameOverView. PENDING — Track F definirá el flujo. */
  protected onPlayAgain(): void {
    // Por ahora simplemente recarga la página/sala — Track F decidirá si vuelve al lobby
    // o si crea una sala nueva. Marcado para revisar.
  }

  // PENDING — Track E (Auth) reemplazará con AuthService.getToken().
  private readStoredToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
}
