import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: (group) => this.passwordsMatch(group) },
  );

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.register({ name, email, password }).subscribe({
      next: () => {
        void this.router.navigate(['/app/dashboard']);
      },
      error: (error: { status: number }) => {
        this.errorMessage.set(
          error.status === 409
            ? 'Este correo ya está registrado'
            : 'No se pudo crear la cuenta. Intenta nuevamente.',
        );
        this.submitting.set(false);
      },
    });
  }

  private passwordsMatch(group: {
    value: { password: string; confirmPassword: string };
  }): object | null {
    const { password, confirmPassword } = group.value;
    return password === confirmPassword ? null : { passwordsMismatch: true };
  }
}
