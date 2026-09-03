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

  addPayment(): void {
    if (this.paymentForm.invalid || this.saving()) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const value = this.paymentForm.getRawValue();

    this.saving.set(true);
    this.formError.set('');

    this.debtService
      .addPayment(this.debtId, {
        amount: value.amount as number,
        paidDate: value.paidDate || undefined,
        notes: value.notes.trim() || undefined,
        categoryId: value.categoryId,
        paymentMethod: value.paymentMethod,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.paymentForm.reset({
            amount: null,
            paidDate: todayIsoDate(),
            notes: '',
            categoryId: this.defaultCategoryId(),
            paymentMethod: 'CASH',
          });
          this.loadDebt();
        },
        error: (err) =>
          this.formError.set(
            err?.error?.message?.[0] ??
              'No se pudo registrar el abono. Intenta de nuevo.',
          ),
      });
  }

  deletePayment(payment: DebtPayment): void {
    if (
      !window.confirm(
        `¿Eliminar el abono de ${this.formatAmount(payment.amount)}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    this.deletingPaymentId.set(payment.id);
    this.debtService
      .removePayment(this.debtId, payment.id)
      .pipe(finalize(() => this.deletingPaymentId.set(null)))
      .subscribe({
        next: () => this.loadDebt(),
        error: () => this.formError.set('No se pudo eliminar el abono.'),
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
        next: (debt) => this.debt.set(debt),
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
