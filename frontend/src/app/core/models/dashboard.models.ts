import type {
  ExpenseCategoryRef,
  PaymentMethod,
} from './expense.models';

export interface DashboardPeriod {
  month: number;
  year: number;
}

export interface ExpenseCategorySlice {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  total: string;
  percentage: number;
}

export interface RecentExpense {
  id: string;
  description: string | null;
  amount: string;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  category: ExpenseCategoryRef;
}

export interface RecentActivity {
  id: string;
  type: 'income' | 'expense';
  description: string | null;
  amount: string;
  date: string;
  meta: string;
  color: string | null;
}

export interface MonthlyEvolutionPoint {
  month: number;
  year: number;
  income: string;
  expense: string;
}

export interface DashboardComparison {
  previousMonthExpense: string;
  variationPercentage: number | null;
}

export interface DashboardSummary {
  period: DashboardPeriod;
  totalIncome: string;
  totalExpense: string;
  available: string;
  expenseCount: number;
  expensesByCategory: ExpenseCategorySlice[];
  recentExpenses: RecentExpense[];
  recentActivity: RecentActivity[];
  monthlyEvolution: MonthlyEvolutionPoint[];
  comparison: DashboardComparison;
}

export interface DashboardFilters {
  month?: number;
  year?: number;
}
