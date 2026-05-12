import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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

  readonly historialPartidas = signal<string[]>([]);

  readonly clasificacion = signal<string[]>([]);

  goBackToMainMenu(): void {
    this.router.navigate(['/main_menu']);
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
