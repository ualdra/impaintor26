/**
 * User model — representa los datos del usuario autenticado.
 * ISO 25010 — Funcionalidad (precisión de datos): modelo fuertemente tipado.
 */
export interface User {
  id: number;
  username: string;
  email: string;
  elo: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt?: string;
  avatarData?: string;
  countryCode?: string;
  biography?: string;
}
