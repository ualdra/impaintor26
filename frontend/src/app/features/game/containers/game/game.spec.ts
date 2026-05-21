import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Subject, of } from 'rxjs';

import { GameComponent } from './game';
import { GameStateService } from '../../services/game-state';
import { MockGameEventEmitter } from '../../services/mock-game-event-emitter';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AuthService } from '../../../../core/services/auth.service';

describe('GameComponent', () => {
  let mockEmitter: MockGameEventEmitter;
  let wsMock: { connect: any; subscribe: any; send: any; disconnect: any; status$: any };
  let authMock: { getToken: any };

  function configure(devMode: boolean, code = 'TEST') {
    wsMock = {
      connect: vi.fn(),
      subscribe: vi.fn().mockReturnValue(of()),
      send: vi.fn(),
      disconnect: vi.fn(),
      status$: of('IDLE'),
    };

    authMock = {
      getToken: vi.fn().mockReturnValue(null),
    };

    TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        GameStateService,
        MockGameEventEmitter,
        { provide: WebSocketService, useValue: wsMock },
        { provide: AuthService, useValue: authMock },
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
    // authMock.getToken devuelve null por defecto
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('No autenticado');
    expect(wsMock.connect).not.toHaveBeenCalled();
  });

  it('ngOnDestroy invoca disconnect cuando se conectó por WebSocket', () => {
    configure(false);
    authMock.getToken.mockReturnValue('fake-token');
    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();
    fixture.destroy();
    expect(wsMock.disconnect).toHaveBeenCalled();
  });

  it('TieBreakView voteMoved llama ws.send con la ruta y payload correctos', () => {
    configure(false, 'SALA');
    authMock.getToken.mockReturnValue('fake-token');

    const gameEvents$ = new Subject<any>();
    const privateEvents$ = new Subject<any>();
    wsMock.subscribe = vi.fn().mockImplementation((topic: string) => {
      if (topic.endsWith('.game')) return gameEvents$.asObservable();
      if (topic === '/user/queue/private') return privateEvents$.asObservable();
      return of();
    });

    const fixture = TestBed.createComponent(GameComponent);
    fixture.detectChanges();

    privateEvents$.next({ type: 'ROLE_ASSIGNMENT', role: 'IMPOSTOR', hint: 'piano', lives: 1 });
    gameEvents$.next({
      type: 'VOTE_TIE',
      tiedPlayers: [{ id: 7, votes: 2 }, { id: 13, votes: 2 }],
      timeSeconds: 15,
    });
    fixture.detectChanges();

    const card = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="tied-player-7"]',
    ) as HTMLButtonElement;
    card.click();

    expect(wsMock.send).toHaveBeenCalledWith('/app/room.SALA.vote-move', { votedPlayerId: 7 });
  });
});
