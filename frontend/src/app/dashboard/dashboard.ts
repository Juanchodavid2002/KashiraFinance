import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { finalize } from 'rxjs';

import { DashboardService } from '../core/services/dashboard.service';
import { AuthService } from '../core/services/auth.service';
import { CurrencyService } from '../core/services/currency.service';
import { formatAmount, formatDate } from '../core/utils/format';
import type {
  DashboardPeriod,
  DashboardSummary,
} from '../core/models/dashboard.models';
import { ChartCanvas } from './chart-canvas';

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const MONTH_SHORT_NAMES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const FALLBACK_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#ef4444',
  '#3b82f6',
  '#84cc16',
  '#f97316',
];

interface VariationInfo {
  direction: 'up' | 'down' | 'flat';
  text: string;
}

interface HealthRow {
  key: string;
  label: string;
  value: string;
  percent: number;
  fillClass: string;
  color: string;
  note: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ChartCanvas],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly currencyService = inject(CurrencyService);
  readonly authService = inject(AuthService);

  readonly formatAmount = (amount: string | number) =>
    formatAmount(amount, this.currencyService.currency());
  readonly formatDate = formatDate;

  readonly period = signal<DashboardPeriod>(this.currentPeriod());
  readonly data = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly periodLabel = computed(() => {
    const { month, year } = this.period();

    return `${MONTH_NAMES[month - 1]} ${year}`;
  });

  readonly isCurrentPeriod = computed(() => {
    const current = this.currentPeriod();

    return (
      this.period().month === current.month && this.period().year === current.year
    );
  });

  readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Buenos días';
    }

    if (hour < 19) {
      return 'Buenas tardes';
    }

    return 'Buenas noches';
  });

  readonly userName = computed(() => {
    const name = this.authService.currentUser()?.name?.trim() ?? '';

    if (!name) {
      return '';
    }

    return ` ${name.split(/\s+/)[0]}`;
  });

  readonly availableNegative = computed(
    () => Number(this.data()?.available ?? '0') < 0,
  );

  readonly totalDebt = computed(() => this.data()?.debtSummary.totalDebt ?? '0');
  readonly pendingDebtsCount = computed(
    () => this.data()?.debtSummary.pendingCount ?? 0,
  );
  readonly paidThisMonth = computed(
    () => this.data()?.debtSummary.paidThisMonth ?? '0',
  );
  readonly debtCardHidden = computed(
    () =>
      Number(this.totalDebt()) <= 0 && this.pendingDebtsCount() <= 0,
  );

  readonly availablePercent = computed(() => {
    const summary = this.data();

    if (!summary) {
      return 0;
    }

    const income = Number(summary.totalIncome);

    if (income <= 0) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, ((Number(summary.available) / income) * 100)),
    );
  });

  readonly expensePercent = computed(() => {
    const summary = this.data();

    if (!summary) {
      return 0;
    }

    const income = Number(summary.totalIncome);

    if (income <= 0) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, ((Number(summary.totalExpense) / income) * 100)),
    );
  });

  readonly variation = computed<VariationInfo | null>(() => {
    const value = this.data()?.comparison.variationPercentage;

    if (value === null || value === undefined) {
      return null;
    }

    if (value > 0) {
      return { direction: 'up', text: `+${value}% vs mes anterior` };
    }

    if (value < 0) {
      return { direction: 'down', text: `${value}% vs mes anterior` };
    }

    return { direction: 'flat', text: 'Sin cambios vs mes anterior' };
  });

  readonly donutConfig = computed<ChartConfiguration<'doughnut'> | null>(() => {
    const summary = this.data();
    const slices = summary?.expensesByCategory ?? [];

    if (!summary || slices.length === 0) {
      return null;
    }

    return {
      type: 'doughnut',
      data: {
        labels: slices.map((slice) => slice.categoryName),
        datasets: [
          {
            data: slices.map((slice) => Number(slice.total)),
            backgroundColor: slices.map(
              (slice, index) =>
                slice.categoryColor ??
                FALLBACK_COLORS[index % FALLBACK_COLORS.length],
            ),
            borderWidth: 0,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) =>
                `${context.label}: ${this.formatAmount(String(context.parsed))}`,
            },
          },
        },
      },
    };
  });

  readonly evolutionConfig = computed<ChartConfiguration<'line'> | null>(() => {
    const points = this.data()?.monthlyEvolution ?? [];

    if (points.length === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 280;
    const ctx = canvas.getContext('2d');

    const incomeGradient = ctx?.createLinearGradient(0, 0, 0, 280);
    incomeGradient?.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    incomeGradient?.addColorStop(1, 'rgba(16, 185, 129, 0)');

    const expenseGradient = ctx?.createLinearGradient(0, 0, 0, 280);
    expenseGradient?.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
    expenseGradient?.addColorStop(1, 'rgba(239, 68, 68, 0)');

    return {
      type: 'line',
      data: {
        labels: points.map(
          (point) => `${MONTH_SHORT_NAMES[point.month - 1]} ${point.year}`,
        ),
        datasets: [
          {
            label: 'Ingresos',
            data: points.map((point) => Number(point.income)),
            borderColor: '#10b981',
            backgroundColor: incomeGradient ?? 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#10b981',
            pointHoverBorderColor: 'white',
            pointHoverBorderWidth: 3,
          },
          {
            label: 'Gastos',
            data: points.map((point) => Number(point.expense)),
            borderColor: '#ef4444',
            backgroundColor: expenseGradient ?? 'rgba(239, 68, 68, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ef4444',
            pointHoverBorderColor: 'white',
            pointHoverBorderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              boxWidth: 8,
              boxHeight: 8,
            },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) =>
                ` ${context.dataset.label}: ${this.formatAmount(String(context.parsed.y))}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9', drawBorder: false },
            ticks: {
              color: '#94a3b8',
              callback: (value) => this.shortAmount(value as number),
            },
          },
        },
      },
    };
  });

  readonly healthRows = computed<HealthRow[]>(() => {
    const summary = this.data();

    if (!summary) {
      return [];
    }

    const income = Number(summary.totalIncome);
    const expense = Number(summary.totalExpense);
    const available = Number(summary.available);

    let expensePercent = 0;
    let availablePercent = 0;

    if (income > 0) {
      expensePercent = Math.max(
        0,
        Math.min(100, (expense / income) * 100),
      );
      availablePercent = Math.max(
        0,
        Math.min(100, (available / income) * 100),
      );
    }

    return [
      {
        key: 'income',
        label: 'Ingresos',
        value: this.formatAmount(summary.totalIncome),
        percent: income > 0 ? 100 : 0,
        fillClass: 'income',
        color: 'var(--color-success)',
        note: income > 0 ? '100% — base de referencia' : 'Sin ingresos este mes',
      },
      {
        key: 'expense',
        label: 'Gastos',
        value: this.formatAmount(summary.totalExpense),
        percent: expensePercent,
        fillClass: 'expense',
        color: 'var(--color-danger)',
        note:
          income > 0
            ? `${expensePercent.toFixed(1)}% de tus ingresos`
            : 'Sin gastos este mes',
      },
      {
        key: 'available',
        label: 'Disponible',
        value: this.formatAmount(summary.available),
        percent: availablePercent,
        fillClass: 'available',
        color: 'var(--color-primary)',
        note:
          available >= 0 && availablePercent >= 70
            ? `${availablePercent.toFixed(1)}% — excelente 💚`
            : `${availablePercent.toFixed(1)}% de tus ingresos`,
      },
    ];
  });

  ngOnInit(): void {
    this.loadSummary();
  }

  goToPreviousMonth(): void {
    const { month, year } = this.shiftPeriod(-1);

    this.period.set({ month, year });
    this.loadSummary();
  }

  goToNextMonth(): void {
    const { month, year } = this.shiftPeriod(1);

    this.period.set({ month, year });
    this.loadSummary();
  }

  backToCurrentMonth(): void {
    this.period.set(this.currentPeriod());
    this.loadSummary();
  }

  retry(): void {
    this.loadSummary();
  }

  trackByCategoryId(_index: number, slice: { categoryId: string }): string {
    return slice.categoryId;
  }

  trackByActivityId(_index: number, item: { id: string; type: string }): string {
    return `${item.type}-${item.id}`;
  }

  trackByHealthKey(_index: number, row: HealthRow): string {
    return row.key;
  }

  private loadSummary(): void {
    const { month, year } = this.period();

    this.loading.set(true);
    this.error.set(false);

    this.dashboardService
      .summary({ month, year })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (summary) => this.data.set(summary),
        error: () => this.error.set(true),
      });
  }

  private shiftPeriod(offset: number): DashboardPeriod {
    const { month, year } = this.period();
    const zeroBased = year * 12 + (month - 1) + offset;

    return {
      month: (zeroBased % 12) + 1,
      year: Math.floor(zeroBased / 12),
    };
  }

  private currentPeriod(): DashboardPeriod {
    const now = new Date();

    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  private shortAmount(value: number): string {
    if (Math.abs(value) >= 1_000_000) {
      return `${Number((value / 1_000_000).toFixed(1))}M`;
    }

    if (Math.abs(value) >= 1_000) {
      return `${Number((value / 1_000).toFixed(1))}K`;
    }

    return `${value}`;
  }
}
