import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { GalleryView } from './gallery-view';
import { GameState, INITIAL_STATE } from '../../models/game-state';
import { SpectatorCanvasService } from '../../services/spectator-canvas';

function baseState(): GameState {
  return {
    ...INITIAL_STATE,
    phase: 'GALLERY',
    round: 1,
    drawingOrder: [42, 7, 13],
    timeRemainingSec: 10,
  };
}

describe('GalleryView', () => {
  let snapshotsStore: Record<number, string>;

  beforeEach(() => {
    snapshotsStore = { 42: 'data:img/42', 7: 'data:img/7', 13: 'data:img/13' };
    TestBed.configureTestingModule({
      imports: [GalleryView],
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

  it('mantiene data-testid="gallery-phase" en el root', () => {
    const fixture = TestBed.createComponent(GalleryView);
    fixture.componentRef.setInput('state', baseState());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="gallery-phase"]')).toBeTruthy();
  });

  it('renderiza una tarjeta por jugador en drawingOrder', () => {
    const fixture = TestBed.createComponent(GalleryView);
    fixture.componentRef.setInput('state', baseState());
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid^="gallery-card-"]');
    expect(cards).toHaveLength(3);
  });

  it('cada tarjeta muestra el snapshot del jugador como img', () => {
    const fixture = TestBed.createComponent(GalleryView);
    fixture.componentRef.setInput('state', baseState());
    fixture.detectChanges();
    const img = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="gallery-card-42"] img',
    ) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('data:img/42');
  });

  it('si un jugador no tiene snapshot muestra "(sin dibujo)"', () => {
    snapshotsStore = {};
    const fixture = TestBed.createComponent(GalleryView);
    fixture.componentRef.setInput('state', baseState());
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="gallery-card-42"]') as HTMLElement;
    expect(card.textContent).toContain('sin dibujo');
  });

  it('muestra el temporizador con timeRemainingSec', () => {
    const fixture = TestBed.createComponent(GalleryView);
    fixture.componentRef.setInput('state', baseState());
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="timer"]')?.textContent,
    ).toContain('10');
  });

  it('excluye al jugador eliminado de la cuadrícula', () => {
    const fixture = TestBed.createComponent(GalleryView);
    fixture.componentRef.setInput('state', { ...baseState(), eliminated: 7 });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="gallery-card-7"]')).toBeNull();
    expect(el.querySelector('[data-testid="gallery-card-42"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="gallery-card-13"]')).toBeTruthy();
  });
});
