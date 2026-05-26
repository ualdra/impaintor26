import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameHistoryEntry, GameHistoryService } from '../../../core/services/game-history.service';
import { LeaderboardEntry, LeaderboardService } from '../../../core/services/leaderboard.service';
import { AuthService } from '../../../core/services/auth.service';

interface ProfileDraft {
  avatarPreview: string;
  nombreVisible: string;
  correoElectronico: string;
  contrasenaActual: string;
  nuevaContrasena: string;
  repetirContrasena: string;
  pais: string;
  biografia: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
  private readonly router = inject(Router);
  private readonly gameHistoryService = inject(GameHistoryService);
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly authService = inject(AuthService);

  readonly profileDraft = signal<ProfileDraft>({
    avatarPreview: '',
    nombreVisible: '',
    correoElectronico: '',
    contrasenaActual: '',
    nuevaContrasena: '',
    repetirContrasena: '',
    pais: '',
    biografia: '',
  });

  showContrasenaActual = false;
  showNuevaContrasena = false;
  showRepetirContrasena = false;

  readonly historialPartidas = signal<GameHistoryEntry[]>([]);

  readonly leaderboardEntries = signal<LeaderboardEntry[]>([]);

  readonly clasificacion = signal<string[]>([]);

  constructor() {
    this.loadHistory();
    this.loadLeaderboard();
  }

  private loadHistory(): void {
    this.gameHistoryService.getHistory(0, 50).subscribe({
      next: (response: { content: GameHistoryEntry[] }) => {
        this.historialPartidas.set(response.content ?? []);
      },
      error: () => {
        this.historialPartidas.set([]);
      },
    });
  }

  private loadLeaderboard(): void {
    this.leaderboardService.getLeaderboard(0, 10).subscribe({
      next: (response: { content: LeaderboardEntry[] }) => {
        this.leaderboardEntries.set(response.content ?? []);
      },
      error: () => {
        this.leaderboardEntries.set([]);
      },
    });
  }

  formatRole(role: string): string {
    return role === 'PAINTER' ? 'Paintor' : 'Impaintor';
  }

  formatDate(playedAt: string): string {
    return new Date(playedAt).toLocaleDateString('es-ES');
  }

  formatEloChange(eloChange: number | null): string {
    if (eloChange == null) {
      return '0';
    }

    return eloChange > 0 ? `+${eloChange}` : `${eloChange}`;
  }

  goBackToMainMenu(): void {
    this.router.navigate(['/main_menu']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const current = this.profileDraft();
      this.profileDraft.set({
        ...current,
        avatarPreview: String(reader.result ?? ''),
      });
    };
    reader.readAsDataURL(file);
  }

  toggleContrasenaActual(): void {
    this.showContrasenaActual = !this.showContrasenaActual;
  }

  toggleNuevaContrasena(): void {
    this.showNuevaContrasena = !this.showNuevaContrasena;
  }

  toggleRepetirContrasena(): void {
    this.showRepetirContrasena = !this.showRepetirContrasena;
  }

  onSaveProfile(): void {
    const current = this.profileDraft();
    this.profileDraft.set({
      ...current,
      contrasenaActual: '',
      nuevaContrasena: '',
      repetirContrasena: '',
    });
  }
}
