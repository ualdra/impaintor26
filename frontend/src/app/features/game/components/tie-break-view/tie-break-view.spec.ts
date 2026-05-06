import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { TieBreakView } from './tie-break-view';
import { INITIAL_STATE } from '../../models/game-state';

describe('TieBreakView (placeholder)', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [TieBreakView] }));

  it('crea el componente y renderiza el header de fase', () => {
    const fixture = TestBed.createComponent(TieBreakView);
    fixture.componentRef.setInput('state', { ...INITIAL_STATE, phase: 'TIE_BREAK' });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="tie-break-phase"]')).toBeTruthy();
    expect(root.textContent).toContain('Fase: TIE_BREAK');
  });
});
