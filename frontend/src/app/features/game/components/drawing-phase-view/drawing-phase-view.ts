// PLACEHOLDER — P3/P4 reemplazará con TDD (ver docs/track-i-plan.md, sec 2I.2).
// Ahora solo muestra el estado serializado para que el container y el flujo
// sean visibles en el demo `?dev=true`. Cuando se implemente la vista real:
//   - Renderizar <app-canvas [isActive]="isMyTurn" [showWord]="state.secretWord">
//   - Mostrar la palabra para PAINTER, hint para IMPOSTOR
//   - Barra de temporizador
//   - Slot para 2I.8 (impostor overlay, P6)

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { JsonPipe } from '@angular/common';

import { GameState } from '../../models/game-state';
import { StrokeBroadcast } from '../../models/game-event';

@Component({
  selector: 'app-drawing-phase-view',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './drawing-phase-view.html',
  styleUrl: './drawing-phase-view.css',
})
export class DrawingPhaseView {
  @Input({ required: true }) state!: GameState;
  @Input() myPlayerId: number | null = null;

  /** Emite cada trazo capturado por el canvas para reenvío vía WebSocket. */
  @Output() strokeEmitted = new EventEmitter<Omit<StrokeBroadcast, 'playerId' | 'type'>>();
}
