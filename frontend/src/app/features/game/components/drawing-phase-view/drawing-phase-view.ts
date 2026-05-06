import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { GameState } from '../../models/game-state';
import { DrawCommand } from '../../models/game-event';
import { CanvasComponent } from '../canvas/canvas';
import { CanvasService } from '../../services/canvas';
import { SpectatorCanvasService } from '../../services/spectator-canvas';

/**
 * 2I.2 — Vista de la fase de dibujo.
 *
 * - Si el jugador local es el dibujante actual y es PAINTER → canvas activo (delegado a CanvasComponent).
 * - En otro caso → modo espectador con miniatura del dibujante actual via SpectatorCanvasService.
 *
 * Se subscribe a `CanvasService.getStrokeEmitter()` y reenvía los strokes/clears
 * locales como `drawCommand` SOLO cuando `canDraw()` es true. El container hace
 * `stomp.send('/app/room.{code}.draw', cmd)`.
 *
 * El IMPOSTOR ve además una caja inline de adivinación. Es un fallback hasta
 * que P6 entregue 2I.8 (UI flotante del impostor).
 */
@Component({
  selector: 'app-drawing-phase-view',
  standalone: true,
  imports: [CanvasComponent],
  templateUrl: './drawing-phase-view.html',
  styleUrl: './drawing-phase-view.css',
})
export class DrawingPhaseView implements OnInit, OnDestroy {
  @Input({ required: true }) state!: GameState;
  @Input() myPlayerId: number | null = null;

  /** Comando de dibujo (STROKE o CLEAR) listo para reenviar al servidor. */
  @Output() drawCommand = new EventEmitter<DrawCommand>();
  /** Texto de adivinación enviado por el impostor (fallback hasta 2I.8 de P6). */
  @Output() guessSubmitted = new EventEmitter<string>();

  protected readonly spectator = inject(SpectatorCanvasService);
  private readonly canvasService = inject(CanvasService);
  protected readonly guessText = signal('');

  private readonly destroy$ = new Subject<void>();

  protected readonly isMyTurn = computed(() => {
    return this.myPlayerId !== null && this.state.currentDrawerId === this.myPlayerId;
  });

  protected readonly isImpostor = computed(() => this.state.myRole === 'IMPOSTOR');

  protected readonly canDraw = computed(() => this.isMyTurn() && this.state.myRole === 'PAINTER');

  protected readonly drawerSnapshot = computed(() => {
    const id = this.state.currentDrawerId;
    if (id === null) return null;
    return this.spectator.snapshots()[id] ?? null;
  });

  ngOnInit(): void {
    // Reenvía cada stroke/clear local al servidor, condicional a canDraw().
    // La lectura de canDraw() en el momento del evento (no en init) es
    // intencional: el estado de turno cambia durante la vida del componente.
    this.canvasService
      .getStrokeEmitter()
      .pipe(takeUntil(this.destroy$))
      .subscribe((stroke) => {
        if (!this.canDraw()) return;
        if (stroke.type === 'STROKE') {
          this.drawCommand.emit({
            type: 'STROKE',
            points: stroke.points,
            color: stroke.color,
            thickness: stroke.thickness,
          });
        } else {
          this.drawCommand.emit({ type: 'CLEAR' });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onGuessInput(event: Event): void {
    this.guessText.set((event.target as HTMLInputElement).value);
  }

  protected submitGuess(): void {
    const text = this.guessText().trim();
    if (text.length > 0) {
      this.guessSubmitted.emit(text);
      this.guessText.set('');
    }
  }
}
