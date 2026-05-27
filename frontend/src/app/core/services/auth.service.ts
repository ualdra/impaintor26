import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map, catchError } from 'rxjs';
import { throwError } from 'rxjs';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  AuthState,
} from '../../shared/models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = '/api/auth';
  private usersApiUrl = '/api/users';
  private tokenKey = 'auth_token';
  private userKey = 'current_user';
  private platformId = inject(PLATFORM_ID);

  // BehaviorSubject para el estado global de autenticación
  private authStateSubject = new BehaviorSubject<AuthState>({
    user: this.getUserFromStorage(),
    token: this.getTokenFromStorage(),
    isAuthenticated: !!this.getTokenFromStorage(),
    isLoading: false,
    error: null,
  });

  authState$ = this.authStateSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkTokenValidity();
  }

  /**
   * Obtener el token JWT del localStorage (solo en navegador)
   */
  private getTokenFromStorage(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  /**
   * Obtener el usuario del localStorage (solo en navegador)
   */
  private getUserFromStorage(): User | null {
    if (isPlatformBrowser(this.platformId)) {
      const userJson = localStorage.getItem(this.userKey);
      return userJson ? JSON.parse(userJson) : null;
    }
    return null;
  }

  /**
   * Guardar token en localStorage (solo en navegador)
   */
  private saveToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  /**
   * Guardar usuario en localStorage (solo en navegador)
   */
  private saveUser(user: User): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
  }

  /**
   * Limpiar datos de autenticación (solo en navegador)
   */
  private clearAuthData(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
  }

  /**
   * Obtener token actual
   */
  getToken(): string | null {
    return this.getTokenFromStorage();
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getTokenFromStorage();
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    return this.getUserFromStorage();
  }

  /**
   * Sincroniza el usuario actual en localStorage y en el estado reactivo.
   */
  syncCurrentUser(user: User): void {
    this.saveUser(user);
    this.updateAuthState({ user });
  }

  /**
   * Refresca el usuario desde backend (/api/users/me).
   */
  refreshCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.usersApiUrl}/me`).pipe(
      tap((user) => this.syncCurrentUser(user))
    );
  }

  /**
   * Registrar un nuevo usuario
   */
  register(request: RegisterRequest): Observable<AuthResponse> {
    this.updateAuthState({ isLoading: true, error: null });
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request).pipe(
      tap((response) => {
        this.saveToken(response.token);
        this.saveUser(response.user);
        this.updateAuthState({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      }),
      catchError((error) => {
        const errorMsg = error.error?.message || 'Error en el registro';
        this.updateAuthState({
          isLoading: false,
          error: errorMsg,
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Iniciar sesión
   */
  login(request: LoginRequest): Observable<AuthResponse> {
    this.updateAuthState({ isLoading: true, error: null });
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap((response) => {
        this.saveToken(response.token);
        this.saveUser(response.user);
        this.updateAuthState({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      }),
      catchError((error) => {
        const errorMsg = error.error?.message || 'Credenciales inválidas';
        this.updateAuthState({
          isLoading: false,
          error: errorMsg,
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Cerrar sesión
   */
  logout(): void {
    this.clearAuthData();
    this.updateAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }

  /**
   * Actualizar el estado de autenticación
   */
  private updateAuthState(partial: Partial<AuthState>): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({ ...currentState, ...partial });
  }

  /**
   * Verificar que el token sea válido (básico)
   */
  private checkTokenValidity(): void {
    const token = this.getTokenFromStorage();
    if (token) {
      this.updateAuthState({
        isAuthenticated: true,
      });
    }
  }
}
