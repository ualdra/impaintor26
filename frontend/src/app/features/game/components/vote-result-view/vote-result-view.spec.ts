import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { VoteResultView } from './vote-result-view';
import { GameState, INITIAL_STATE } from '../../models/game-state';

function baseState(): GameState {
  return {
    ...INITIAL_STATE,
    phase: 'RESULT',
    round: 1,
    eliminated: 7,
    wasImpostorEliminated: false,
    topVoted: [{ id: 7, votes: 3 }],
  };
}

describe('VoteResultView', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [VoteResultView] });
  });

  it('mantiene data-testid="vote-result-phase" en el root', () => {
    const fixture = TestBed.createComponent(VoteResultView);
    fixture.componentRef.setInput('state', baseState());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="vote-result-phase"]')).toBeTruthy();
  });

  it('cuando eliminated es null muestra mensaje de nadie eliminado', () => {
    const fixture = TestBed.createComponent(VoteResultView);
    fixture.componentRef.setInput('state', { ...baseState(), eliminated: null, wasImpostorEliminated: null, topVoted: [] });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="no-elimination"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="eliminated-player-id"]')).toBeNull();
  });

  it('cuando eliminated !== null y wasImpostorEliminated === false muestra id y mensaje no-impostor', () => {
    const fixture = TestBed.createComponent(VoteResultView);
    fixture.componentRef.setInput('state', { ...baseState(), eliminated: 7, wasImpostorEliminated: false });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="eliminated-player-id"]')?.textContent).toContain('7');
    expect(el.querySelector('[data-testid="not-impostor-message"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="was-impostor-message"]')).toBeNull();
  });

  it('cuando wasImpostorEliminated === true muestra el mensaje de impostor descubierto', () => {
    const fixture = TestBed.createComponent(VoteResultView);
    fixture.componentRef.setInput('state', { ...baseState(), eliminated: 7, wasImpostorEliminated: true });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="eliminated-player-id"]')?.textContent).toContain('7');
    expect(el.querySelector('[data-testid="was-impostor-message"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="not-impostor-message"]')).toBeNull();
  });

  it('renderiza la lista topVoted con una entrada por id', () => {
    const fixture = TestBed.createComponent(VoteResultView);
    fixture.componentRef.setInput('state', {
      ...baseState(),
      topVoted: [{ id: 7, votes: 3 }, { id: 13, votes: 2 }],
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="top-voted-list"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="top-voted-entry-7"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="top-voted-entry-13"]')).toBeTruthy();
  });

  it('topVoted vacío no rompe el componente', () => {
    const fixture = TestBed.createComponent(VoteResultView);
    fixture.componentRef.setInput('state', { ...baseState(), topVoted: [] });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="top-voted-list"]')).toBeTruthy();
    expect(el.querySelectorAll('[data-testid^="top-voted-entry-"]')).toHaveLength(0);
  });
});
