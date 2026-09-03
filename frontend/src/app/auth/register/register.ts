import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { CurrencyService } from '../../core/services/currency.service';
import {
  CURRENCY_LABELS,
  SUPPORTED_CURRENCIES,
  type Currency,
} from '../../core/models/auth.models';

type MatchState = 'hidden' | 'match' | 'no-match';

interface StrengthLabel {
  text: string;
  cls: string;
}

const STRENGTH_LABELS: Record<number, StrengthLabel> = {
  0: { text: '', cls: '' },
  1: { text: 'Muy débil', cls: 'weak' },
  2: { text: 'Débil', cls: 'medium' },
  3: { text: 'Buena', cls: 'good' },
  4: { text: 'Muy segura', cls: 'strong' },
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly currencyService = inject(CurrencyService);
  private readonly router = inject(Router);

  readonly currencies = SUPPORTED_CURRENCIES;
  readonly currencyLabels = CURRENCY_LABELS;

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);

  togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  toggleConfirm(): void {
    this.showConfirm.update((visible) => !visible);
  }

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      currency: [this.detectCurrency(), [Validators.required]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: (group) => this.passwordsMatch(group) },
  );

  private readonly passwordValue = toSignal(
    this.form.controls.password.valueChanges,
    { initialValue: '' },
  );

  private readonly confirmValue = toSignal(
    this.form.controls.confirmPassword.valueChanges,
    { initialValue: '' },
  );

  readonly strength = computed(() => {
    const password = this.passwordValue();

    if (!password) {
      return 0;
    }

    let score = 0;

    if (password.length >= 8) {
      score++;
    }
    if (/[A-Z]/.test(password)) {
      score++;
    }
    if (/[0-9]/.test(password)) {
      score++;
    }
    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    }

    return score;
  });

  readonly matchState = computed<MatchState>(() => {
    const confirm = this.confirmValue();

    if (!confirm) {
      return 'hidden';
    }

    return confirm === this.passwordValue() ? 'match' : 'no-match';
  });

  strengthLabel(): StrengthLabel {
    return STRENGTH_LABELS[this.strength()];
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password, currency } = this.form.getRawValue();

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.register({ name, email, password, currency }).subscribe({
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

  private detectCurrency(): Currency {
    return this.currencyService.currency();
  }

  private passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword
      ? { passwordsMismatch: true }
      : null;
  }
}
