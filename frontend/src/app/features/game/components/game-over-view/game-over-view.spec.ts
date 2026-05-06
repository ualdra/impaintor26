import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { GameOverView } from './game-over-view';
import { GameState, INITIAL_STATE } from '../../models/game-state';
import { EndReason, Winner } from '../../models/game-event';

function gameOverState(
  winner: Winner,
  reason: EndReason,
  impostorId = 7,
  secretWord = 'guitarra',
  round = 3,
): GameState {
  return {
    ...INITIAL_STATE,
    phase: 'OVER',
    round,
    hint: 'piano',
    gameOver: { winner, reason, impostorId, secretWord },
  };
}

describe('GameOverView', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [GameOverView] }));

  it('mantiene el atributo data-testid="game-over-phase" en el root', () => {
    const fixture = TestBed.createComponent(GameOverView);
    fixture.componentRef.setInput('state', gameOverState('PAINTERS', 'VOTED_OUT'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="game-over-phase"]')).toBeTruthy();
  });

  it('victoria PAINTERS muestra ganador correcto', () => {
    const fixture = TestBed.createComponent(GameOverView);
    fixture.componentRef.setInput('state', gameOverState('PAINTERS', 'VOTED_OUT'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="winner"]')?.textContent).toContain('Pintores');
  });

  it('victoria IMPOSTOR muestra ganador correcto', () => {
    const fixture = TestBed.createComponent(GameOverView);
    fixture.componentRef.setInput('state', gameOverState('IMPOSTOR', 'WORD_GUESSED'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="winner"]')?.textContent).toContain('Impostor');
  });

  it('revela la palabra secreta', () => {
    const fixture = TestBed.createComponent(GameOverView);
    fixture.componentRef.setInput('state', gameOverState('IMPOSTOR', 'WORD_GUESSED', 7, 'guitarra'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="secret-word"]')?.textContent).toContain('guitarra');
  });

  it('revela la pista (de state.hint)', () => {
    const fixture = TestBed.createComponent(GameOverView);
    fixture.componentRef.setInput('state', gameOverState('PAINTERS', 'VOTED_OUT'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="hint"]')?.textContent).toContain('piano');
  });

  it('revela el id del impostor', () => {
    const fixture = TestBed.createComponent(GameOverView);
    fixture.componentRef.setInput('state', gameOverState('PAINTERS', 'VOTED_OUT', 13));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="impostor-id"]')?.textContent).toContain('13');
  });

  it('muestra el número de rondas jugadas', () => {
    const fixture = TestBed.createComponent(GameOverView);
    fixture.componentRef.setInput('state', gameOverState('PAINTERS', 'VOTED_OUT', 7, 'g', 5));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="rounds"]')?.textContent).toContain('5');
  });

  it.each<[EndReason, string]>([
    ['VOTED_OUT', 'expulsado'],
    ['WORD_GUESSED', 'adivinó'],
    ['OUT_OF_LIVES', 'vidas'],
    ['TIE_NOT_BROKEN', 'empate'],
    ['LAST_STANDING', 'último'],
  ])('traduce EndReason %s a texto humano que contiene "%s"', (reason, expected) => {
    const fixture = TestBed.createComponent(GameOverView);
    fixture.componentRef.setInput('state', gameOverState('PAINTERS', reason));
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('[data-testid="reason"]')?.textContent?.toLowerCase() ?? '';
    expect(text).toContain(expected);
  });

  it('botón "jugar otra vez" emite playAgain', () => {
    const fixture = TestBed.createComponent(GameOverView);
    fixture.componentRef.setInput('state', gameOverState('PAINTERS', 'VOTED_OUT'));
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.playAgain.subscribe(() => (emitted = true));

    const btn = fixture.nativeElement.querySelector('[data-testid="play-again"]') as HTMLButtonElement;
    btn.click();
    expect(emitted).toBe(true);
  });

  it('si state.gameOver es null, muestra mensaje defensivo', () => {
    const fixture = TestBed.createComponent(GameOverView);
    fixture.componentRef.setInput('state', { ...INITIAL_STATE, phase: 'OVER' as const });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="no-game-over"]')).toBeTruthy();
  });
});
