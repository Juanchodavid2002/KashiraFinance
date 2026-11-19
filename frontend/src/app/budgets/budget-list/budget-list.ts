import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { BudgetService } from '../../core/services/budget.service';
import { CurrencyService } from '../../core/services/currency.service';
import { ToastService } from '../../core/services/toast.service';
import { confirmAction } from '../../core/utils/confirm';
import { formatAmount } from '../../core/utils/format';
import type { BudgetSummary } from '../../core/models/budget.models';

@Component({
  selector: 'app-budget-list',
  imports: [FormsModule, RouterLink],
  templateUrl: './budget-list.html',
  styleUrl: './budget-list.css',
})
export class BudgetList {
  private readonly budgetService = inject(BudgetService);
  private readonly currencyService = inject(CurrencyService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly budgets = signal<BudgetSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly newName = signal('');
  readonly creating = signal(false);

  constructor() {
    this.load();
  }

  format(amount: string): string {
    return formatAmount(Number(amount), this.currencyService.currency());
  }

  isNegative(amount: string): boolean {
    return Number(amount) < 0;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.budgetService.list().subscribe({
      next: (budgets) => {
        this.budgets.set(budgets);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los presupuestos.');
        this.loading.set(false);
      },
    });
  }

  create(): void {
    const name = this.newName().trim();

    if (!name || this.creating()) {
      return;
    }

    this.creating.set(true);
    this.budgetService.create(name).subscribe({
      next: (budget) => {
        this.creating.set(false);
        void this.router.navigate(['/app/budgets', budget.id]);
      },
      error: (error: { status: number }) => {
        this.creating.set(false);
        this.toast.error(
          'No se pudo crear el presupuesto',
          error.status === 409
            ? 'Ya existe un presupuesto con ese nombre.'
            : undefined,
        );
      },
    });
  }

  duplicate(budget: BudgetSummary): void {
    this.budgetService.duplicate(budget.id).subscribe({
      next: (copy) => {
        this.toast.success('Presupuesto duplicado', copy.name);
        void this.router.navigate(['/app/budgets', copy.id]);
      },
      error: () => this.toast.error('No se pudo duplicar el presupuesto'),
    });
  }

  async remove(budget: BudgetSummary): Promise<void> {
    const confirmed = await confirmAction({
      title: `¿Eliminar "${budget.name}"?`,
      text: 'Se borran todas sus filas. No afecta tus ingresos ni gastos reales.',
      confirmText: 'Sí, eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.budgetService.remove(budget.id).subscribe({
      next: () => {
        this.toast.success('Presupuesto eliminado', budget.name);
        this.load();
      },
      error: () => this.toast.error('No se pudo eliminar el presupuesto'),
    });
  }
}
