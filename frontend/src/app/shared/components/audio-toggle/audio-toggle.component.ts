import { Component, inject } from '@angular/core';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-audio-toggle',
  standalone: true,
  template: `
    <button
      class="audio-toggle-btn"
      [class.muted]="audioService.isMuted()"
      (click)="audioService.toggleMute()"
      [attr.aria-label]="audioService.isMuted() ? 'Activar música' : 'Silenciar música'"
      title="Alternar música de fondo"
    >
      @if (audioService.isMuted()) {
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume-x"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>
      } @else {
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume-2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
      }
    </button>
  `,
  styles: [`
    .audio-toggle-btn {
      position: fixed;
      bottom: 1.5rem;
      left: 1.5rem; /* Puesto a la izquierda para no tapar el panel del impostor que está a la derecha */
      z-index: 9999;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(26, 10, 46, 0.7);
      border: 1px solid rgba(124, 77, 255, 0.4);
      color: #d0b4ff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
    }

    .audio-toggle-btn:hover {
      background: rgba(45, 16, 80, 0.8);
      border-color: #7c4dff;
      transform: scale(1.05);
    }

    .audio-toggle-btn.muted {
      color: rgba(208, 180, 255, 0.5);
      border-color: rgba(124, 77, 255, 0.2);
    }
  `]
})
export class AudioToggleComponent {
  protected readonly audioService = inject(AudioService);
}
