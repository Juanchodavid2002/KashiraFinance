import { Component, OnInit, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { SavingsService } from '../../core/services/savings.service';
import { CurrencyService } from '../../core/services/currency.service';
import { ToastService } from '../../core/services/toast.service';
import { confirmAction } from '../../core/utils/confirm';
import { formatAmount, formatDate } from '../../core/utils/format';
import type {
  SavingsDetail,
  SavingsMovement,
} from '../../core/models/savings.models';

@Component({
  selector: 'app-savings-detail',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './savings-detail.html',
  styleUrl: './savings-detail.css',
})
export class SavingsDetailComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly savingsService = inject(SavingsService);
  private readonly currencyService = inject(CurrencyService);
  private readonly toast = inject(ToastService);

  readonly formatAmount = (amount: string | number) =>
    formatAmount(amount, this.currencyService.currency());
  readonly formatDate = formatDate;

  private goalId: string;

  readonly goal = signal<SavingsDetail | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deletingMovementId = signal<string | null>(null);
  readonly formError = signal('');
  readonly loadError = signal('');
  readonly mode = signal<'none' | 'abonar' | 'retirar'>('none');

  readonly abonarForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    notes: [''],
  });

  readonly retirarForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    notes: [''],
  });

  constructor() {
    this.goalId = this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.loadGoal();
  }

  readonly isEmpty = (): boolean => {
    const g = this.goal();

    return !!g && Number(g.balance) <= 0;
  };

  selectMode(next: 'abonar' | 'retirar'): void {
    if (this.saving()) {
      return;
    }

    this.formError.set('');
    this.abonarForm.reset({ amount: null, notes: '' });
    this.retirarForm.reset({ amount: null, notes: '' });
    this.mode.set(next);
  }

  closeMode(): void {
    this.mode.set('none');
    this.formError.set('');
  }

  submitAbonar(): void {
    if (this.abonarForm.invalid || this.saving()) {
      this.abonarForm.markAllAsTouched();
      return;
    }

    const value = this.abonarForm.getRawValue();

    this.saving.set(true);
    this.formError.set('');

    this.savingsService
      .deposit(this.goalId, {
        amount: value.amount as number,
        notes: value.notes.trim() || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            'Abono registrado',
            `Se abonaron ${this.formatAmount(value.amount ?? 0)}.`,
          );
          this.abonarForm.reset({ amount: null, notes: '' });
          this.mode.set('none');
          this.loadGoal();
        },
        error: (err) => {
          const message =
            err?.error?.message?.[0] ??
            'No se pudo registrar el abono. Intenta de nuevo.';
          this.formError.set(message);
          this.toast.error('No se pudo registrar el abono', message);
        },
      });
  }

  submitRetirar(): void {
    if (this.retirarForm.invalid || this.saving()) {
      this.retirarForm.markAllAsTouched();
      return;
    }

    const value = this.retirarForm.getRawValue();

    this.saving.set(true);
    this.formError.set('');

    this.savingsService
      .withdraw(this.goalId, {
        amount: value.amount as number,
        notes: value.notes.trim() || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            'Retiro registrado',
            `Se retiraron ${this.formatAmount(value.amount ?? 0)}.`,
          );
          this.retirarForm.reset({ amount: null, notes: '' });
          this.mode.set('none');
          this.loadGoal();
        },
        error: (err) => {
          const message =
            err?.error?.message?.[0] ??
            'No se pudo registrar el retiro. Intenta de nuevo.';
          this.formError.set(message);
          this.toast.error('No se pudo registrar el retiro', message);
        },
      });
  }

  async deleteMovement(movement: SavingsMovement): Promise<void> {
    const confirmed = await confirmAction({
      title: '¿Eliminar movimiento?',
      text: `¿Eliminar el movimiento de ${this.formatAmount(movement.amount)}? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.deletingMovementId.set(movement.id);
    this.savingsService
      .removeMovement(this.goalId, movement.id)
      .pipe(finalize(() => this.deletingMovementId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success(
            'Movimiento eliminado',
            this.formatAmount(movement.amount),
          );
          this.loadGoal();
        },
        error: () => {
          this.formError.set(
            'No se pudo eliminar el movimiento. Intenta de nuevo.',
          );
          this.toast.error('No se pudo eliminar el movimiento');
        },
      });
  }

  trackByMovement(_index: number, movement: SavingsMovement): string {
    return movement.id;
  }

  private loadGoal(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.savingsService
      .getDetail(this.goalId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (goal) => this.goal.set(goal),
        error: () =>
          this.loadError.set(
            'No se pudo cargar el ahorro. Intenta de nuevo.',
          ),
      });
  }
}
