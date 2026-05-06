import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { VotingView } from './voting-view';
import { INITIAL_STATE } from '../../models/game-state';

describe('VotingView (placeholder)', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [VotingView] }));

  it('crea el componente y renderiza el header de fase', () => {
    const fixture = TestBed.createComponent(VotingView);
    fixture.componentRef.setInput('state', { ...INITIAL_STATE, phase: 'VOTING' });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="voting-phase"]')).toBeTruthy();
    expect(root.textContent).toContain('Fase: VOTING');
  });
});
