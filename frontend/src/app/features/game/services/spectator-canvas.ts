import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { ClearCanvasBroadcast, DrawBroadcast, StrokeBroadcast } from '../models/game-event';
import { GameStateService } from './game-state';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

/**
 * Mantiene un canvas off-screen por jugador y replays los strokes recibidos
 * vía WebSocket. Expone `snapshots` (signal de Record<playerId, dataUrl>) que
 * `DrawingPhaseView` (modo espectador), `VotingView` y `GalleryView` consumen
 * con `<img [src]="snapshots()[playerId]">`.
 *
 * Decisión arquitectónica: ver track-i-plan.md §4.6 (Opción B).
 *
 * Reset: se subscribe a `gameStateService.gameEvents$` y limpia todos los
 * canvases en `GAME_START` y `NEW_ROUND`.
 *
 * SSR-safe: en el servidor (no browser), todos los métodos son no-op.
 */
@Injectable({ providedIn: 'root' })
export class SpectatorCanvasService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly gameState = inject(GameStateService);

  private readonly canvases = new Map<number, HTMLCanvasElement>();
  private readonly _snapshots = signal<Record<number, string>>({});

  /** Signal readonly de snapshots por jugador. */
  readonly snapshots = this._snapshots.asReadonly();

  constructor() {
    // Reset automático al inicio de partida o ronda nueva.
    this.gameState.gameEvents$.subscribe((ev) => {
      if (ev.type === 'GAME_START' || ev.type === 'NEW_ROUND') {
        this.resetAll();
      }
    });
  }

  /** Replays un stroke en el canvas del jugador y actualiza snapshot. */
  replayStroke(stroke: StrokeBroadcast): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const canvas = this.getOrCreateCanvas(stroke.playerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.points.length === 0) return;
    ctx.beginPath();
    const [first, ...rest] = stroke.points;
    ctx.moveTo(first.x, first.y);
    for (const p of rest) {
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    this.updateSnapshot(stroke.playerId, canvas);
  }

  /** Limpia el canvas del jugador y actualiza snapshot. */
  clearPlayer(playerId: number): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const canvas = this.canvases.get(playerId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.updateSnapshot(playerId, canvas);
  }

  /** Despacha un broadcast (STROKE o CLEAR) al método correspondiente. */
  replayBroadcast(broadcast: DrawBroadcast): void {
    if (broadcast.type === 'STROKE') {
      this.replayStroke(broadcast);
    } else {
      this.clearOnly(broadcast);
    }
  }

  private clearOnly(_clear: ClearCanvasBroadcast): void {
    this.clearPlayer(_clear.playerId);
  }

  /** Resetea todos los canvases (snapshots → {}). */
  private resetAll(): void {
    this.canvases.clear();
    this._snapshots.set({});
  }

  private getOrCreateCanvas(playerId: number): HTMLCanvasElement {
    let canvas = this.canvases.get(playerId);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      this.canvases.set(playerId, canvas);
    }
    return canvas;
  }

  private updateSnapshot(playerId: number, canvas: HTMLCanvasElement): void {
    const dataUrl = canvas.toDataURL('image/png');
    this._snapshots.update((current) => ({ ...current, [playerId]: dataUrl }));
  }
}
