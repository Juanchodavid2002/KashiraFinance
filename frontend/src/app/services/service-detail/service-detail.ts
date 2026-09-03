import { Component, OnInit, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ServiceService } from '../../core/services/service.service';
import { CurrencyService } from '../../core/services/currency.service';
import { formatAmount, formatDate, todayIsoDate } from '../../core/utils/format';
import type {
  ServiceDetail,
  ServicePayment,
} from '../../core/models/service.models';

@Component({
  selector: 'app-service-detail',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './service-detail.html',
  styleUrl: './service-detail.css',
})
export class ServiceDetailComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly serviceService = inject(ServiceService);
  private readonly currencyService = inject(CurrencyService);

  readonly formatAmount = (amount: string | number) =>
    formatAmount(amount, this.currencyService.currency());
  readonly formatDate = formatDate;

  private serviceId: string;

  readonly service = signal<ServiceDetail | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deletingPaymentId = signal<string | null>(null);
  readonly formError = signal('');
  readonly loadError = signal('');

  readonly paymentForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    paidDate: [todayIsoDate()],
    notes: [''],
  });

  constructor() {
    this.serviceId = this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.load();
  }

  addPayment(): void {
    if (this.paymentForm.invalid || this.saving()) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const value = this.paymentForm.getRawValue();

    this.saving.set(true);
    this.formError.set('');

    this.serviceService
      .addPayment(this.serviceId, {
        amount: value.amount as number,
        paidDate: value.paidDate || undefined,
        notes: value.notes.trim() || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.paymentForm.reset({ amount: null, paidDate: todayIsoDate(), notes: '' });
          this.load();
        },
        error: (err) =>
          this.formError.set(
            err?.error?.message?.[0] ??
              'No se pudo registrar el pago. Intenta de nuevo.',
          ),
      });
  }

  deletePayment(payment: ServicePayment): void {
    if (
      !window.confirm(
        `¿Eliminar el pago de ${this.formatAmount(payment.amount)}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    this.deletingPaymentId.set(payment.id);
    this.serviceService
      .removePayment(this.serviceId, payment.id)
      .pipe(finalize(() => this.deletingPaymentId.set(null)))
      .subscribe({
        next: () => this.load(),
        error: () =>
          this.formError.set('No se pudo eliminar el pago. Intenta de nuevo.'),
      });
  }

  trackByPayment(_index: number, payment: ServicePayment): string {
    return payment.id;
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.serviceService
      .getById(this.serviceId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (service) => this.service.set(service),
        error: () =>
          this.loadError.set('No se pudo cargar el servicio. Intenta de nuevo.'),
      });
  }
}