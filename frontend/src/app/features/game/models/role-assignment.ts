// Espejo TypeScript del sealed interface RoleAssignment del backend Track D.
// Mantener sincronizado con:
//   backend/src/main/java/com/impaintor/feature/realtime/dto/outbound/RoleAssignment.java

export type Role = 'PAINTER' | 'IMPOSTOR';

export type RoleAssignment =
  | { type: 'ROLE_ASSIGNMENT'; role: 'PAINTER'; word: string }
  | { type: 'ROLE_ASSIGNMENT'; role: 'IMPOSTOR'; hint: string; lives: number };

/** Resultado privado de un intento de adivinación del impostor. */
export interface GuessResult {
  type: 'GUESS_RESULT';
  correct: boolean;
  livesRemaining: number;
}

/** Mensaje privado entrante en /user/queue/private — union de los anteriores. */
export type PrivateMessage = RoleAssignment | GuessResult;
