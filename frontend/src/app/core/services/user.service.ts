import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

export interface UpdateMeRequest {
  username?: string;
  password?: string;
  countryCode?: string;
  biography?: string;
  avatarData?: string;
}

/**
 * UserService — Responsabilidad Única (SRP): gestiona exclusivamente el estado
 * del usuario autenticado en la sesión activa.
 *
 * ISO 25010 — Mantenibilidad: servicio aislado, inyectable y testeable.
 * ISO 25010 — Fiabilidad: señal reactiva que garantiza consistencia del estado.
 *
 * OCP: El servicio puede extenderse para persistir datos (localStorage / HTTP)
 * sin modificar la interfaz pública que consumen los componentes.
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/users';

  /**
   * Estado del usuario como señal reactiva (Angular Signals).
   * Se inicializa con un usuario de ejemplo para desarrollo/demo.
   * En producción será reemplazado por datos reales del JWT.
   */
  private readonly _currentUser = signal<User | null>(null);

  /** Señal pública de sólo lectura — cumple el principio de encapsulación. */
  readonly currentUser = this._currentUser.asReadonly();

  /**
   * Actualiza el usuario en sesión (p.e. tras login o refresco de perfil).
   * @param user El usuario autenticado, o null si la sesión expira.
   */
  setCurrentUser(user: User | null): void {
    this._currentUser.set(user);
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`);
  }

  updateMe(payload: UpdateMeRequest): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/me`, payload);
  }

  getPublicProfile(userId: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${userId}`);
  }
}
