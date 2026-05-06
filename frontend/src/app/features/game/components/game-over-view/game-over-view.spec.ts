import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { GameOverView } from './game-over-view';
import { INITIAL_STATE } from '../../models/game-state';

describe('GameOverView (placeholder)', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [GameOverView] }));

  it('crea el componente y renderiza el header de fase', () => {
    const fixture = TestBed.createComponent(GameOverView);
    fixture.componentRef.setInput('state', { ...INITIAL_STATE, phase: 'OVER' });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="game-over-phase"]')).toBeTruthy();
    expect(root.textContent).toContain('Fase: OVER');
  });
});
