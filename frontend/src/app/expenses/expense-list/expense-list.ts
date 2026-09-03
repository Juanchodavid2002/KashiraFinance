import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CategoryService } from '../../core/services/category.service';
import { ExpenseService } from '../../core/services/expense.service';
import { CurrencyService } from '../../core/services/currency.service';
import {
  PAYMENT_METHOD_LABELS,
  formatAmount,
  formatDate,
} from '../../core/utils/format';
import type {
  Category,
  Expense,
  ExpenseListMeta,
  PaymentMethod,
} from '../../core/models/expense.models';

@Component({
  selector: 'app-expense-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.css',
})
export class ExpenseList implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);
  private readonly currencyService = inject(CurrencyService);

  readonly paymentLabels = PAYMENT_METHOD_LABELS;
  readonly formatAmount = (amount: string | number) =>
    formatAmount(amount, this.currencyService.currency());
  readonly formatDate = formatDate;

  readonly expenses = signal<Expense[]>([]);
  readonly meta = signal<ExpenseListMeta | null>(null);
  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);
  readonly listError = signal('');
  readonly categories = signal<Category[]>([]);

  readonly filters = this.fb.group({
    search: [''],
    categoryId: [''],
    paymentMethod: [''],
    from: [''],
    to: [''],
  });

  readonly totalFormatted = computed(() => {
    const current = this.meta();

    return current
      ? this.formatAmount(current.sum)
      : this.formatAmount('0');
  });

  readonly page = computed(() => this.meta()?.page ?? 1);
  readonly totalPages = computed(() => this.meta()?.totalPages ?? 1);

  readonly paymentMethods = Object.entries(PAYMENT_METHOD_LABELS) as [
    PaymentMethod,
    string,
  ][];

  ngOnInit(): void {
    this.categoryService.list().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => undefined,
    });

    this.loadExpenses();
  }

  applyFilters(): void {
    this.loadExpenses();
  }

  clearFilters(): void {
    this.filters.reset({
      search: '',
      categoryId: '',
      paymentMethod: '',
      from: '',
      to: '',
    });
    this.loadExpenses();
  }

  goToPage(targetPage: number): void {
    const current = this.meta();

    if (!current || targetPage < 1 || targetPage > current.totalPages) {
      return;
    }

    this.loadExpenses(targetPage);
  }

  deleteExpense(expense: Expense): void {
    const label = expense.description ?? 'este gasto';

    if (!window.confirm(`¿Eliminar "${label}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.deletingId.set(expense.id);
    this.expenseService
      .remove(expense.id)
      .pipe(finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => this.loadExpenses(),
        error: () => this.listError.set('No se pudo eliminar el gasto.'),
      });
  }

  trackByExpense(_index: number, expense: Expense): string {
    return expense.id;
  }

  private loadExpenses(page = 1): void {
    const value = this.filters.getRawValue();
    const hasFilters =
      value.search.trim() !== '' ||
      value.categoryId !== '' ||
      value.paymentMethod !== '' ||
      value.from !== '' ||
      value.to !== '';

    this.loading.set(true);
    this.listError.set('');

    this.expenseService
      .list(hasFilters ? { ...value, page } : { page })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.expenses.set(response.data);
          this.meta.set(response.meta);
        },
        error: () =>
          this.listError.set(
            'No se pudieron cargar los gastos. Intenta de nuevo.',
          ),
      });
  }
}
