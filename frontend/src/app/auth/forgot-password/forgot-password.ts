import {
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

type Step = 'email' | 'code' | 'new-password' | 'done';

const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrls: ['../login/login.css', './forgot-password.css'],
})
export class ForgotPassword implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly codeLength = CODE_LENGTH;

  readonly step = signal<Step>('email');
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly userEmail = signal('');
  readonly resendIn = signal(0);

  private readonly pendingCode = signal('');
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  private readonly digitInputs =
    viewChildren<ElementRef<HTMLInputElement>>('digit');

  isCodeComplete(): boolean {
    return this.digits.every((control) => /^\d$/.test(control.value));
  }

  readonly digits = Array.from({ length: CODE_LENGTH }, () =>
    this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^\d$/),
    ]),
  );

  readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly newPasswordForm = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: (group) => this.passwordsMatch(group) },
  );

  ngOnDestroy(): void {
    this.stopCooldown();
  }

  togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  onSubmitEmail(): void {
    if (this.emailForm.invalid || this.submitting()) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.forgotPassword(this.emailForm.getRawValue().email).subscribe({
      next: ({ message }) => {
        this.userEmail.set(this.emailForm.getRawValue().email.trim().toLowerCase());
        this.infoMessage.set(message);
        this.step.set('code');
        this.startCooldown();
        this.submitting.set(false);
        queueMicrotask(() => this.digitInputs()[0]?.nativeElement.focus());
      },
      error: (error: object) => {
        this.errorMessage.set(
          this.extractApiError(error, 'No se pudo enviar el código. Intenta nuevamente.'),
        );
        this.submitting.set(false);
      },
    });
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');
    const digitsToWrite = raw.slice(0, CODE_LENGTH - index).split('');

    digitsToWrite.forEach((char, offset) => {
      this.digits[index + offset].setValue(char);
    });

    for (let position = index + digitsToWrite.length; position < CODE_LENGTH; position++) {
      this.digits[position].setValue('');
    }

    this.focusDigit(Math.min(index + digitsToWrite.length, CODE_LENGTH - 1));
  }

  onDigitKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      event.preventDefault();

      if (this.digits[index].value) {
        this.digits[index].setValue('');
        return;
      }

      if (index > 0) {
        this.digits[index - 1].setValue('');
        this.focusDigit(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusDigit(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault();
      this.focusDigit(index + 1);
    }
  }

  onCodePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '') ?? '';

    if (!pasted) {
      return;
    }

    pasted
      .slice(0, CODE_LENGTH)
      .split('')
      .forEach((char, position) => this.digits[position].setValue(char));

    this.focusDigit(Math.min(pasted.length, CODE_LENGTH - 1));
  }

  onVerifyCode(event?: Event): void {
    event?.preventDefault();

    const code = this.digits.map((control) => control.value).join('');

    if (code.length !== CODE_LENGTH || !this.isCodeComplete() || this.submitting()) {
      this.digits.forEach((control) => control.markAsTouched());
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.verifyResetCode({ email: this.userEmail(), code }).subscribe({
      next: () => {
        this.pendingCode.set(code);
        this.step.set('new-password');
        this.submitting.set(false);
      },
      error: (error: object) => {
        this.errorMessage.set(
          this.extractApiError(error, 'No se pudo verificar el código. Intenta nuevamente.'),
        );
        this.submitting.set(false);
      },
    });
  }

  onResetPassword(): void {
    if (this.newPasswordForm.invalid || this.submitting()) {
      this.newPasswordForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { password } = this.newPasswordForm.getRawValue();

    this.authService
      .resetPassword({
        email: this.userEmail(),
        code: this.pendingCode(),
        newPassword: password,
      })
      .subscribe({
        next: ({ message }) => {
          this.infoMessage.set(message);
          this.step.set('done');
          this.submitting.set(false);
        },
        error: (error: object) => {
          this.errorMessage.set(
            this.extractApiError(error, 'No se pudo actualizar la contraseña. Intenta nuevamente.'),
          );
          this.submitting.set(false);
        },
      });
  }

  async onResend(): Promise<void> {
    if (this.resendIn() > 0 || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.forgotPassword(this.userEmail()).subscribe({
      next: () => {
        this.digits.forEach((control) => control.setValue(''));
        this.infoMessage.set('Te enviamos un nuevo código. Revisa tu bandeja de entrada.');
        this.startCooldown();
        this.submitting.set(false);
        this.focusDigit(0);
      },
      error: (error: object) => {
        this.errorMessage.set(
          this.extractApiError(error, 'No se pudo reenviar el código. Intenta nuevamente.'),
        );
        this.submitting.set(false);
      },
    });
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  maskEmail(): string {
    const [local, domain] = this.userEmail().split('@');

    if (!domain) {
      return this.userEmail();
    }

    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
  }

  private focusDigit(index: number): void {
    this.digitInputs()[index]?.nativeElement.focus();
  }

  private startCooldown(): void {
    this.stopCooldown();
    this.resendIn.set(RESEND_COOLDOWN_SECONDS);
    this.cooldownInterval = setInterval(() => {
      const remaining = this.resendIn() - 1;

      if (remaining <= 0) {
        this.stopCooldown();
        return;
      }

      this.resendIn.set(remaining);
    }, 1000);
  }

  private stopCooldown(): void {
    if (this.cooldownInterval !== null) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }

    this.resendIn.set(0);
  }

  private extractApiError(error: unknown, fallback: string): string {
    const message = (error as { error?: { message?: unknown } })?.error?.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (Array.isArray(message) && message.length > 0) {
      return String(message[0]);
    }

    return fallback;
  }

  private passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword
      ? { passwordsMismatch: true }
      : null;
  }
}
