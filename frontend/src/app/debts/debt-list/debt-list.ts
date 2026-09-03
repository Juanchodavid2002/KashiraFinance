import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { DebtService } from '../../core/services/debt.service';
import { CurrencyService } from '../../core/services/currency.service';
import { ToastService } from '../../core/services/toast.service';
import { confirmAction } from '../../core/utils/confirm';
import { formatAmount, formatDate } from '../../core/utils/format';
import type {
  DebtListItem,
  DebtListMeta,
} from '../../core/models/debt.models';

@Component({
  selector: 'app-debt-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './debt-list.html',
  styleUrl: './debt-list.css',
})
export class DebtList implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly debtService = inject(DebtService);
  private readonly currencyService = inject(CurrencyService);
  private readonly toast = inject(ToastService);

  readonly formatAmount = (amount: string | number) =>
    formatAmount(amount, this.currencyService.currency());
  readonly formatDate = formatDate;

  readonly debts = signal<DebtListItem[]>([]);
  readonly meta = signal<DebtListMeta | null>(null);
  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);
  readonly listError = signal('');

  readonly searchForm = this.fb.group({
    search: [''],
  });

  readonly totalPending = signal(0);
  readonly totalsFormatted = computed(() =>
    formatAmount(
      this.debts().reduce(
        (acc, d) => acc + Number(d.remainingAmount),
        0,
      ),
    ),
  );

  readonly progressPercent = (debt: DebtListItem): number => {
    const total = Number(debt.totalAmount);
    const paid = Number(debt.paidAmount);

    if (total <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((paid / total) * 100));
  };

  readonly page = computed(() => this.meta()?.page ?? 1);
  readonly totalPages = computed(() => this.meta()?.totalPages ?? 1);

  ngOnInit(): void {
    this.loadDebts();
  }

  searchDebts(): void {
    this.loadDebts();
  }

  clearSearch(): void {
    this.searchForm.reset({ search: '' });
    this.loadDebts();
  }

  goToPage(targetPage: number): void {
    const current = this.meta();

    if (!current || targetPage < 1 || targetPage > current.totalPages) {
      return;
    }

    this.loadDebts(targetPage);
  }

  async deleteDebt(debt: DebtListItem): Promise<void> {
    const confirmed = await confirmAction({
      title: '¿Eliminar deuda?',
      text: `¿Eliminar la deuda "${debt.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.deletingId.set(debt.id);
    this.debtService
      .remove(debt.id)
      .pipe(finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Deuda eliminada', debt.name);
          this.loadDebts();
        },
        error: () => {
          this.listError.set('No se pudo eliminar la deuda.');
          this.toast.error('No se pudo eliminar la deuda');
        },
      });
  }

  trackByDebt(_index: number, debt: DebtListItem): string {
    return debt.id;
  }

  private loadDebts(page = 1): void {
    const term = this.searchForm.value.search?.trim() ?? '';
    const hasFilters = term !== '';

    this.loading.set(true);
    this.listError.set('');

    this.debtService
      .list(hasFilters ? { search: term, page } : { page })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.debts.set(response.data);
          this.meta.set(response.meta);
          this.totalPending.set(response.meta.pendingCount);
        },
        error: () =>
          this.listError.set(
            'No se pudieron cargar las deudas. Intenta de nuevo.',
          ),
      });
  }
}
