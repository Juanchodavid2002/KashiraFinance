import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { CurrencyService } from '../../core/services/currency.service';
import { EnvelopeService } from '../../core/services/envelope.service';
import { ToastService } from '../../core/services/toast.service';
import { confirmAction } from '../../core/utils/confirm';
import { formatAmount } from '../../core/utils/format';
import type { Envelope } from '../../core/models/envelope.models';
import { ENVELOPE_FREQUENCY_LABELS } from '../../core/models/envelope.models';

@Component({
  selector: 'app-envelope-list',
  templateUrl: './envelope-list.html',
  styleUrl: './envelope-list.css',
})
export class EnvelopeList {
  private readonly envelopeService = inject(EnvelopeService);
  private readonly currencyService = inject(CurrencyService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly envelopes = signal<Envelope[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  private readonly currency = this.currencyService.currency;

  constructor() {
    this.load();
  }

  readonly frequencyLabel = (frequency: Envelope['frequency']): string =>
    ENVELOPE_FREQUENCY_LABELS[frequency];

  format(amount: string): string {
    return formatAmount(Number(amount), this.currency());
  }

  balanceState(envelope: Envelope): 'good' | 'low' | 'empty' {
    const balance = Number(envelope.balance);

    if (balance <= 0) {
      return 'empty';
    }

    if (Number(envelope.amount) > 0 && balance < Number(envelope.amount) / 2) {
      return 'low';
    }

    return 'good';
  }

  balancePercent(envelope: Envelope): number {
    const balance = Number(envelope.balance);
    const amount = Number(envelope.amount);

    if (amount <= 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, Math.round((balance / amount) * 100)));
  }

  hasReload(envelope: Envelope): boolean {
    return Number(envelope.amount) > 0;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.envelopeService.list().subscribe({
      next: (res) => {
        this.envelopes.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los sobres.');
        this.loading.set(false);
      },
    });
  }

  openNew(): void {
    void this.router.navigate(['/app/envelopes', 'new']);
  }

  goEdit(envelope: Envelope): void {
    void this.router.navigate(['/app/envelopes', envelope.id, 'edit']);
  }

  goDetail(envelope: Envelope): void {
    void this.router.navigate(['/app/envelopes', envelope.id, 'detail']);
  }

  async remove(envelope: Envelope): Promise<void> {
    const confirmed = await confirmAction({
      title: '¿Eliminar sobre?',
      text: `¿Eliminar el sobre "${envelope.name}"?`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.deletingId.set(envelope.id);
    this.envelopeService.remove(envelope.id).subscribe({
      next: () => {
        this.toast.success('Sobre eliminado', envelope.name);
        this.deletingId.set(null);
        this.load();
      },
      error: () => {
        this.deletingId.set(null);
        this.error.set('No se pudo eliminar el sobre.');
        this.toast.error('No se pudo eliminar el sobre');
      },
    });
  }
}