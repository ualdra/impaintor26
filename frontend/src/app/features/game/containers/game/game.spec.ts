import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';

import { GameComponent } from './game';
import { GameStateService } from '../../services/game-state';
import { MockGameEventEmitter } from '../../services/mock-game-event-emitter';
import { StompClientService } from '../../../realtime/services/stomp-client';

describe('GameComponent', () => {
  let mockEmitter: MockGameEventEmitter;
  let stompMock: { connect: any; subscribe: any; send: any; disconnect: any; status$: any };

  function configure(devMode: boolean, code = 'TEST') {
    stompMock = {
      connect: vi.fn(),
      subscribe: vi.fn().mockReturnValue(of()),
      send: vi.fn(),
      disconnect: vi.fn(),
      status$: of('IDLE'),
    };

    TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        GameStateService,
        MockGameEventEmitter,
        { provide: StompClientService, useValue: stompMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ code }),
              queryParamMap: convertToParamMap(devMode ? { dev: 'true' } : {}),
            },
          },
        },
      ],
    });
    mockEmitter = TestBed.inject(MockGameEventEmitter);
  }

  it('muestra placeholder de DRAWING cuando llega GAME_START', () => {
    configure(true);
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();

    mockEmitter.emit({ type: 'GAME_START', drawingOrder: [42, 7], round: 1 });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="drawing-phase"]')).toBeTruthy();
  });

  it('muestra placeholder de GALLERY cuando llega GALLERY_PHASE', () => {
    configure(true);
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();

    mockEmitter.emit({ type: 'GAME_START', drawingOrder: [42], round: 1 });
    mockEmitter.emit({ type: 'GALLERY_PHASE' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="gallery-phase"]')).toBeTruthy();
  });

  it('muestra placeholder de VOTING cuando llega VOTE_PHASE', () => {
    configure(true);
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();

    mockEmitter.emit({ type: 'VOTE_PHASE', timeSeconds: 30 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="voting-phase"]')).toBeTruthy();
  });

  it('muestra placeholder de TIE_BREAK cuando llega VOTE_TIE', () => {
    configure(true);
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();

    mockEmitter.emit({ type: 'VOTE_TIE', tiedPlayers: [{ id: 7, votes: 3 }], timeSeconds: 15 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="tie-break-phase"]')).toBeTruthy();
  });

  it('muestra placeholder de RESULT cuando llega VOTE_RESULT', () => {
    configure(true);
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();

    mockEmitter.emit({
      type: 'VOTE_RESULT',
      eliminated: 7,
      wasImpostor: false,
      topVoted: [{ id: 7, votes: 3 }],
    });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="vote-result-phase"]')).toBeTruthy();
  });

  it('muestra placeholder de OVER cuando llega GAME_OVER', () => {
    configure(true);
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();

    mockEmitter.emit({
      type: 'GAME_OVER',
      winner: 'PAINTERS',
      reason: 'VOTED_OUT',
      impostorId: 7,
      secretWord: 'guitarra',
    });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="game-over-phase"]')).toBeTruthy();
  });

  it('en modo no-dev sin token, muestra mensaje de no autenticado', () => {
    configure(false);
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('No autenticado');
    expect(stompMock.connect).not.toHaveBeenCalled();
  });

  it('ngOnDestroy invoca disconnect cuando se conectó por stomp', () => {
    configure(false);
    // Simulamos token presente vía Storage.prototype.
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('fake-token');
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();
    fixture.destroy();
    expect(stompMock.disconnect).toHaveBeenCalled();
  });
});
