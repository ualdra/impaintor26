import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DrawingPhaseView } from './drawing-phase-view';
import { GameState, INITIAL_STATE } from '../../models/game-state';
import { SpectatorCanvasService } from '../../services/spectator-canvas';

// Stub mínimo del CanvasService para que el CanvasComponent no rompa al inicializar.
// El servicio existe en features/game/services/canvas.ts y CanvasComponent lo inyecta.

function stateForPainter(currentDrawerId: number | null = null): GameState {
  return {
    ...INITIAL_STATE,
    phase: 'DRAWING',
    round: 1,
    drawingOrder: [42, 7],
    currentDrawerId,
    timeRemainingSec: 30,
    myRole: 'PAINTER',
    secretWord: 'guitarra',
  };
}

function stateForImpostor(currentDrawerId: number | null = null): GameState {
  return {
    ...INITIAL_STATE,
    phase: 'DRAWING',
    round: 1,
    drawingOrder: [42, 7],
    currentDrawerId,
    timeRemainingSec: 30,
    myRole: 'IMPOSTOR',
    hint: 'piano',
    impostorLives: 1,
  };
}

describe('DrawingPhaseView', () => {
  beforeEach(() => {
    // Mock de Canvas API para que CanvasComponent (importado por DrawingPhaseView
    // cuando es mi turno) no rompa en jsdom.
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
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctxStub as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,FAKE');

    TestBed.configureTestingModule({
      imports: [DrawingPhaseView],
      providers: [
        // Stub del SpectatorCanvasService para no depender de Canvas API en jsdom.
        {
          provide: SpectatorCanvasService,
          useValue: {
            snapshots: () => ({}),
            replayStroke: vi.fn(),
            clearPlayer: vi.fn(),
            replayBroadcast: vi.fn(),
          },
        },
      ],
    });
  });

  it('PAINTER ve la palabra secreta', () => {
    const fixture = TestBed.createComponent(DrawingPhaseView);
    fixture.componentRef.setInput('state', stateForPainter(42));
    fixture.componentRef.setInput('myPlayerId', 7);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="painter-word"]')?.textContent).toContain('guitarra');
    expect(root.querySelector('[data-testid="impostor-hint"]')).toBeNull();
  });

  it('IMPOSTOR ve la pista y las vidas, no la palabra', () => {
    const fixture = TestBed.createComponent(DrawingPhaseView);
    fixture.componentRef.setInput('state', stateForImpostor(42));
    fixture.componentRef.setInput('myPlayerId', 7);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="impostor-hint"]')?.textContent).toContain('piano');
    expect(root.querySelector('[data-testid="impostor-lives"]')?.textContent).toContain('1');
    expect(root.querySelector('[data-testid="painter-word"]')).toBeNull();
  });

  it('cuando es mi turno (PAINTER) muestra canvas activo', () => {
    const fixture = TestBed.createComponent(DrawingPhaseView);
    fixture.componentRef.setInput('state', stateForPainter(42));
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="active-canvas"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="spectator-view"]')).toBeNull();
  });

  it('cuando NO es mi turno muestra modo espectador con miniatura del dibujante', () => {
    const fixture = TestBed.createComponent(DrawingPhaseView);
    fixture.componentRef.setInput('state', stateForPainter(42));
    fixture.componentRef.setInput('myPlayerId', 7);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="spectator-view"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="active-canvas"]')).toBeNull();
  });

  it('IMPOSTOR no puede dibujar nunca, siempre ve modo espectador', () => {
    const fixture = TestBed.createComponent(DrawingPhaseView);
    fixture.componentRef.setInput('state', stateForImpostor(42));
    fixture.componentRef.setInput('myPlayerId', 7);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="spectator-view"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="active-canvas"]')).toBeNull();
  });

  it('IMPOSTOR ve la caja de adivinación inline (fallback hasta 2I.8 de P6)', () => {
    const fixture = TestBed.createComponent(DrawingPhaseView);
    fixture.componentRef.setInput('state', stateForImpostor(42));
    fixture.componentRef.setInput('myPlayerId', 7);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="impostor-guess-box"]')).toBeTruthy();
  });

  it('PAINTER no ve la caja de adivinación', () => {
    const fixture = TestBed.createComponent(DrawingPhaseView);
    fixture.componentRef.setInput('state', stateForPainter(42));
    fixture.componentRef.setInput('myPlayerId', 7);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="impostor-guess-box"]')).toBeNull();
  });

  it('emite guessSubmitted con el texto cuando IMPOSTOR envía la caja', () => {
    const fixture = TestBed.createComponent(DrawingPhaseView);
    fixture.componentRef.setInput('state', stateForImpostor(42));
    fixture.componentRef.setInput('myPlayerId', 7);
    fixture.detectChanges();

    let received: string | null = null;
    fixture.componentInstance.guessSubmitted.subscribe((g) => (received = g));

    const input = fixture.nativeElement.querySelector('[data-testid="impostor-guess-input"]') as HTMLInputElement;
    input.value = 'guitarra';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('[data-testid="impostor-guess-submit"]') as HTMLButtonElement;
    button.click();

    expect(received).toBe('guitarra');
  });

  it('muestra el temporizador con state.timeRemainingSec', () => {
    const fixture = TestBed.createComponent(DrawingPhaseView);
    fixture.componentRef.setInput('state', stateForPainter(42));
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="timer"]')?.textContent).toContain('30');
  });

  it('renderiza placeholder si nadie está dibujando todavía', () => {
    const fixture = TestBed.createComponent(DrawingPhaseView);
    fixture.componentRef.setInput('state', stateForPainter(null));
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="waiting-for-turn"]')).toBeTruthy();
  });

  it('mantiene el atributo data-testid="drawing-phase" en el root para el container', () => {
    const fixture = TestBed.createComponent(DrawingPhaseView);
    fixture.componentRef.setInput('state', stateForPainter(42));
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="drawing-phase"]')).toBeTruthy();
  });
});
