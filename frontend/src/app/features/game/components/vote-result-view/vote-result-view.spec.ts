import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { VoteResultView } from './vote-result-view';
import { INITIAL_STATE } from '../../models/game-state';

describe('VoteResultView (placeholder)', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [VoteResultView] }));

  it('crea el componente y renderiza el header de fase', () => {
    const fixture = TestBed.createComponent(VoteResultView);
    fixture.componentRef.setInput('state', { ...INITIAL_STATE, phase: 'RESULT' });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="vote-result-phase"]')).toBeTruthy();
    expect(root.textContent).toContain('Fase: RESULT');
  });
});
