import { Component, Input, computed, inject } from '@angular/core';

import { GameState } from '../../models/game-state';
import { SpectatorCanvasService } from '../../services/spectator-canvas';

/**
 * 2I.3 — Galería de dibujos de la ronda.
 *
 * Cuadrícula de snapshots de canvas tomados de SpectatorCanvasService.
 * Excluye al jugador eliminado si lo hay. Muestra un temporizador
 * hasta que comience la votación.
 */
@Component({
  selector: 'app-gallery-view',
  standalone: true,
  imports: [],
  templateUrl: './gallery-view.html',
  styleUrl: './gallery-view.css',
})
export class GalleryView {
  @Input({ required: true }) state!: GameState;

  protected readonly spectator = inject(SpectatorCanvasService);

  protected readonly drawers = computed(() =>
    this.state.drawingOrder.filter((id) => id !== this.state.eliminated),
  );

  protected snapshotFor(playerId: number): string | null {
    return this.spectator.snapshots()[playerId] ?? null;
  }
}
