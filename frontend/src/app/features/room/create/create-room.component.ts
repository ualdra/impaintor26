import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameBackgroundComponent } from '../../../shared/components/game-background/game-background.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RoomService, RoomConfig } from '../../../core/services/room.service';

@Component({
  selector: 'app-create-room',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GameBackgroundComponent],
  templateUrl: './create-room.component.html',
  styleUrls: ['./create-room.component.css']
})
export class CreateRoomComponent {
  private fb = inject(FormBuilder);
  private roomService = inject(RoomService);
  private router = inject(Router);

  roomForm: FormGroup = this.fb.group({
    drawingTime: [30, [Validators.required, Validators.min(10), Validators.max(120)]],
    impostorLives: [1, [Validators.required, Validators.min(1), Validators.max(5)]]
  });

  isLoading = false;
  errorMessage = '';

  onSubmit() {
    if (this.roomForm.invalid) {
      this.roomForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const config: RoomConfig = this.roomForm.value;

    this.roomService.createRoom(config).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        // Dependiendo del backend puede venir como roomCode o code
        const code = response.roomCode || response.code || Object.values(response)[0];
        // Idealmente redirigir al lobby, pero si no está usamos la misma ruta que hay disponible o asumimos q se hará
        this.router.navigate(['/room', code, 'lobby']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error al crear la sala / Error creating room';
      }
    });
  }

  cancel() {
    this.router.navigate(['/main_menu']);
  }
}
