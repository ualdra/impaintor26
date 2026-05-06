import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { DrawingPhaseView } from './drawing-phase-view';
import { INITIAL_STATE } from '../../models/game-state';

describe('DrawingPhaseView (placeholder)', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [DrawingPhaseView] }));

  it('crea el componente y renderiza el header de fase', () => {
    const fixture = TestBed.createComponent(DrawingPhaseView);
    fixture.componentRef.setInput('state', { ...INITIAL_STATE, phase: 'DRAWING' });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="drawing-phase"]')).toBeTruthy();
    expect(root.textContent).toContain('Fase: DRAWING');
  });
});
