import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { GalleryView } from './gallery-view';
import { INITIAL_STATE } from '../../models/game-state';

describe('GalleryView (placeholder)', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [GalleryView] }));

  it('crea el componente y renderiza el header de fase', () => {
    const fixture = TestBed.createComponent(GalleryView);
    fixture.componentRef.setInput('state', { ...INITIAL_STATE, phase: 'GALLERY' });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="gallery-phase"]')).toBeTruthy();
    expect(root.textContent).toContain('Fase: GALLERY');
  });
});
