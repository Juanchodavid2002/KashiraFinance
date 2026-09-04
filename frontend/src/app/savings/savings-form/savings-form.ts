import { Component, OnInit, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { SavingsService } from '../../core/services/savings.service';
import { CurrencyService } from '../../core/services/currency.service';
import { ToastService } from '../../core/services/toast.service';
import { todayIsoDate } from '../../core/utils/format';
import { formatAmount } from '../../core/utils/format';

@Component({
  selector: 'app-savings-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './savings-form.html',
  styleUrl: './savings-form.css',
})
export class SavingsForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly savingsService = inject(SavingsService);
  private readonly currencyService = inject(CurrencyService);
  private readonly toast = inject(ToastService);

  savingsId: string | null = null;
  currentBalanceNumber: number | null = null;

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly formError = signal('');
  readonly isEdit = signal(false);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    targetAmount: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],
    deadline: [''],
    notes: [''],
  });

  readonly currentBalance = (): string =>
    this.currentBalanceNumber !== null
      ? formatAmount(this.currentBalanceNumber, this.currencyService.currency())
      : '';

  readonly targetLowError = (): boolean => {
    if (this.currentBalanceNumber === null) {
      return false;
    }

    const target = this.form.controls.targetAmount.value;

    if (target === null) {
      return false;
    }

    return target < this.currentBalanceNumber;
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      return;
    }

    this.savingsId = id;
    this.isEdit.set(true);
    this.loading.set(true);

    this.savingsService
      .getDetail(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (goal) => {
          this.currentBalanceNumber = Number(goal.balance);
          this.form.patchValue({
            name: goal.name,
            targetAmount: Number(goal.targetAmount),
            deadline: goal.deadline ? goal.deadline.slice(0, 10) : '',
            notes: goal.notes ?? '',
          });
        },
        error: () =>
          this.formError.set('No se pudo cargar el ahorro solicitado.'),
      });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      name: value.name.trim(),
      targetAmount: value.targetAmount as number,
      deadline: value.deadline || undefined,
      notes: value.notes.trim() || undefined,
    };

    this.saving.set(true);
    this.formError.set('');

    const request =
      this.savingsId !== null
        ? this.savingsService.update(this.savingsId, payload)
        : this.savingsService.create(payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.toast.success(
          this.savingsId !== null ? 'Ahorro actualizado' : 'Ahorro creado',
          value.name.trim(),
        );
        void this.router.navigate(
          this.savingsId !== null
            ? ['/app/savings', this.savingsId]
            : ['/app/savings'],
        );
      },
      error: (err) => {
        const message =
          err?.error?.message?.[0] ??
          'No se pudo guardar el ahorro. Revisa los datos e intenta de nuevo.';
        this.formError.set(message);
        this.toast.error('No se pudo guardar el ahorro', message);
      },
    });
  }

  invalid(
    controlName: 'name' | 'targetAmount' | 'deadline',
  ): boolean {
    const control = this.form.controls[controlName];

    return control.invalid && (control.touched || control.dirty);
  }
}
