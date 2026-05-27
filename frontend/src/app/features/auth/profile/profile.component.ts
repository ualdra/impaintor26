import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameHistoryEntry, GameHistoryService } from '../../../core/services/game-history.service';
import { LeaderboardEntry, LeaderboardService } from '../../../core/services/leaderboard.service';
import { AuthService } from '../../../core/services/auth.service';
import { UpdateMeRequest, UserService } from '../../../core/services/user.service';

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

interface PersistedProfileSnapshot {
  username: string;
  countryCode: string;
  biography: string;
  avatarData: string;
}

interface CountryOption {
  code: string;
  label: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly gameHistoryService = inject(GameHistoryService);
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  /** true = estamos viendo el perfil de otro usuario (modo solo lectura) */
  readonly isViewingOther = signal<boolean>(false);
  readonly viewedUsername = signal<string>('');

  private originalProfile: PersistedProfileSnapshot = {
    username: '',
    countryCode: '',
    biography: '',
    avatarData: '',
  };

  readonly europeanCountries: CountryOption[] = [
    { code: 'AL', label: 'Albania' },
    { code: 'DE', label: 'Alemania' },
    { code: 'AD', label: 'Andorra' },
    { code: 'AM', label: 'Armenia' },
    { code: 'AT', label: 'Austria' },
    { code: 'AZ', label: 'Azerbaiyán' },
    { code: 'BE', label: 'Bélgica' },
    { code: 'BY', label: 'Bielorrusia' },
    { code: 'BA', label: 'Bosnia y Herzegovina' },
    { code: 'BG', label: 'Bulgaria' },
    { code: 'CY', label: 'Chipre' },
    { code: 'HR', label: 'Croacia' },
    { code: 'DK', label: 'Dinamarca' },
    { code: 'SK', label: 'Eslovaquia' },
    { code: 'SI', label: 'Eslovenia' },
    { code: 'ES', label: 'España' },
    { code: 'EE', label: 'Estonia' },
    { code: 'FI', label: 'Finlandia' },
    { code: 'FR', label: 'Francia' },
    { code: 'GE', label: 'Georgia' },
    { code: 'GR', label: 'Grecia' },
    { code: 'HU', label: 'Hungría' },
    { code: 'IE', label: 'Irlanda' },
    { code: 'IS', label: 'Islandia' },
    { code: 'IT', label: 'Italia' },
    { code: 'KZ', label: 'Kazajistán' },
    { code: 'XK', label: 'Kosovo' },
    { code: 'LV', label: 'Letonia' },
    { code: 'LI', label: 'Liechtenstein' },
    { code: 'LT', label: 'Lituania' },
    { code: 'LU', label: 'Luxemburgo' },
    { code: 'MK', label: 'Macedonia del Norte' },
    { code: 'MT', label: 'Malta' },
    { code: 'MD', label: 'Moldavia' },
    { code: 'MC', label: 'Mónaco' },
    { code: 'ME', label: 'Montenegro' },
    { code: 'NO', label: 'Noruega' },
    { code: 'NL', label: 'Países Bajos' },
    { code: 'PL', label: 'Polonia' },
    { code: 'PT', label: 'Portugal' },
    { code: 'GB', label: 'Reino Unido' },
    { code: 'CZ', label: 'República Checa' },
    { code: 'RO', label: 'Rumanía' },
    { code: 'RU', label: 'Rusia' },
    { code: 'SM', label: 'San Marino' },
    { code: 'RS', label: 'Serbia' },
    { code: 'SE', label: 'Suecia' },
    { code: 'CH', label: 'Suiza' },
    { code: 'TR', label: 'Turquía' },
    { code: 'UA', label: 'Ucrania' },
    { code: 'VA', label: 'Vaticano' },
  ];

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

  readonly gamesPlayed = signal<number>(0);
  readonly gamesWon = signal<number>(0);
  readonly elo = signal<number>(1000);
  readonly profileError = signal<string>('');
  readonly profileSuccess = signal<string>('');
  readonly isSaving = signal<boolean>(false);

