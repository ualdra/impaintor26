import { EndReason, TopVote, Winner } from './game-event';
import { Role } from './role-assignment';

export type Phase =
  | 'CONNECTING'
  | 'DRAWING'
  | 'GALLERY'
  | 'VOTING'
  | 'TIE_BREAK'
  | 'RESULT'
  | 'OVER';

export interface GameOverInfo {
  winner: Winner;
  reason: EndReason;
  impostorId: number;
  secretWord: string;
}

/**
 * Estado completo del juego en el cliente, único source of truth de las
 * sub-vistas (DrawingPhaseView, GalleryView, VotingView, ...). Se actualiza
 * exclusivamente vía GameStateService.applyEvent / applyRoleAssignment.
 */
export interface GameState {
  phase: Phase;
  round: number;
  drawingOrder: number[];
  currentDrawerId: number | null;
  timeRemainingSec: number;

  myRole: Role | null;
  secretWord: string | null;
  hint: string | null;
  impostorLives: number | null;

  topVoted: TopVote[];
  tiedPlayers: TopVote[];
  eliminated: number | null;
  wasImpostorEliminated: boolean | null;

  gameOver: GameOverInfo | null;
}

export const INITIAL_STATE: GameState = {
  phase: 'CONNECTING',
  round: 0,
  drawingOrder: [],
  currentDrawerId: null,
  timeRemainingSec: 0,
  myRole: null,
  secretWord: null,
  hint: null,
  impostorLives: null,
  topVoted: [],
  tiedPlayers: [],
  eliminated: null,
  wasImpostorEliminated: null,
  gameOver: null,
};
