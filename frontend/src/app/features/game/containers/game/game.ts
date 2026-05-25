import { Component, OnDestroy, OnInit, ViewChild, computed, effect, inject } from '@angular/core';
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
import { ImpostorOverlay } from '../../components/impostor-overlay/impostor-overlay';
import { DrawBroadcast, DrawCommand, GameEvent } from '../../models/game-event';
import { PrivateMessage, RoleAssignment } from '../../models/role-assignment';
import { AudioService } from '../../../../core/services/audio.service';

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
    ImpostorOverlay,
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
  private readonly spectator = inject(SpectatorCanvasService);
  private readonly audioService = inject(AudioService);

  constructor() {
    // Escucha cambios en la fase del juego para actualizar la música
    effect(() => {
      const phase = this.gameState.phase();
      const state = this.gameState.state();

      switch (phase) {
        case 'DRAWING':
          this.audioService.playTrack('draw_phase');
          break;
        case 'GALLERY':
          this.audioService.playTrack('gallery');
          break;
        case 'VOTING':
          this.audioService.playTrack('voting_phase');
          break;
        case 'TIE_BREAK':
          this.audioService.playTrack('tie_break');
          break;
        case 'OVER':
          if (state.gameOver?.winner === 'IMPOSTOR') {
            this.audioService.playTrack('impostor_wins');
          } else if (state.gameOver?.winner === 'PAINTERS') {
            this.audioService.playTrack('painters_win');
          }
          break;
        case 'CONNECTING':
        case 'RESULT':
          // En RESULT mostramos los votos. Podríamos dejar la de votación sonando o silenciar.
          // Por defecto la dejamos como estaba.
          break;
      }
    });
  }

  /** Referencia al overlay del impostor para disparar la animación de shake. */
  @ViewChild(ImpostorOverlay) private impostorOverlay?: ImpostorOverlay;

  /** Id del jugador local. PENDING — Track E lo extraerá del JWT decodificado.
   *  En modo dev hardcoded a 42 (coincide con el guion de MockGameEventEmitter). */
  protected myPlayerId: number | null = null;

  /** Voto emitido por este jugador en la fase de votación actual. Se pasa al
   *  TieBreakView para que el impostor vea qué carta ya votó. */
  protected myVotedPlayerId: number | null = null;

  /** True si no se conecta a WebSocket (sin token y sin ?dev=true). */
  notAuthenticated = false;

  /** True si estamos usando el emitter mock (modo dev). */
  devMode = false;

  private readonly destroy$ = new Subject<void>();
  private connectedToWs = false;

  /**
   * True si el overlay del impostor debe estar visible.
   * Fases activas: DRAWING, GALLERY, VOTING, TIE_BREAK.
   * Se calcula aquí (en el padre) para pasar como @Input simple al overlay,
   * evitando problemas de hydration SSR cuando el signal muta después del pre-render.
   */
  protected readonly isOverlayVisible = computed(() => {
    const phase = this.gameState.phase();
    return (
      this.gameState.isImpostor() &&
      (phase === 'DRAWING' || phase === 'GALLERY' || phase === 'VOTING' || phase === 'TIE_BREAK')
    );
  });

  protected readonly isLocalPlayerEliminated = computed(() => {
    const id = this.myPlayerId;
    return id != null && this.gameState.state().eliminatedPlayers.includes(id);
  });

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.devMode = this.route.snapshot.queryParamMap.get('dev') === 'true';

    if (this.devMode) {
      this.myPlayerId = 42;
      this.wireMockEmitter();
      // ?role=impostor → demo del ImpostorOverlay (2I.8). Default: painter.
      const role = this.route.snapshot.queryParamMap.get('role');
      if (role === 'impostor') {
        queueMicrotask(() => this.mock.emitImpostorAssignment('piano', 2));
        queueMicrotask(() => this.mock.playImpostorGameScript());
      } else {
        queueMicrotask(() => this.mock.emitPainterAssignment('guitarra'));
        queueMicrotask(() => this.mock.playFullGameScript());
      }
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.notAuthenticated = true;
      return;
    }

    const user = this.authService.getCurrentUser();
    if (user) this.myPlayerId = user.id;

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
      .subscribe((ev: GameEvent) => {
        this.gameState.applyEvent(ev);
        // Shake feedback cuando el impostor falla un intento.
        if (ev.type === 'GUESS_ATTEMPT' && !ev.correct) {
          this.impostorOverlay?.triggerShake();
          this.audioService.playEffect('fail_sound', 5000); // Suena 5 segundos
        }
      });
    this.mock
      .asRoleObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe((role: RoleAssignment) => this.gameState.applyRoleAssignment(role));
  }

  private connectWebSocket(code: string, token: string): void {
    console.log('[Game] connectWebSocket — WS status before connect:', this.ws.currentStatus);
    this.ws.connect({ url: '/ws', jwt: token });
    this.connectedToWs = true;
    console.log('[Game] connectWebSocket — WS status after connect():', this.ws.currentStatus);

    this.ws
      .subscribe<GameEvent>(`/topic/room.${code}.game`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ev) => {
          console.log('[Game] game event received:', (ev as GameEvent & { type: string }).type, ev);
          this.gameState.applyEvent(ev);
          if (ev.type === 'GUESS_ATTEMPT' && !ev.correct) {
            this.impostorOverlay?.triggerShake();
            this.audioService.playEffect('fail_sound', 5000);
          }
        },
        error: (err) => console.error('[Game] game topic error:', err),
      });

    this.ws
      .subscribe<DrawBroadcast>(`/topic/room.${code}.draw`)
      .pipe(takeUntil(this.destroy$))
      .subscribe((broadcast) => this.spectator.replayBroadcast(broadcast));

    this.ws
      .subscribe<PrivateMessage>('/user/queue/private')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (msg) => {
          console.log('[Game] private message received:', msg.type, msg);
          if (msg.type === 'ROLE_ASSIGNMENT') {
            this.gameState.applyRoleAssignment(msg as RoleAssignment);
          } else if (msg.type === 'ELO_UPDATE') {
            this.gameState.applyEloUpdate(msg.eloChange);
          }
        },
        error: (err) => console.error('[Game] private queue error:', err),
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
    this.myVotedPlayerId = votedPlayerId;
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

  protected onPlayAgain(): void {
    this.ws.disconnect();
    this.router.navigate(['/main_menu']);
  }
}
