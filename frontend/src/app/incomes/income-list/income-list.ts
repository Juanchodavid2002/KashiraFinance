import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { IncomeService } from '../../core/services/income.service';
import { formatAmount, formatDate } from '../../core/utils/format';
import type { Income, IncomeListMeta } from '../../core/models/income.models';

@Component({
  selector: 'app-income-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './income-list.html',
  styleUrl: './income-list.css',
})
export class IncomeList implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly incomeService = inject(IncomeService);

  readonly formatAmount = formatAmount;
  readonly formatDate = formatDate;

  readonly incomes = signal<Income[]>([]);
  readonly meta = signal<IncomeListMeta | null>(null);
  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);
  readonly listError = signal('');

  readonly filters = this.fb.group({
    source: [''],
    from: [''],
    to: [''],
  });

  readonly totalFormatted = computed(() => {
    const current = this.meta();

    return current ? formatAmount(current.sum) : formatAmount('0');
  });

  readonly page = computed(() => this.meta()?.page ?? 1);
  readonly totalPages = computed(() => this.meta()?.totalPages ?? 1);

  ngOnInit(): void {
    this.loadIncomes();
  }

  applyFilters(): void {
    this.loadIncomes();
  }

  clearFilters(): void {
    this.filters.reset({ source: '', from: '', to: '' });
    this.loadIncomes();
  }

  goToPage(targetPage: number): void {
    const current = this.meta();

    if (!current || targetPage < 1 || targetPage > current.totalPages) {
      return;
    }

    this.loadIncomes(targetPage);
  }

  deleteIncome(income: Income): void {
    const label = income.description ?? 'este ingreso';

    if (!window.confirm(`¿Eliminar "${label}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.deletingId.set(income.id);
    this.incomeService
      .remove(income.id)
      .pipe(finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => this.loadIncomes(),
        error: () => this.listError.set('No se pudo eliminar el ingreso.'),
      });
  }

  trackByIncome(_index: number, income: Income): string {
    return income.id;
  }

  private loadIncomes(page = 1): void {
    const value = this.filters.getRawValue();
    const hasFilters =
      value.source.trim() !== '' || value.from !== '' || value.to !== '';

    this.loading.set(true);
    this.listError.set('');

    this.incomeService
      .list(hasFilters ? { ...value, page } : { page })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.incomes.set(response.data);
          this.meta.set(response.meta);
        },
        error: () =>
          this.listError.set(
            'No se pudieron cargar los ingresos. Intenta de nuevo.',
          ),
      });
  }
}