  constructor() {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.isViewingOther.set(true);
      this.loadPublicProfile(Number(userId));
    } else {
      this.isViewingOther.set(false);
      this.loadProfile();
      this.loadHistory();
    }
    this.loadLeaderboard();
  }

  private loadProfile(): void {
    this.userService.getMe().subscribe({
      next: (user) => {
        const countryCode = user.countryCode ?? '';
        const biography = user.biography ?? '';
        const avatarData = user.avatarData ?? '';

        this.originalProfile = {
          username: user.username ?? '',
          countryCode,
          biography,
          avatarData,
        };

        this.gamesPlayed.set(user.gamesPlayed ?? 0);
        this.gamesWon.set(user.gamesWon ?? 0);
        this.elo.set(user.elo ?? 1000);

        this.profileDraft.update((draft) => ({
          ...draft,
          avatarPreview: avatarData,
          nombreVisible: user.username ?? '',
          correoElectronico: user.email ?? '',
          pais: countryCode,
          biografia: biography,
        }));

        this.authService.syncCurrentUser({
          ...user,
          avatarData: avatarData || undefined,
          countryCode: countryCode || undefined,
          biography: biography || undefined,
          createdAt: user.createdAt ?? this.authService.getCurrentUser()?.createdAt ?? '',
        });
      },
      error: () => {
        this.profileError.set('No se pudo cargar tu perfil ahora mismo.');
      },
    });
  }

  private loadPublicProfile(userId: number): void {
    this.userService.getPublicProfile(userId).subscribe({
      next: (user) => {
        this.viewedUsername.set(user.username ?? '');
        this.gamesPlayed.set(user.gamesPlayed ?? 0);
        this.gamesWon.set(user.gamesWon ?? 0);
        this.elo.set(user.elo ?? 1000);

        this.profileDraft.update((draft) => ({
          ...draft,
          avatarPreview: user.avatarData ?? '',
          nombreVisible: user.username ?? '',
          correoElectronico: '',
          pais: user.countryCode ?? '',
          biografia: user.biography ?? '',
        }));
      },
      error: () => {
        this.profileError.set('No se pudo cargar el perfil de este usuario.');
      },
    });
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

  viewUserProfile(userId: number): void {
    this.router.navigate(['/profile', userId]);
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.profileError.set('');
      this.profileSuccess.set('');
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
    this.profileError.set('');
    this.profileSuccess.set('');

    const newUsername = current.nombreVisible.trim();
    const newPassword = current.nuevaContrasena.trim();
    const newCountryCode = current.pais.trim().toUpperCase();
    const newBiography = current.biografia.trim();
    const newAvatarData = current.avatarPreview.trim();

    if (newPassword && newPassword !== current.repetirContrasena.trim()) {
      this.profileError.set('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    if (!newUsername) {
      this.profileError.set('El nombre visible no puede estar vacío.');
      return;
    }

    const payload: UpdateMeRequest = {};

    if (newUsername !== this.originalProfile.username) {
      payload.username = newUsername;
    }

    if (newPassword) {
      payload.password = newPassword;
    }

    if (newCountryCode !== this.originalProfile.countryCode) {
      payload.countryCode = newCountryCode;
    }

    if (newBiography !== this.originalProfile.biography) {
      payload.biography = newBiography;
    }

    if (newAvatarData !== this.originalProfile.avatarData) {
      payload.avatarData = newAvatarData;
    }

    if (
      payload.username === undefined &&
      payload.password === undefined &&
      payload.countryCode === undefined &&
      payload.biography === undefined &&
      payload.avatarData === undefined
    ) {
      this.profileSuccess.set('No hay cambios pendientes para guardar.');
      return;
    }

    this.isSaving.set(true);
    this.userService.updateMe(payload).subscribe({
      next: (user) => {
        // Usar los valores resueltos: primero la respuesta del servidor,
        // luego lo que enviamos, y como último recurso lo que había en el draft.
        const resolvedCountryCode = (user.countryCode != null && user.countryCode !== '')
          ? user.countryCode
          : (payload.countryCode ?? this.profileDraft().pais);
        const resolvedBiography = (user.biography != null && user.biography !== '')
          ? user.biography
          : (payload.biography ?? this.profileDraft().biografia);
        const resolvedAvatarData = (user.avatarData != null && user.avatarData !== '')
          ? user.avatarData
          : (payload.avatarData ?? this.profileDraft().avatarPreview);

        this.originalProfile = {
          username: user.username ?? '',
          countryCode: resolvedCountryCode ?? '',
          biography: resolvedBiography ?? '',
          avatarData: resolvedAvatarData ?? '',
        };

        this.gamesPlayed.set(user.gamesPlayed ?? 0);
        this.gamesWon.set(user.gamesWon ?? 0);
        this.elo.set(user.elo ?? 1000);

        this.profileDraft.set({
          ...this.profileDraft(),
          avatarPreview: resolvedAvatarData ?? '',
          nombreVisible: user.username ?? '',
          correoElectronico: user.email ?? '',
          pais: resolvedCountryCode ?? '',
          biografia: resolvedBiography ?? '',
          contrasenaActual: '',
          nuevaContrasena: '',
          repetirContrasena: '',
        });

        // Guardar en localStorage con los valores resueltos (no los del raw user)
        this.authService.syncCurrentUser({
          ...user,
          countryCode: resolvedCountryCode ?? undefined,
          biography: resolvedBiography ?? undefined,
          avatarData: resolvedAvatarData ?? undefined,
          createdAt: user.createdAt ?? this.authService.getCurrentUser()?.createdAt ?? '',
        });

        this.profileSuccess.set('Cambios guardados correctamente.');
        this.isSaving.set(false);
      },
      error: (err) => {
        const backendMessage = err?.error?.message;
        this.profileError.set(
          typeof backendMessage === 'string' && backendMessage.trim()
            ? backendMessage
            : 'No se pudieron guardar los cambios.'
        );
        this.isSaving.set(false);
      },
    });
  }
}
