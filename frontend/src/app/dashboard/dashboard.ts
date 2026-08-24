import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { finalize } from 'rxjs';

import { DashboardService } from '../core/services/dashboard.service';
import { AuthService } from '../core/services/auth.service';
import {
  PAYMENT_METHOD_LABELS,
  formatAmount,
  formatDate,
} from '../core/utils/format';
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
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#ef4444',
  '#6366f1',
  '#84cc16',
  '#f97316',
];

interface VariationInfo {
  direction: 'up' | 'down' | 'flat';
  text: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ChartCanvas],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly authService = inject(AuthService);

  readonly formatAmount = formatAmount;
  readonly formatDate = formatDate;
  readonly paymentMethodLabels = PAYMENT_METHOD_LABELS;

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

  readonly availableNegative = computed(
    () => Number(this.data()?.available ?? '0') < 0,
  );

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
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.label}: ${formatAmount(String(context.parsed))}`,
            },
          },
        },
      },
    };
  });

  readonly evolutionConfig = computed<ChartConfiguration<'bar'> | null>(() => {
    const points = this.data()?.monthlyEvolution ?? [];

    if (points.length === 0) {
      return null;
    }

    return {
      type: 'bar',
      data: {
        labels: points.map(
          (point) => `${MONTH_SHORT_NAMES[point.month - 1]} ${point.year}`,
        ),
        datasets: [
          {
            label: 'Ingresos',
            data: points.map((point) => Number(point.income)),
            backgroundColor: '#16a34a',
            borderRadius: 4,
          },
          {
            label: 'Gastos',
            data: points.map((point) => Number(point.expense)),
            backgroundColor: '#dc2626',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.shortAmount(value as number),
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${formatAmount(String(context.parsed.y))}`,
            },
          },
        },
      },
    };
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

  trackByExpenseId(_index: number, expense: { id: string }): string {
    return expense.id;
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
