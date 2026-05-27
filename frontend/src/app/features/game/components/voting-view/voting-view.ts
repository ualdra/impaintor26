import { Component, EventEmitter, OnDestroy, OnInit, Output, computed, inject, input, signal } from '@angular/core';

import { GameState } from '../../models/game-state';
import { SpectatorCanvasService } from '../../services/spectator-canvas';

/**
 * 2I.4 — Vista de votación.
 *
 * Tarjetas de jugadores vivos con miniatura del dibujo. El jugador puede
 * cambiar su selección libremente hasta que el temporizador llegue a
 * LOCK_SECONDS, momento en el que la selección se envía automáticamente
 * como voto definitivo y las tarjetas se bloquean.
 *
 * El bloqueo se basa en un setTimeout dispuesto en ngOnInit con el tiempo
 * inicial del servidor (state().timeRemainingSec), ya que ese valor no se
 * actualiza segundo a segundo en el cliente.
 */
@Component({
  selector: 'app-voting-view',
  standalone: true,
  imports: [],
  templateUrl: './voting-view.html',
  styleUrl: './voting-view.css',
})
export class VotingView implements OnInit, OnDestroy {
  private static readonly LOCK_SECONDS = 3;

  readonly state = input.required<GameState>();
  readonly myPlayerId = input<number | null>(null);
  readonly playerNames = input<Record<number, string>>({});

  @Output() voteCast = new EventEmitter<number>();

  protected readonly spectator = inject(SpectatorCanvasService);

  /** Tarjeta actualmente seleccionada (cambiable hasta el bloqueo). */
  protected readonly mySelection = signal<number | null>(null);
  /** True después de que el voto se envía automáticamente al servidor. */
  protected readonly voteLocked = signal(false);

  private lockTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const totalSeconds = this.state().timeRemainingSec;
    const delayMs = Math.max(0, (totalSeconds - VotingView.LOCK_SECONDS) * 1000);
    this.lockTimer = setTimeout(() => this.lockVote(), delayMs);
  }

  ngOnDestroy(): void {
    clearTimeout(this.lockTimer);
  }

  protected readonly isLocalPlayerEliminated = computed(() => {
    const id = this.myPlayerId();
    return id != null && this.state().eliminatedPlayers.includes(id);
  });

  protected readonly votablePlayers = computed(() => {
    const eliminated = new Set(this.state().eliminatedPlayers);
    return this.state().drawingOrder.filter((id) => !eliminated.has(id));
  });

  protected snapshotFor(playerId: number): string | null {
    return this.spectator.snapshots()[playerId] ?? null;
  }

  protected onVote(playerId: number): void {
    if (this.voteLocked()) return;
    this.mySelection.set(playerId);
  }

  private lockVote(): void {
    if (this.voteLocked()) return;
    this.voteLocked.set(true);
    const selection = this.mySelection();
    if (selection !== null) {
      this.voteCast.emit(selection);
    }
  }
}
