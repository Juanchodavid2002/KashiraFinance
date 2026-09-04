import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { CurrencyService } from '../../core/services/currency.service';
import { SavingsService } from '../../core/services/savings.service';
import { ToastService } from '../../core/services/toast.service';
import { confirmAction } from '../../core/utils/confirm';
import { formatAmount, formatDate } from '../../core/utils/format';
import type { SavingsGoal } from '../../core/models/savings.models';

@Component({
  selector: 'app-savings-list',
  templateUrl: './savings-list.html',
  styleUrl: './savings-list.css',
})
export class SavingsList {
  private readonly savingsService = inject(SavingsService);
  private readonly currencyService = inject(CurrencyService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly savings = signal<SavingsGoal[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly total = signal(0);

  readonly page = signal(1);
  readonly totalPages = signal(1);

  private readonly currency = this.currencyService.currency;

  readonly savingCountLabel = computed(() => {
    const count = this.total();

    if (count === 1) {
      return '1 ahorro';
    }

    return `${count} ahorros`;
  });

  constructor() {
    this.load();
  }

  format(amount: string): string {
    return formatAmount(Number(amount), this.currency());
  }

  isEmpty = (goal: SavingsGoal): boolean => Number(goal.balance) <= 0;

  formatDate(iso: string): string {
    return formatDate(iso);
  }

  balanceState(goal: SavingsGoal): 'good' | 'low' {
    return goal.progressPercent < 50 ? 'low' : 'good';
  }

  load(page = 1): void {
    this.loading.set(true);
    this.error.set(null);

    this.savingsService.list({ page, limit: 20 }).subscribe({
      next: (res) => {
        this.savings.set(res.data);
        this.total.set(res.meta.total);
        this.page.set(res.meta.page);
        this.totalPages.set(res.meta.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los ahorros.');
        this.loading.set(false);
      },
    });
  }

  goToPage(targetPage: number): void {
    if (targetPage < 1 || targetPage > this.totalPages()) {
      return;
    }

    this.load(targetPage);
  }

  openNew(): void {
    void this.router.navigate(['/app/savings', 'new']);
  }

  goEdit(goal: SavingsGoal): void {
    void this.router.navigate(['/app/savings', goal.id, 'edit']);
  }

  goDetail(goal: SavingsGoal): void {
    void this.router.navigate(['/app/savings', goal.id]);
  }

  async remove(goal: SavingsGoal): Promise<void> {
    const confirmed = await confirmAction({
      title: '¿Eliminar ahorro?',
      text: `¿Eliminar el ahorro "${goal.name}"?`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.deletingId.set(goal.id);
    this.savingsService.remove(goal.id).subscribe({
      next: () => {
        this.toast.success('Ahorro eliminado', goal.name);
        this.deletingId.set(null);
        this.load(this.page());
      },
      error: () => {
        this.deletingId.set(null);
        this.error.set('No se pudo eliminar el ahorro.');
        this.toast.error('No se pudo eliminar el ahorro');
      },
    });
  }
}
