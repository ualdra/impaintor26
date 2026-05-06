import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { VotingView } from './voting-view';
import { GameState, INITIAL_STATE } from '../../models/game-state';
import { SpectatorCanvasService } from '../../services/spectator-canvas';

function baseState(): GameState {
  return {
    ...INITIAL_STATE,
    phase: 'VOTING',
    round: 1,
    drawingOrder: [42, 7, 13],
    timeRemainingSec: 30,
    myRole: 'PAINTER',
    secretWord: 'guitarra',
  };
}

describe('VotingView', () => {
  let snapshotsStore: Record<number, string>;

  beforeEach(() => {
    snapshotsStore = { 42: 'data:img/42', 7: 'data:img/7', 13: 'data:img/13' };
    TestBed.configureTestingModule({
      imports: [VotingView],
      providers: [
        {
          provide: SpectatorCanvasService,
          useValue: {
            snapshots: () => snapshotsStore,
            replayStroke: vi.fn(),
            clearPlayer: vi.fn(),
            replayBroadcast: vi.fn(),
          },
        },
      ],
    });
  });

  it('renderiza una tarjeta por jugador en drawingOrder', () => {
    const fixture = TestBed.createComponent(VotingView);
    fixture.componentRef.setInput('state', baseState());
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid^="vote-card-"]');
    expect(cards).toHaveLength(3);
  });

  it('cada tarjeta muestra la miniatura del canvas del jugador', () => {
    const fixture = TestBed.createComponent(VotingView);
    fixture.componentRef.setInput('state', baseState());
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    const img42 = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="vote-card-42"] img',
    ) as HTMLImageElement;
    expect(img42.getAttribute('src')).toBe('data:img/42');
  });

  it('click en tarjeta emite voteCast con el playerId', () => {
    const fixture = TestBed.createComponent(VotingView);
    fixture.componentRef.setInput('state', baseState());
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    let voted: number | null = null;
    fixture.componentInstance.voteCast.subscribe((id) => (voted = id));

    const card7 = fixture.nativeElement.querySelector('[data-testid="vote-card-7"]') as HTMLElement;
    card7.click();
    fixture.detectChanges();

    expect(voted).toBe(7);
  });

  it('después de votar, no permite votar otra vez', () => {
    const fixture = TestBed.createComponent(VotingView);
    fixture.componentRef.setInput('state', baseState());
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    const emissions: number[] = [];
    fixture.componentInstance.voteCast.subscribe((id) => emissions.push(id));

    const card7 = fixture.nativeElement.querySelector('[data-testid="vote-card-7"]') as HTMLElement;
    card7.click();
    fixture.detectChanges();
    card7.click();
    fixture.detectChanges();
    const card13 = fixture.nativeElement.querySelector('[data-testid="vote-card-13"]') as HTMLElement;
    card13.click();
    fixture.detectChanges();

    expect(emissions).toEqual([7]);
  });

  it('marca visualmente la tarjeta votada con clase "voted"', () => {
    const fixture = TestBed.createComponent(VotingView);
    fixture.componentRef.setInput('state', baseState());
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    const card7 = fixture.nativeElement.querySelector('[data-testid="vote-card-7"]') as HTMLElement;
    card7.click();
    fixture.detectChanges();

    expect(card7.classList.contains('voted')).toBe(true);
  });

  it('excluye al jugador eliminado de las tarjetas', () => {
    const fixture = TestBed.createComponent(VotingView);
    fixture.componentRef.setInput('state', { ...baseState(), eliminated: 7 });
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="vote-card-7"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="vote-card-42"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="vote-card-13"]')).toBeTruthy();
  });

  it('muestra el temporizador con state.timeRemainingSec', () => {
    const fixture = TestBed.createComponent(VotingView);
    fixture.componentRef.setInput('state', baseState());
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="timer"]')?.textContent).toContain('30');
  });

  it('mantiene el atributo data-testid="voting-phase" en el root', () => {
    const fixture = TestBed.createComponent(VotingView);
    fixture.componentRef.setInput('state', baseState());
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="voting-phase"]')).toBeTruthy();
  });

  it('si no hay snapshot disponible, muestra placeholder "(sin dibujo)"', () => {
    snapshotsStore = {}; // todos los jugadores sin dibujo aún
    const fixture = TestBed.createComponent(VotingView);
    fixture.componentRef.setInput('state', baseState());
    fixture.componentRef.setInput('myPlayerId', 42);
    fixture.detectChanges();

    const card42 = fixture.nativeElement.querySelector('[data-testid="vote-card-42"]') as HTMLElement;
    expect(card42.textContent).toContain('sin dibujo');
  });
});
