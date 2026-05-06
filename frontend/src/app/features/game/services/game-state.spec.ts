import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { GameStateService } from './game-state';
import { GameEvent } from '../models/game-event';
import { RoleAssignment } from '../models/role-assignment';

describe('GameStateService', () => {
  let svc: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(GameStateService);
  });

  it('estado inicial: phase=CONNECTING y campos en valores nulos', () => {
    const s = svc.state();
    expect(s.phase).toBe('CONNECTING');
    expect(s.round).toBe(0);
    expect(s.drawingOrder).toEqual([]);
    expect(s.currentDrawerId).toBeNull();
    expect(s.myRole).toBeNull();
    expect(s.secretWord).toBeNull();
    expect(s.hint).toBeNull();
    expect(s.impostorLives).toBeNull();
    expect(s.gameOver).toBeNull();
  });

  describe('applyEvent', () => {
    it('GAME_START → phase=DRAWING, round=1, drawingOrder set', () => {
      const ev: GameEvent = { type: 'GAME_START', drawingOrder: [42, 7, 13], round: 1 };
      svc.applyEvent(ev);
      expect(svc.state().phase).toBe('DRAWING');
      expect(svc.state().round).toBe(1);
      expect(svc.state().drawingOrder).toEqual([42, 7, 13]);
    });

    it('TURN_START → currentDrawerId y timeRemainingSec set', () => {
      svc.applyEvent({ type: 'TURN_START', playerId: 42, timeSeconds: 30 });
      expect(svc.state().currentDrawerId).toBe(42);
      expect(svc.state().timeRemainingSec).toBe(30);
    });

    it('TURN_END → currentDrawerId vuelve a null', () => {
      svc.applyEvent({ type: 'TURN_START', playerId: 42, timeSeconds: 30 });
      svc.applyEvent({ type: 'TURN_END', playerId: 42 });
      expect(svc.state().currentDrawerId).toBeNull();
    });

    it('GALLERY_PHASE → phase=GALLERY', () => {
      svc.applyEvent({ type: 'GALLERY_PHASE' });
      expect(svc.state().phase).toBe('GALLERY');
    });

    it('VOTE_PHASE → phase=VOTING y timer set', () => {
      svc.applyEvent({ type: 'VOTE_PHASE', timeSeconds: 30 });
      expect(svc.state().phase).toBe('VOTING');
      expect(svc.state().timeRemainingSec).toBe(30);
    });

    it('VOTE_RESULT → phase=RESULT, eliminated y topVoted set', () => {
      svc.applyEvent({
        type: 'VOTE_RESULT',
        eliminated: 7,
        wasImpostor: false,
        topVoted: [{ id: 7, votes: 3 }],
      });
      expect(svc.state().phase).toBe('RESULT');
      expect(svc.state().eliminated).toBe(7);
      expect(svc.state().wasImpostorEliminated).toBe(false);
      expect(svc.state().topVoted).toEqual([{ id: 7, votes: 3 }]);
    });

    it('VOTE_TIE → phase=TIE_BREAK, tiedPlayers set', () => {
      svc.applyEvent({
        type: 'VOTE_TIE',
        tiedPlayers: [
          { id: 7, votes: 3 },
          { id: 13, votes: 3 },
        ],
        timeSeconds: 15,
      });
      expect(svc.state().phase).toBe('TIE_BREAK');
      expect(svc.state().tiedPlayers).toHaveLength(2);
      expect(svc.state().timeRemainingSec).toBe(15);
    });

    it('GUESS_ATTEMPT (impostor) → actualiza impostorLives y emite por gameEvents$', async () => {
      svc.applyRoleAssignment({ type: 'ROLE_ASSIGNMENT', role: 'IMPOSTOR', hint: 'piano', lives: 1 });
      const emitted = new Promise<GameEvent>((resolve) => {
        svc.gameEvents$.subscribe((e) => resolve(e));
      });
      svc.applyEvent({ type: 'GUESS_ATTEMPT', livesRemaining: 0, correct: false });
      const ev = await emitted;
      expect(ev.type).toBe('GUESS_ATTEMPT');
      expect(svc.state().impostorLives).toBe(0);
    });

    it('NEW_ROUND → round incrementado, phase=DRAWING, votes/eliminated reseteados', () => {
      svc.applyEvent({ type: 'GAME_START', drawingOrder: [1, 2, 3], round: 1 });
      svc.applyEvent({
        type: 'VOTE_RESULT',
        eliminated: 2,
        wasImpostor: false,
        topVoted: [{ id: 2, votes: 3 }],
      });
      svc.applyEvent({ type: 'NEW_ROUND', round: 2, drawingOrder: [1, 3] });
      expect(svc.state().phase).toBe('DRAWING');
      expect(svc.state().round).toBe(2);
      expect(svc.state().drawingOrder).toEqual([1, 3]);
      expect(svc.state().eliminated).toBeNull();
      expect(svc.state().topVoted).toEqual([]);
    });

    it('GAME_OVER → phase=OVER, gameOver populado', () => {
      svc.applyEvent({
        type: 'GAME_OVER',
        winner: 'PAINTERS',
        reason: 'VOTED_OUT',
        impostorId: 8,
        secretWord: 'guitarra',
      });
      expect(svc.state().phase).toBe('OVER');
      expect(svc.state().gameOver).toEqual({
        winner: 'PAINTERS',
        reason: 'VOTED_OUT',
        impostorId: 8,
        secretWord: 'guitarra',
      });
    });
  });

  describe('applyRoleAssignment', () => {
    it('Painter → myRole=PAINTER, secretWord set, hint/lives null', () => {
      const role: RoleAssignment = { type: 'ROLE_ASSIGNMENT', role: 'PAINTER', word: 'guitarra' };
      svc.applyRoleAssignment(role);
      expect(svc.state().myRole).toBe('PAINTER');
      expect(svc.state().secretWord).toBe('guitarra');
      expect(svc.state().hint).toBeNull();
      expect(svc.state().impostorLives).toBeNull();
    });

    it('Impostor → myRole=IMPOSTOR, hint y impostorLives set', () => {
      const role: RoleAssignment = { type: 'ROLE_ASSIGNMENT', role: 'IMPOSTOR', hint: 'piano', lives: 1 };
      svc.applyRoleAssignment(role);
      expect(svc.state().myRole).toBe('IMPOSTOR');
      expect(svc.state().hint).toBe('piano');
      expect(svc.state().impostorLives).toBe(1);
      expect(svc.state().secretWord).toBeNull();
    });
  });

  describe('selectores computed', () => {
    it('isImpostor() refleja el rol asignado', () => {
      expect(svc.isImpostor()).toBe(false);
      svc.applyRoleAssignment({ type: 'ROLE_ASSIGNMENT', role: 'IMPOSTOR', hint: 'x', lives: 1 });
      expect(svc.isImpostor()).toBe(true);
    });

    it('isMyTurn(myId) compara con currentDrawerId', () => {
      svc.applyEvent({ type: 'TURN_START', playerId: 42, timeSeconds: 30 });
      expect(svc.isMyTurn(42)).toBe(true);
      expect(svc.isMyTurn(7)).toBe(false);
    });

    it('phase() expone la fase actual', () => {
      expect(svc.phase()).toBe('CONNECTING');
      svc.applyEvent({ type: 'GAME_START', drawingOrder: [1], round: 1 });
      expect(svc.phase()).toBe('DRAWING');
    });
  });

  it('reset() devuelve el estado al inicial', () => {
    svc.applyEvent({ type: 'GAME_START', drawingOrder: [1, 2], round: 1 });
    svc.applyRoleAssignment({ type: 'ROLE_ASSIGNMENT', role: 'PAINTER', word: 'x' });
    svc.reset();
    expect(svc.state().phase).toBe('CONNECTING');
    expect(svc.state().round).toBe(0);
    expect(svc.state().myRole).toBeNull();
  });
});
