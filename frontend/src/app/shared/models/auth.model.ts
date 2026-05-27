/**
 * Modelo de Autenticación
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  elo: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string;
  avatarData?: string;
  countryCode?: string;
  biography?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
