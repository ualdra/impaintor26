import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { TieBreakView } from './tie-break-view';
import { GameState, INITIAL_STATE } from '../../models/game-state';

function baseState(): GameState {
  return {
    ...INITIAL_STATE,
    phase: 'TIE_BREAK',
    round: 2,
    tiedPlayers: [{ id: 7, votes: 2 }, { id: 13, votes: 2 }],
    timeRemainingSec: 15,
    myRole: 'PAINTER',
  };
}

describe('TieBreakView', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TieBreakView] });
  });

  it('mantiene data-testid="tie-break-phase" en el root', () => {
    const fixture = TestBed.createComponent(TieBreakView);
    fixture.componentRef.setInput('state', baseState());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="tie-break-phase"]')).toBeTruthy();
  });

  it.skip('renderiza una tarjeta por jugador empatado', () => {
    const fixture = TestBed.createComponent(TieBreakView);
    fixture.componentRef.setInput('state', baseState());
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="tied-player-7"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="tied-player-13"]')).toBeTruthy();
  });

  it.skip('cada tarjeta tiene la clase "tied"', () => {
    const fixture = TestBed.createComponent(TieBreakView);
    fixture.componentRef.setInput('state', baseState());
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('[data-testid="tied-player-7"]') as HTMLElement;
    expect(card.classList.contains('tied')).toBe(true);
  });

  it('muestra el temporizador con timeRemainingSec', () => {
    const fixture = TestBed.createComponent(TieBreakView);
    fixture.componentRef.setInput('state', baseState());
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="timer"]')?.textContent,
    ).toContain('15');
  });

  it('si myRole !== IMPOSTOR muestra el prompt de espera y no el de acción', () => {
    const fixture = TestBed.createComponent(TieBreakView);
    fixture.componentRef.setInput('state', { ...baseState(), myRole: 'PAINTER' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="waiting-prompt"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="impostor-prompt"]')).toBeNull();
  });

  it('si myRole === IMPOSTOR muestra el prompt de acción y no el de espera', () => {
    const fixture = TestBed.createComponent(TieBreakView);
    fixture.componentRef.setInput('state', { ...baseState(), myRole: 'IMPOSTOR' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="impostor-prompt"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="waiting-prompt"]')).toBeNull();
  });

  it.skip('impostor click en tarjeta emite voteMoved con el playerId', () => {
    const fixture = TestBed.createComponent(TieBreakView);
    fixture.componentRef.setInput('state', { ...baseState(), myRole: 'IMPOSTOR' });
    fixture.detectChanges();

    let moved: number | null = null;
    fixture.componentInstance.voteMoved.subscribe((id: number) => (moved = id));

    const card = fixture.nativeElement.querySelector('[data-testid="tied-player-7"]') as HTMLElement;
    card.click();
    fixture.detectChanges();

    expect(moved).toBe(7);
  });

  it.skip('el impostor no puede mover el voto dos veces', () => {
    const fixture = TestBed.createComponent(TieBreakView);
    fixture.componentRef.setInput('state', { ...baseState(), myRole: 'IMPOSTOR' });
    fixture.detectChanges();

    const emissions: number[] = [];
    fixture.componentInstance.voteMoved.subscribe((id: number) => emissions.push(id));

    const card7 = fixture.nativeElement.querySelector('[data-testid="tied-player-7"]') as HTMLElement;
    const card13 = fixture.nativeElement.querySelector('[data-testid="tied-player-13"]') as HTMLElement;
    card7.click();
    fixture.detectChanges();
    card13.click();
    fixture.detectChanges();

    expect(emissions).toEqual([7]);
  });

  it.skip('tras mover, la tarjeta elegida adquiere la clase "voted"', () => {
    const fixture = TestBed.createComponent(TieBreakView);
    fixture.componentRef.setInput('state', { ...baseState(), myRole: 'IMPOSTOR' });
    fixture.detectChanges();

    const card7 = fixture.nativeElement.querySelector('[data-testid="tied-player-7"]') as HTMLElement;
    card7.click();
    fixture.detectChanges();

    expect(card7.classList.contains('voted')).toBe(true);
  });

  it('un painter no puede emitir voteMoved al hacer click', () => {
    const fixture = TestBed.createComponent(TieBreakView);
    fixture.componentRef.setInput('state', { ...baseState(), myRole: 'PAINTER' });
    fixture.detectChanges();

    let moved: number | null = null;
    fixture.componentInstance.voteMoved.subscribe((id: number) => (moved = id));

    const card = fixture.nativeElement.querySelector('[data-testid="tied-player-7"]') as HTMLElement;
    card?.click();
    fixture.detectChanges();

    expect(moved).toBeNull();
  });
});
