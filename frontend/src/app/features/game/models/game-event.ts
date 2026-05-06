// Espejo TypeScript del sealed interface GameEvent del backend Track D.
// Mantener sincronizado con:
//   backend/src/main/java/com/impaintor/feature/realtime/dto/outbound/GameEvent.java

export interface TopVote {
  id: number;
  votes: number;
}

export type EndReason =
  | 'VOTED_OUT'
  | 'WORD_GUESSED'
  | 'OUT_OF_LIVES'
  | 'TIE_NOT_BROKEN'
  | 'LAST_STANDING';

export type Winner = 'PAINTERS' | 'IMPOSTOR';

/** Discriminated union de todos los eventos del juego que el servidor difunde a /topic/room.{code}.game. */
export type GameEvent =
  | { type: 'GAME_START'; drawingOrder: number[]; round: number }
  | { type: 'TURN_START'; playerId: number; timeSeconds: number }
  | { type: 'TURN_END'; playerId: number }
  | { type: 'GALLERY_PHASE' }
  | { type: 'VOTE_PHASE'; timeSeconds: number }
  | { type: 'VOTE_RESULT'; eliminated: number; wasImpostor: boolean; topVoted: TopVote[] }
  | { type: 'VOTE_TIE'; tiedPlayers: TopVote[]; timeSeconds: number }
  | { type: 'GUESS_ATTEMPT'; livesRemaining: number; correct: boolean }
  | { type: 'NEW_ROUND'; round: number; drawingOrder: number[] }
  | { type: 'GAME_OVER'; winner: Winner; reason: EndReason; impostorId: number; secretWord: string };

/** Strokes y limpiezas que el servidor reenvía a /topic/room.{code}.draw. */
export interface StrokeBroadcast {
  type: 'STROKE';
  playerId: number;
  points: { x: number; y: number }[];
  color: string;
  thickness: number;
}

export interface ClearCanvasBroadcast {
  type: 'CLEAR';
  playerId: number;
}

export type DrawBroadcast = StrokeBroadcast | ClearCanvasBroadcast;
