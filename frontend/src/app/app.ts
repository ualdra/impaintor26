import { Component, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AudioService } from './core/services/audio.service';
import { AudioToggleComponent } from './shared/components/audio-toggle/audio-toggle.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AudioToggleComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  private readonly router = inject(Router);
  private readonly audioService = inject(AudioService);

  ngOnInit(): void {
    // Escuchar cambios de ruta para reproducir la música correspondiente a menús
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects.toLowerCase();
        
        // Si estamos en una partida activa, el GameComponent gestiona la música
        if (url.includes('/game')) {
          return;
        }

        // Si estamos en matchmaking
        if (url.includes('/matchmaking')) {
          this.audioService.playTrack('matchmaking');
          return;
        }

        // Para cualquier otra ruta (landing, login, lobby, home, profile)
        this.audioService.playTrack('main_menu');
      });
  }
}
