import { Component, OnInit, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { DebtService } from '../../core/services/debt.service';
import { CategoryService } from '../../core/services/category.service';
import { CurrencyService } from '../../core/services/currency.service';
import { ToastService } from '../../core/services/toast.service';
import { confirmAction } from '../../core/utils/confirm';
import {
  formatAmount,
  formatDate,
  todayIsoDate,
  PAYMENT_METHOD_LABELS,
} from '../../core/utils/format';
import type {
  Category,
  PaymentMethod,
} from '../../core/models/expense.models';
import type { DebtDetail, DebtPayment } from '../../core/models/debt.models';

@Component({
  selector: 'app-debt-detail',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './debt-detail.html',
  styleUrl: './debt-detail.css',
})
export class DebtDetailComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly debtService = inject(DebtService);
  private readonly categoryService = inject(CategoryService);
  private readonly currencyService = inject(CurrencyService);
  private readonly toast = inject(ToastService);

  readonly formatAmount = (amount: string | number) =>
    formatAmount(amount, this.currencyService.currency());
  readonly formatDate = formatDate;

  private debtId: string;

  readonly debt = signal<DebtDetail | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deletingPaymentId = signal<string | null>(null);
  readonly formError = signal('');
  readonly loadError = signal('');
  readonly mode = signal<'none' | 'cuota' | 'abono'>('none');

  readonly categories = signal<Category[]>([]);
  readonly paymentMethods = Object.entries(PAYMENT_METHOD_LABELS) as [
    PaymentMethod,
    string,
  ][];

  readonly paymentForm = this.fb.group({
    amount: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],
    paidDate: [todayIsoDate()],
    notes: [''],
    categoryId: ['', [Validators.required]],
    paymentMethod: ['CASH' as PaymentMethod, [Validators.required]],
  });

  constructor() {
    this.debtId = this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.loadDebt();
    this.loadCategories();
  }

  readonly progressPercent = (): number => {
    const d = this.debt();

    if (!d) {
      return 0;
    }

    const total = Number(d.totalAmount);
    const paid = Number(d.paidAmount);

    if (total <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((paid / total) * 100));
  };

  readonly hasInstallment = (): boolean => {
    const d = this.debt();

    return !!d && !!d.installmentAmount;
  };

  readonly noCuotasLeft = (): boolean => {
    const d = this.debt();

    return (
      !!d &&
      d.totalInstallments !== null &&
      d.paidInstallments !== null &&
      d.paidInstallments >= d.totalInstallments
    );
  };

  selectMode(next: 'cuota' | 'abono'): void {
    if (this.saving()) {
      return;
    }

    this.formError.set('');
    this.paymentForm.reset({
      amount: next === 'cuota' ? this.installmentAmount() : null,
      paidDate: todayIsoDate(),
      notes: '',
      categoryId: this.defaultCategoryId(),
      paymentMethod: 'CASH',
    });
    this.mode.set(next);
  }

  closeMode(): void {
    this.mode.set('none');
    this.formError.set('');
  }

  private installmentAmount(): number | null {
    const amount = this.debt()?.installmentAmount;

    return amount ? Number(amount) : null;
  }

  submitAbono(): void {
    if (this.paymentForm.invalid || this.saving()) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const value = this.paymentForm.getRawValue();

    this.addPayment({
      amount: value.amount as number,
      paidDate: value.paidDate || undefined,
      notes: value.notes.trim() || undefined,
      categoryId: value.categoryId,
      paymentMethod: value.paymentMethod,
    });
  }

  payInstallment(): void {
    if (this.saving() || this.noCuotasLeft()) {
      return;
    }

    const amount = this.installmentAmount();

    if (!amount) {
      this.formError.set(
        'Esta deuda no tiene un valor de cuota definido. Edítala para configurarlo.',
      );
      return;
    }

    this.addPayment({
      amount,
      paidDate: this.paymentForm.controls.paidDate.value || undefined,
      notes: this.paymentForm.controls.notes.value.trim() || undefined,
      categoryId: this.paymentForm.controls.categoryId.value,
      paymentMethod: this.paymentForm.controls.paymentMethod.value,
      installment: true,
    });
  }

  private addPayment(
    payload: {
      amount: number;
      paidDate?: string;
      notes?: string;
      categoryId?: string;
      paymentMethod?: string;
      installment?: boolean;
    },
  ): void {
    this.saving.set(true);
    this.formError.set('');

    this.debtService
      .addPayment(this.debtId, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            payload.installment ? 'Cuota pagada' : 'Abono registrado',
            payload.installment
              ? `Se registró una cuota de ${this.formatAmount(payload.amount)}.`
              : `Se abonaron ${this.formatAmount(payload.amount)} a la deuda.`,
          );
          this.paymentForm.reset({
            amount: null,
            paidDate: todayIsoDate(),
            notes: '',
            categoryId: this.defaultCategoryId(),
            paymentMethod: 'CASH',
          });
          this.mode.set('none');
          this.loadDebt();
        },
        error: (err) => {
          const message =
            err?.error?.message?.[0] ??
            'No se pudo registrar el pago. Intenta de nuevo.';
          this.formError.set(message);
          this.toast.error('No se pudo registrar el pago', message);
        },
      });
  }

  async deletePayment(payment: DebtPayment): Promise<void> {
    const confirmed = await confirmAction({
      title: '¿Eliminar pago?',
      text: `¿Eliminar el pago de ${this.formatAmount(payment.amount)}? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.deletingPaymentId.set(payment.id);
    this.debtService
      .removePayment(this.debtId, payment.id)
      .pipe(finalize(() => this.deletingPaymentId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success(
            'Pago eliminado',
            this.formatAmount(payment.amount),
          );
          this.loadDebt();
        },
        error: (err) => {
          const message =
            err?.error?.message?.[0] ??
            'No se pudo eliminar el abono. Intenta de nuevo.';
          this.formError.set(message);
          this.toast.error('No se pudo eliminar el pago', message);
        },
      });
  }

  trackByPayment(_index: number, payment: DebtPayment): string {
    return payment.id;
  }

  private loadDebt(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.debtService
      .getById(this.debtId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (debt) => {
          this.debt.set(debt);

          if (this.mode() !== 'none') {
            this.paymentForm.controls.amount.setValue(
              this.mode() === 'cuota' ? this.installmentAmount() : null,
            );
            this.paymentForm.controls.categoryId.setValue(
              this.defaultCategoryId(),
            );
          }
        },
        error: () =>
          this.loadError.set('No se pudo cargar la deuda. Intenta de nuevo.'),
      });
  }

  private loadCategories(): void {
    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.paymentForm.controls.categoryId.setValue(this.defaultCategoryId());
      },
      error: () =>
        this.formError.set('No se pudieron cargar las categorías.'),
    });
  }

  private defaultCategoryId(): string {
    const category = this.categories().find(
      (c) => c.name.toLowerCase() === 'deudas',
    );

    return category?.id ?? this.categories()[0]?.id ?? '';
  }
}
