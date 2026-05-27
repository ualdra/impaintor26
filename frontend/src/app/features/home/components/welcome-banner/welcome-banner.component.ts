import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * WelcomeBannerComponent — Responsabilidad Única (SRP):
 * muestra únicamente el saludo personalizado al usuario.
 *
 * ISO 25010 — Usabilidad (reconocibilidad): el nombre del jugador aparece
 * inmediatamente en primer plano para reforzar la identidad personal.
 */
@Component({
  selector: 'app-welcome-banner',
  standalone: true,
  template: `
    <header class="welcome-banner" role="banner">
      <div class="banner-emblem" aria-hidden="true" style="display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" style="width: 2.2rem; height: 2.2rem; color: #c9a86c;">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 2.75 2.25 5 5 5h1a2 2 0 0 1 2 2c0 1.66-1.34 3-3 3-1.66 0-3-1.34-3-3"></path>
          <circle cx="7.5" cy="10.5" r=".5" fill="currentColor"></circle>
          <circle cx="11.5" cy="7.5" r=".5" fill="currentColor"></circle>
          <circle cx="16.5" cy="9.5" r=".5" fill="currentColor"></circle>
          <circle cx="15.5" cy="14.5" r=".5" fill="currentColor"></circle>
        </svg>
      </div>
      <h1 class="welcome-title">
        Hola,
        <span class="player-name">{{ playerName }}</span>
      </h1>
      <p class="welcome-subtitle">¿Listo para pintar… o engañar?</p>
      <div class="banner-divider" aria-hidden="true"></div>
    </header>
  `,
  styleUrl: './welcome-banner.component.css',
})
export class WelcomeBannerComponent {
  private readonly authService = inject(AuthService);

  /**
   * Obtiene el nombre del jugador desde el AuthService.
   * Si no hay sesión activa, muestra un texto genérico.
   */
  readonly playerName: string = this.authService.getCurrentUser()?.username ?? 'Jugador';
}
