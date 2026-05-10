import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  isLoading = false;
  successMessage = '';

  constructor(private fb: FormBuilder, private router: Router) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgotForm.valid) {
      this.isLoading = true;
      // TODO: Implementar llamada real al endpoint de recuperación de contraseña (Track C)
      console.log('Solicitud de recuperación para:', this.forgotForm.value.email);
      this.isLoading = false;
      this.successMessage = 'Si el correo existe, recibirás un enlace de recuperación pronto.';
      this.forgotForm.reset();
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
