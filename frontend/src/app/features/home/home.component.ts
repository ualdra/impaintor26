import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { WelcomeBannerComponent } from './components/welcome-banner/welcome-banner.component';
import { GameMenuComponent } from './components/game-menu/game-menu.component';
import { HomeFooterComponent } from './components/home-footer/home-footer.component';
import { AudioService } from '../../core/services/audio.service';
import { RoomService } from '../../core/services/room.service';
import { GameBackgroundComponent } from '../../shared/components/game-background/game-background.component';
import { AppPopupComponent } from '../../shared/components/app-popup/app-popup.component';
import { InfoPopupComponent } from './components/info-popup/info-popup.component';

/**
 * HomeComponent — Pantalla principal (menú home) de Impaintor.
 *
 * SRP: únicamente orquesta los sub-componentes y delega la
 * navegación al Router de Angular.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [WelcomeBannerComponent, GameMenuComponent, HomeFooterComponent, GameBackgroundComponent, AppPopupComponent, InfoPopupComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly audioService = inject(AudioService);
  private readonly roomService = inject(RoomService);

  showPopup = signal<boolean>(false);
  popupTitle = signal<string>('');
  popupMessage = signal<string>('');
  showInfo = signal<boolean>(false);

  ngOnInit(): void {
    // La música se gestiona globalmente en app.ts vía router
  }

  ngOnDestroy(): void {
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  /**
   * Maneja la acción elegida en el GameMenuComponent.
   * Navega a la ruta correspondiente según la acción recibida.
   *
   * @param action - Acción emitida por el menú. Puede contener datos extra separados por `:`.
   */
  onGameAction(action: string): void {
    if (action.startsWith('join-room:')) {
      const roomCode = action.split(':')[1];
      this.roomService.joinRoom(roomCode).subscribe({
        next: () => this.router.navigate(['/room', roomCode, 'lobby']),
        error: (err) => {
          console.error('Error al unirse a la sala:', err);
          this.popupTitle.set('Error');
          this.popupMessage.set('No se pudo encontrar la sala o la conexión falló.');
          this.showPopup.set(true);
        }
      });
      return;
    }

    const routes: Record<string, string> = {
      'create-private': '/room/create',
      'find-ranked': '/matchmaking',
    };

    if (routes[action]) {
       this.router.navigate([routes[action]]);
    }
  }
}
