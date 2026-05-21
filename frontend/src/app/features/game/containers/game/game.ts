import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { GameStateService } from '../../services/game-state';
import { MockGameEventEmitter } from '../../services/mock-game-event-emitter';
import { SpectatorCanvasService } from '../../services/spectator-canvas';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DrawingPhaseView } from '../../components/drawing-phase-view/drawing-phase-view';
import { GalleryView } from '../../components/gallery-view/gallery-view';
import { VotingView } from '../../components/voting-view/voting-view';
import { TieBreakView } from '../../components/tie-break-view/tie-break-view';
import { VoteResultView } from '../../components/vote-result-view/vote-result-view';
import { GameOverView } from '../../components/game-over-view/game-over-view';
import { DrawBroadcast, DrawCommand, GameEvent } from '../../models/game-event';
import { RoleAssignment } from '../../models/role-assignment';

/**
 * Container raíz del flujo del juego (Track I, 2I.1).
 *
 * Responsabilidades:
 *  - Conectar al WebSocket con el JWT del usuario (o usar MockGameEventEmitter en modo ?dev=true)
 *  - Suscribirse a /topic/room.{code}.game, /topic/room.{code}.draw y /user/queue/private
 *  - Aplicar cada evento al GameStateService / SpectatorCanvasService
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
  private readonly router = inject(Router);
  private readonly ws = inject(WebSocketService);
  private readonly authService = inject(AuthService);
  private readonly mock = inject(MockGameEventEmitter);
  readonly gameState = inject(GameStateService);
  // Inyectado para que el servicio se construya y se subscriba a gameEvents$
  // (reset automático en GAME_START / NEW_ROUND). Se pasa via DI a las vistas.
  private readonly spectator = inject(SpectatorCanvasService);

  /** Id del jugador local. PENDING — Track E lo extraerá del JWT decodificado.
   *  En modo dev hardcoded a 42 (coincide con el guion de MockGameEventEmitter). */
  protected myPlayerId: number | null = null;

  /** True si no se conecta a WebSocket (sin token y sin ?dev=true). */
  notAuthenticated = false;

  /** True si estamos usando el emitter mock (modo dev). */
  devMode = false;

  private readonly destroy$ = new Subject<void>();
  private connectedToWs = false;

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

    const token = this.authService.getToken();
    if (!token) {
      this.notAuthenticated = true;
      return;
    }

    this.connectWebSocket(code, token);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.mock.cancel();
    if (this.connectedToWs) {
      this.ws.disconnect();
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

  private connectWebSocket(code: string, token: string): void {
    this.ws.connect({ url: '/ws', jwt: token });
    this.connectedToWs = true;

    this.ws
      .subscribe<GameEvent>(`/topic/room.${code}.game`)
      .pipe(takeUntil(this.destroy$))
      .subscribe((ev) => this.gameState.applyEvent(ev));

    this.ws
      .subscribe<DrawBroadcast>(`/topic/room.${code}.draw`)
      .pipe(takeUntil(this.destroy$))
      .subscribe((broadcast) => this.spectator.replayBroadcast(broadcast));

    this.ws
      .subscribe<RoleAssignment>('/user/queue/private')
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => {
        if (msg.type === 'ROLE_ASSIGNMENT') {
          this.gameState.applyRoleAssignment(msg);
        }
        // GuessResult del impostor: lo deja al GameStateService como mejora futura.
      });
  }

  /**
   * Reenvía un comando de dibujo (STROKE o CLEAR) al servidor.
   * Invocado por DrawingPhaseView cuando el jugador local está dibujando.
   * El servidor añade el `playerId` desde el Principal autenticado.
   */
  protected sendDraw(cmd: DrawCommand): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.ws.send(`/app/room.${code}.draw`, cmd);
  }

  /** Envía el voto al servidor. Invocado por VotingView. */
  protected sendVote(votedPlayerId: number): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.ws.send(`/app/room.${code}.vote`, { votedPlayerId });
  }

  /** Envía el desempate del impostor al servidor. Invocado por TieBreakView.
   *  TODO: confirmar path STOMP con Track H. */
  protected sendVoteMove(votedPlayerId: number): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.ws.send(`/app/room.${code}.vote-move`, { votedPlayerId });
  }

  /** Envía un intento de adivinación. Invocado por DrawingPhaseView (fallback impostor). */
  protected sendGuess(guess: string): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.ws.send(`/app/room.${code}.guess`, { guess });
  }

  /**
   * Botón "jugar otra vez" en GameOverView. PENDING — Track F definirá el flujo
   * definitivo (volver al lobby, crear nueva sala, etc.). Mientras tanto navego
   * al home `/` para no dejar el botón sin efecto.
   */
  protected onPlayAgain(): void {
    this.router.navigate(['/']);
  }
}
