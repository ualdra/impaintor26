import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SpectatorCanvasService } from './spectator-canvas';
import { GameStateService } from './game-state';
import { StrokeBroadcast, ClearCanvasBroadcast } from '../models/game-event';

/**
 * jsdom no implementa Canvas API completa. Mockeamos `getContext` para que devuelva
 * un objeto stub con los métodos que usa el servicio. `toDataURL` se mockea con
 * un valor determinista para verificar el flujo.
 */
function mockCanvasApi() {
  const ctxStub = {
    fillStyle: '',
    strokeStyle: '',
    lineCap: '',
    lineJoin: '',
    lineWidth: 0,
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxStub as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,FAKE');
  return ctxStub;
}

describe('SpectatorCanvasService', () => {
  let svc: SpectatorCanvasService;
  let gameState: GameStateService;
  let ctxStub: ReturnType<typeof mockCanvasApi>;

  beforeEach(() => {
    ctxStub = mockCanvasApi();
    TestBed.configureTestingModule({});
    gameState = TestBed.inject(GameStateService);
    svc = TestBed.inject(SpectatorCanvasService);
  });

  it('snapshots inicia vacío', () => {
    expect(svc.snapshots()).toEqual({});
  });

  it('replayStroke crea canvas off-screen y actualiza snapshots con dataUrl', () => {
    const stroke: StrokeBroadcast = {
      type: 'STROKE',
      playerId: 42,
      points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
      color: '#FF0000',
      thickness: 3,
    };

    svc.replayStroke(stroke);

    expect(svc.snapshots()[42]).toBe('data:image/png;base64,FAKE');
    expect(ctxStub.beginPath).toHaveBeenCalled();
    expect(ctxStub.moveTo).toHaveBeenCalledWith(10, 10);
    expect(ctxStub.lineTo).toHaveBeenCalledWith(20, 20);
    expect(ctxStub.stroke).toHaveBeenCalled();
  });

  it('múltiples strokes del mismo jugador acumulan en el mismo canvas', () => {
    svc.replayStroke({ type: 'STROKE', playerId: 7, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000', thickness: 1 });
    const firstSnapshot = svc.snapshots()[7];
    svc.replayStroke({ type: 'STROKE', playerId: 7, points: [{ x: 2, y: 2 }, { x: 3, y: 3 }], color: '#000', thickness: 1 });

    expect(svc.snapshots()[7]).toBeTruthy();
    // Mismo dataUrl mockeado, pero se invocó stroke dos veces (un canvas por jugador).
    expect(ctxStub.stroke).toHaveBeenCalledTimes(2);
    expect(firstSnapshot).toBe(svc.snapshots()[7]); // mismo mock determinista
  });

  it('strokes de jugadores distintos generan entradas distintas en snapshots', () => {
    svc.replayStroke({ type: 'STROKE', playerId: 1, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000', thickness: 1 });
    svc.replayStroke({ type: 'STROKE', playerId: 2, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000', thickness: 1 });

    expect(Object.keys(svc.snapshots())).toHaveLength(2);
    expect(svc.snapshots()[1]).toBeTruthy();
    expect(svc.snapshots()[2]).toBeTruthy();
  });

  it('clearPlayer borra el canvas del jugador y actualiza snapshot', () => {
    svc.replayStroke({ type: 'STROKE', playerId: 42, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000', thickness: 1 });
    expect(svc.snapshots()[42]).toBeTruthy();

    svc.clearPlayer(42);

    expect(ctxStub.clearRect).toHaveBeenCalled();
    // Después del clear el snapshot se actualiza al canvas vacío (mock devuelve mismo dataUrl).
    expect(svc.snapshots()[42]).toBe('data:image/png;base64,FAKE');
  });

  it('GAME_START resetea todos los snapshots', () => {
    svc.replayStroke({ type: 'STROKE', playerId: 1, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000', thickness: 1 });
    svc.replayStroke({ type: 'STROKE', playerId: 2, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000', thickness: 1 });
    expect(Object.keys(svc.snapshots())).toHaveLength(2);

    gameState.applyEvent({ type: 'GAME_START', drawingOrder: [1, 2], round: 1 });

    expect(svc.snapshots()).toEqual({});
  });

  it('NEW_ROUND resetea todos los snapshots', () => {
    svc.replayStroke({ type: 'STROKE', playerId: 1, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000', thickness: 1 });

    gameState.applyEvent({ type: 'NEW_ROUND', round: 2, drawingOrder: [1, 3] });

    expect(svc.snapshots()).toEqual({});
  });

  it('replayClear emite ClearCanvasBroadcast llamando a clearPlayer', () => {
    svc.replayStroke({ type: 'STROKE', playerId: 42, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000', thickness: 1 });
    const clear: ClearCanvasBroadcast = { type: 'CLEAR', playerId: 42 };

    svc.replayBroadcast(clear);

    expect(ctxStub.clearRect).toHaveBeenCalled();
  });

  it('replayBroadcast despacha STROKE y CLEAR según type', () => {
    const stroke: StrokeBroadcast = { type: 'STROKE', playerId: 1, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000', thickness: 1 };
    const clear: ClearCanvasBroadcast = { type: 'CLEAR', playerId: 1 };

    svc.replayBroadcast(stroke);
    expect(ctxStub.stroke).toHaveBeenCalled();

    svc.replayBroadcast(clear);
    expect(ctxStub.clearRect).toHaveBeenCalled();
  });
});
