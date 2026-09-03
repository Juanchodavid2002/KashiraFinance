import { Component, OnInit, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EnvelopeService } from '../../core/services/envelope.service';
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
import { ENVELOPE_FREQUENCY_LABELS } from '../../core/models/envelope.models';
import type {
  EnvelopeDetail,
  EnvelopeMovement,
} from '../../core/models/envelope.models';
import type {
  Category,
  PaymentMethod,
} from '../../core/models/expense.models';

@Component({
  selector: 'app-envelope-detail',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './envelope-detail.html',
  styleUrl: './envelope-detail.css',
})
export class EnvelopeDetailComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly envelopeService = inject(EnvelopeService);
  private readonly categoryService = inject(CategoryService);
  private readonly currencyService = inject(CurrencyService);
  private readonly toast = inject(ToastService);

  readonly formatAmount = (amount: string | number) =>
    formatAmount(amount, this.currencyService.currency());
  readonly formatDate = formatDate;
  readonly frequencyLabel = ENVELOPE_FREQUENCY_LABELS;

  private envelopeId: string;

  readonly envelope = signal<EnvelopeDetail | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deletingMovementId = signal<string | null>(null);
  readonly formError = signal('');
  readonly loadError = signal('');
  readonly mode = signal<'none' | 'aportar' | 'gastar'>('none');

  readonly categories = signal<Category[]>([]);
  readonly paymentMethods = Object.entries(PAYMENT_METHOD_LABELS) as [
    PaymentMethod,
    string,
  ][];

  readonly aportarForm = this.fb.group({
    amount: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],
    notes: [''],
  });

  readonly gastarForm = this.fb.group({
    amount: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],
    description: [''],
    expenseDate: [todayIsoDate()],
    categoryId: ['', [Validators.required]],
    paymentMethod: ['CASH' as PaymentMethod, [Validators.required]],
    notes: [''],
  });

  constructor() {
    this.envelopeId = this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.loadEnvelope();
    this.loadCategories();
  }

  selectMode(next: 'aportar' | 'gastar'): void {
    if (this.saving()) {
      return;
    }

    this.formError.set('');
    this.mode.set(next);

    if (next === 'gastar') {
      this.gastarForm.reset({
        amount: null,
        description: '',
        expenseDate: todayIsoDate(),
        categoryId: this.envelopeCategoryId(),
        paymentMethod: 'CASH',
        notes: '',
      });
    } else {
      this.aportarForm.reset({ amount: null, notes: '' });
    }
  }

  closeMode(): void {
    this.mode.set('none');
    this.formError.set('');
  }

  submitAportar(): void {
    if (this.aportarForm.invalid || this.saving()) {
      this.aportarForm.markAllAsTouched();
      return;
    }

    const value = this.aportarForm.getRawValue();

    this.envelopeService
      .contribute(this.envelopeId, {
        amount: value.amount as number,
        notes: value.notes.trim() || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            'Aporte registrado',
            `Se sumó ${this.formatAmount(value.amount as number)} al sobre.`,
          );
          this.aportarForm.reset({ amount: null, notes: '' });
          this.mode.set('none');
          this.loadEnvelope();
        },
        error: (err) => {
          const message =
            err?.error?.message?.[0] ??
            'No se pudo registrar el aporte. Intenta de nuevo.';
          this.formError.set(message);
          this.toast.error('No se pudo registrar el aporte', message);
        },
      });
  }

  submitGastar(): void {
    if (this.gastarForm.invalid || this.saving()) {
      this.gastarForm.markAllAsTouched();
      return;
    }

    const value = this.gastarForm.getRawValue();

    this.envelopeService
      .spend(this.envelopeId, {
        amount: value.amount as number,
        description: value.description.trim() || undefined,
        expenseDate: value.expenseDate || undefined,
        categoryId: value.categoryId,
        paymentMethod: value.paymentMethod,
        notes: value.notes.trim() || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            'Gasto registrado',
            `Se gastaron ${this.formatAmount(
              value.amount as number,
            )} desde el sobre.`,
          );
          this.gastarForm.reset({
            amount: null,
            description: '',
            expenseDate: todayIsoDate(),
            categoryId: this.envelopeCategoryId(),
            paymentMethod: 'CASH',
            notes: '',
          });
          this.mode.set('none');
          this.loadEnvelope();
        },
        error: (err) => {
          const message =
            err?.error?.message?.[0] ??
            'No se pudo registrar el gasto. Intenta de nuevo.';
          this.formError.set(message);
          this.toast.error('No se pudo registrar el gasto', message);
        },
      });
  }

  async deleteMovement(movement: EnvelopeMovement): Promise<void> {
    const confirmed = await confirmAction({
      title: '¿Eliminar movimiento?',
      text: `¿Eliminar el ${movement.type === 'CONTRIBUTE' ? 'aporte' : 'gasto'} de ${this.formatAmount(
        movement.amount,
      )}? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.deletingMovementId.set(movement.id);
    this.envelopeService
      .removeMovement(this.envelopeId, movement.id)
      .pipe(finalize(() => this.deletingMovementId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success(
            'Movimiento eliminado',
            this.formatAmount(movement.amount),
          );
          this.loadEnvelope();
        },
        error: (err) => {
          const message =
            err?.error?.message?.[0] ??
            'No se pudo eliminar el movimiento. Intenta de nuevo.';
          this.formError.set(message);
          this.toast.error('No se pudo eliminar el movimiento', message);
        },
      });
  }

  trackByMovement(_index: number, movement: EnvelopeMovement): string {
    return movement.id;
  }

  balancePercent(): number {
    const envelope = this.envelope();
    const balance = Number(envelope?.balance ?? 0);
    const amount = Number(envelope?.amount ?? 0);

    if (amount <= 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, Math.round((balance / amount) * 100)));
  }

  isEmpty(): boolean {
    return Number(this.envelope()?.balance ?? 0) <= 0;
  }

  private loadEnvelope(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.envelopeService
      .getDetail(this.envelopeId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (envelope) => this.envelope.set(envelope),
        error: () =>
          this.loadError.set(
            'No se pudo cargar el sobre. Intenta de nuevo.',
          ),
      });
  }

  private loadCategories(): void {
    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        if (this.mode() === 'gastar') {
          this.gastarForm.controls.categoryId.setValue(
            this.envelopeCategoryId(),
          );
        }
      },
      error: () =>
        this.formError.set('No se pudieron cargar las categorías.'),
    });
  }

  private envelopeCategoryId(): string {
    const category = this.categories().find(
      (c) => c.name.toLowerCase() === 'sobres',
    );

    return category?.id ?? this.categories()[0]?.id ?? '';
  }
}