import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

const EVOLUTION_MONTHS = 6;
const RECENT_EXPENSES_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 8;

interface MonthAggregateRow {
  ym: string;
  total: Prisma.Decimal | string | number | null;
}

function toAmount(value: Prisma.Decimal | string | number | null): string {
  if (value === null || value === undefined) {
    return '0.00';
  }

  return new Prisma.Decimal(value).toFixed(2);
}

function monthStartUtc(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

function nextMonthStartUtc(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

function shiftMonth(
  year: number,
  month: number,
  offset: number,
): { year: number; month: number } {
  const zeroBased = year * 12 + (month - 1) + offset;

  return {
    year: Math.floor(zeroBased / 12),
    month: (zeroBased % 12) + 1,
  };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string, dto: DashboardQueryDto) {
    const now = new Date();
    const period = {
      month: dto.month ?? now.getUTCMonth() + 1,
      year: dto.year ?? now.getUTCFullYear(),
    };

    const rangeStart = monthStartUtc(period.year, period.month);
    const rangeEnd = nextMonthStartUtc(period.year, period.month);
    const previous = shiftMonth(period.year, period.month, -1);
    const previousStart = monthStartUtc(previous.year, previous.month);
    const evolutionStart = monthStartUtc(
      shiftMonth(period.year, period.month, -(EVOLUTION_MONTHS - 1)).year,
      shiftMonth(period.year, period.month, -(EVOLUTION_MONTHS - 1)).month,
    );

    const monthExpenseWhere: Prisma.ExpenseWhereInput = {
      userId,
      expenseDate: { gte: rangeStart, lt: rangeEnd },
    };

    const [
      incomeSum,
      expenseSum,
      expenseCount,
      byCategory,
      recentExpenses,
      recentIncomes,
      incomeByMonthRows,
      expenseByMonthRows,
      previousExpenseSum,
      debtPaymentThisMonth,
      pendingDebts,
      envelopeBalanceSum,
      savingsBalanceSum,
    ] = await Promise.all([
      this.prisma.income.aggregate({
        where: {
          userId,
          incomeDate: { gte: rangeStart, lt: rangeEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: monthExpenseWhere,
        _sum: { amount: true },
      }),
      this.prisma.expense.count({ where: monthExpenseWhere }),
      this.listExpensesByCategory(monthExpenseWhere),
      this.prisma.expense.findMany({
        where: { userId },
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        take: RECENT_EXPENSES_LIMIT,
        select: {
          id: true,
          description: true,
          amount: true,
          expenseDate: true,
          paymentMethod: true,
          category: { select: { id: true, name: true, color: true } },
        },
      }),
      this.prisma.income.findMany({
        where: { userId },
        orderBy: [{ incomeDate: 'desc' }, { createdAt: 'desc' }],
        take: RECENT_EXPENSES_LIMIT,
        select: {
          id: true,
          description: true,
          amount: true,
          incomeDate: true,
          source: true,
        },
      }),
      this.sumByMonth(
        '"incomeDate"',
        'incomes',
        userId,
        evolutionStart,
        rangeEnd,
      ),
      this.sumByMonth(
        '"expenseDate"',
        'expenses',
        userId,
        evolutionStart,
        rangeEnd,
      ),
      this.prisma.expense.aggregate({
        where: {
          userId,
          expenseDate: { gte: previousStart, lt: rangeStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.debtPayment.aggregate({
        where: { userId, paidDate: { gte: rangeStart, lt: rangeEnd } },
        _sum: { amount: true },
      }),
      this.debtPendingSummary(userId),
      this.prisma.envelope.aggregate({
        where: { userId },
        _sum: { balance: true },
      }),
      this.prisma.savingsGoal.aggregate({
        where: { userId, status: { not: 'CLOSED' } },
        _sum: { balance: true },
      }),
    ]);

    const totalIncome = new Prisma.Decimal(incomeSum._sum.amount ?? 0);
    const totalExpense = new Prisma.Decimal(expenseSum._sum.amount ?? 0);

    const envelopeBalance = new Prisma.Decimal(
      envelopeBalanceSum._sum.balance ?? 0,
    );

    const savingsBalance = new Prisma.Decimal(
      savingsBalanceSum._sum.balance ?? 0,
    );

    const available = totalIncome
      .minus(totalExpense)
      .minus(envelopeBalance)
      .minus(savingsBalance);
    const previousMonthExpense = new Prisma.Decimal(
      previousExpenseSum._sum.amount ?? 0,
    );

    let variationPercentage: number | null = null;

    if (!previousMonthExpense.isZero()) {
      variationPercentage = Number(
        totalExpense
          .minus(previousMonthExpense)
          .dividedBy(previousMonthExpense)
          .times(100)
          .toFixed(2),
      );
    }

    return {
      period,
      totalIncome: toAmount(totalIncome),
      totalExpense: toAmount(totalExpense),
      available: toAmount(available),
      expenseCount,
      expensesByCategory: byCategory,
      recentExpenses: recentExpenses.map((expense) => ({
        ...expense,
        amount: toAmount(expense.amount),
      })),
      recentActivity: this.buildRecentActivity(recentExpenses, recentIncomes),
      monthlyEvolution: this.buildEvolution(
        period.year,
        period.month,
        incomeByMonthRows,
        expenseByMonthRows,
      ),
      comparison: {
        previousMonthExpense: toAmount(previousMonthExpense),
        variationPercentage,
      },
      debtSummary: {
        totalDebt: pendingDebts.totalDebt,
        pendingCount: pendingDebts.pendingCount,
        paidThisMonth: toAmount(debtPaymentThisMonth._sum.amount ?? null),
      },
      savingsBalance: toAmount(savingsBalance),
    };
  }

  private async debtPendingSummary(
    userId: string,
  ): Promise<{ totalDebt: string; pendingCount: number }> {
    const rows = await this.prisma.$queryRaw<
      { total_debt: Prisma.Decimal | null; pending_count: bigint }[]
    >`
      SELECT
        SUM(d."totalAmount" - COALESCE(p."paid", 0)) AS "total_debt",
        COUNT(*) FILTER (WHERE d."totalAmount" > COALESCE(p."paid", 0)) AS "pending_count"
      FROM "debts" d
      LEFT JOIN (
        SELECT "debtId",
               SUM(CASE WHEN d2."interestType" = 'WITH_INTEREST' THEN COALESCE(dp."capitalAmount", dp."amount") ELSE dp."amount" END) AS "paid"
        FROM "debt_payments" dp
        JOIN "debts" d2 ON d2."id" = dp."debtId"
        WHERE dp."userId" = ${userId}
        GROUP BY dp."debtId"
      ) p ON p."debtId" = d.id
      WHERE d."userId" = ${userId}
    `;

    const row = rows[0];

    return {
      totalDebt: toAmount(row?.total_debt ?? null),
      pendingCount: row ? Number(row.pending_count) : 0,
    };
  }

  private async listExpensesByCategory(where: Prisma.ExpenseWhereInput) {
    const grouped = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    if (grouped.length === 0) {
      return [];
    }

    const categories = await this.prisma.category.findMany({
      where: { id: { in: grouped.map((row) => row.categoryId) } },
      select: { id: true, name: true, color: true },
    });
    const categoryById = new Map(
      categories.map((category) => [category.id, category]),
    );

    const total = grouped.reduce(
      (acc, row) =>
        categoryById.has(row.categoryId) ? acc.plus(row._sum.amount ?? 0) : acc,
      new Prisma.Decimal(0),
    );

    if (total.isZero()) {
      return [];
    }

    return grouped
      .filter((row) => categoryById.has(row.categoryId))
      .map((row) => {
        const amount = row._sum.amount ?? new Prisma.Decimal(0);

        return {
          categoryId: row.categoryId,
          categoryName: categoryById.get(row.categoryId)?.name ?? '',
          categoryColor: categoryById.get(row.categoryId)?.color ?? null,
          total: toAmount(amount),
          percentage: Number(amount.dividedBy(total).times(100).toFixed(1)),
        };
      });
  }

  private sumByMonth(
    dateColumn: '"incomeDate"' | '"expenseDate"',
    table: 'incomes' | 'expenses',
    userId: string,
    from: Date,
    to: Date,
  ) {
    return this.prisma.$queryRaw<MonthAggregateRow[]>(
      Prisma.sql`
        SELECT to_char(date_trunc('month', ${Prisma.raw(dateColumn)}), 'YYYY-MM') AS "ym",
               SUM(amount) AS total
        FROM ${Prisma.raw(table)}
        WHERE ${Prisma.raw('"userId"')} = ${userId}
          AND ${Prisma.raw(dateColumn)} >= ${from}
          AND ${Prisma.raw(dateColumn)} < ${to}
        GROUP BY 1
      `,
    );
  }

  private buildEvolution(
    endYear: number,
    endMonth: number,
    incomeRows: MonthAggregateRow[],
    expenseRows: MonthAggregateRow[],
  ) {
    const incomeByKey = new Map(incomeRows.map((row) => [row.ym, row.total]));
    const expenseByKey = new Map(expenseRows.map((row) => [row.ym, row.total]));
    const points: {
      month: number;
      year: number;
      income: string;
      expense: string;
    }[] = [];

    for (let offset = -(EVOLUTION_MONTHS - 1); offset <= 0; offset++) {
      const { year, month } = shiftMonth(endYear, endMonth, offset);
      const key = `${year}-${String(month).padStart(2, '0')}`;

      points.push({
        month,
        year,
        income: toAmount(incomeByKey.get(key) ?? null),
        expense: toAmount(expenseByKey.get(key) ?? null),
      });
    }

    return points;
  }

  private buildRecentActivity(
    expenses: {
      id: string;
      description: string | null;
      amount: Prisma.Decimal;
      expenseDate: Date;
      paymentMethod: string;
      category: { id: string; name: string; color: string | null };
    }[],
    incomes: {
      id: string;
      description: string | null;
      amount: Prisma.Decimal;
      incomeDate: Date;
      source: string | null;
    }[],
  ) {
    const expenseItems = expenses.map((expense) => ({
      id: expense.id,
      type: 'expense' as const,
      description: expense.description,
      amount: toAmount(expense.amount),
      date: expense.expenseDate,
      meta: expense.category.name,
      color: expense.category.color ?? null,
    }));

    const incomeItems = incomes.map((income) => ({
      id: income.id,
      type: 'income' as const,
      description: income.description,
      amount: toAmount(income.amount),
      date: income.incomeDate,
      meta: income.source ?? 'Ingreso',
      color: null,
    }));

    return [...expenseItems, ...incomeItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, RECENT_ACTIVITY_LIMIT);
  }
}
