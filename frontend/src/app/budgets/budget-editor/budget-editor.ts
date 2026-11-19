import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MoneyInputDirective } from '../../core/directives/money-input.directive';
import { BudgetService } from '../../core/services/budget.service';
import { CurrencyService } from '../../core/services/currency.service';
import { ToastService } from '../../core/services/toast.service';
import { confirmAction } from '../../core/utils/confirm';
import { formatAmount } from '../../core/utils/format';
import type { BudgetLineType } from '../../core/models/budget.models';

interface EditLine {
  id: string;
  type: BudgetLineType;
  name: string;
  amount: number | null;
  included: boolean;
}

@Component({
  selector: 'app-budget-editor',
  imports: [FormsModule, RouterLink, MoneyInputDirective],
  templateUrl: './budget-editor.html',
  styleUrl: './budget-editor.css',
})
export class BudgetEditor {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly budgetService = inject(BudgetService);
  private readonly currencyService = inject(CurrencyService);
  private readonly toast = inject(ToastService);

  private readonly budgetId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly name = signal('');
  readonly notes = signal('');
  readonly lines = signal<EditLine[]>([]);

  private savedName = '';
  private savedNotes = '';

  readonly incomeLines = computed(() =>
    this.lines().filter((line) => line.type === 'INCOME'),
  );
  readonly expenseLines = computed(() =>
    this.lines().filter((line) => line.type === 'EXPENSE'),
  );

  readonly totalIncome = computed(() => this.sum(this.incomeLines()));
  readonly totalExpense = computed(() => this.sum(this.expenseLines()));
  readonly balance = computed(() => this.totalIncome() - this.totalExpense());

  /** % de los ingresos simulados que ya está comprometido en gastos. */
  readonly usedPercent = computed(() => {
    const income = this.totalIncome();

    if (income <= 0) {
      return this.totalExpense() > 0 ? 100 : 0;
    }

    return Math.round((this.totalExpense() / income) * 100);
  });

  constructor() {
    this.load();
  }

  format(amount: number): string {
    return formatAmount(amount, this.currencyService.currency());
  }

  private sum(lines: EditLine[]): number {
    return lines
      .filter((line) => line.included)
      .reduce((acc, line) => acc + (line.amount ?? 0), 0);
  }

  private load(): void {
    this.budgetService.getById(this.budgetId).subscribe({
      next: (budget) => {
        this.name.set(budget.name);
        this.notes.set(budget.notes ?? '');
        this.savedName = budget.name;
        this.savedNotes = budget.notes ?? '';
        this.lines.set(
          budget.lines.map((line) => ({
            id: line.id,
            type: line.type,
            name: line.name,
            amount: Number(line.amount),
            included: line.included,
          })),
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el presupuesto.');
        this.loading.set(false);
      },
    });
  }

  // ── Encabezado ──

  saveName(): void {
    const name = this.name().trim();

    if (!name) {
      this.name.set(this.savedName);
      return;
    }

    if (name === this.savedName) {
      return;
    }

    this.budgetService.update(this.budgetId, { name }).subscribe({
      next: () => (this.savedName = name),
      error: (error: { status: number }) => {
        this.name.set(this.savedName);
        this.toast.error(
          'No se pudo renombrar',
          error.status === 409
            ? 'Ya existe un presupuesto con ese nombre.'
            : undefined,
        );
      },
    });
  }

  saveNotes(): void {
    const notes = this.notes().trim();

    if (notes === this.savedNotes) {
      return;
    }

    this.budgetService.update(this.budgetId, { notes }).subscribe({
      next: () => (this.savedNotes = notes),
      error: () => this.toast.error('No se pudieron guardar las notas'),
    });
  }

  duplicate(): void {
    this.budgetService.duplicate(this.budgetId).subscribe({
      next: (copy) => {
        this.toast.success('Presupuesto duplicado', copy.name);
        void this.router
          .navigateByUrl('/app/budgets')
          .then(() => this.router.navigate(['/app/budgets', copy.id]));
      },
      error: () => this.toast.error('No se pudo duplicar el presupuesto'),
    });
  }

  async removeBudget(): Promise<void> {
    const confirmed = await confirmAction({
      title: `¿Eliminar "${this.name()}"?`,
      text: 'Se borran todas sus filas. No afecta tus ingresos ni gastos reales.',
      confirmText: 'Sí, eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.budgetService.remove(this.budgetId).subscribe({
      next: () => {
        this.toast.success('Presupuesto eliminado');
        void this.router.navigate(['/app/budgets']);
      },
      error: () => this.toast.error('No se pudo eliminar el presupuesto'),
    });
  }

  // ── Filas ──

  addLine(type: BudgetLineType): void {
    this.budgetService
      .addLine(this.budgetId, { type, name: '', amount: 0 })
      .subscribe({
        next: (line) => {
          this.lines.update((lines) => [
            ...lines,
            {
              id: line.id,
              type: line.type,
              name: line.name,
              amount: Number(line.amount),
              included: line.included,
            },
          ]);
          setTimeout(() =>
            document.getElementById(`line-name-${line.id}`)?.focus(),
          );
        },
        error: () => this.toast.error('No se pudo agregar la fila'),
      });
  }

  setName(line: EditLine, value: string): void {
    this.patchLocal(line.id, { name: value });
  }

  setAmount(line: EditLine, value: number | null): void {
    this.patchLocal(line.id, { amount: value });
  }

  toggleIncluded(line: EditLine, included: boolean): void {
    this.patchLocal(line.id, { included });
    this.saveLine(line.id);
  }

  /** Guarda la fila (se llama al salir de un campo, como al cerrar una celda). */
  saveLine(lineId: string): void {
    const line = this.lines().find((l) => l.id === lineId);

    if (!line) {
      return;
    }

    this.budgetService
      .updateLine(this.budgetId, lineId, {
        name: line.name,
        amount: line.amount ?? 0,
        included: line.included,
      })
      .subscribe({
        error: () => this.toast.error('No se pudo guardar la fila'),
      });
  }

  removeLine(line: EditLine): void {
    this.budgetService.removeLine(this.budgetId, line.id).subscribe({
      next: () =>
        this.lines.update((lines) => lines.filter((l) => l.id !== line.id)),
      error: () => this.toast.error('No se pudo eliminar la fila'),
    });
  }

  private patchLocal(id: string, patch: Partial<EditLine>): void {
    this.lines.update((lines) =>
      lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }
}
