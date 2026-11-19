export type BudgetLineType = 'INCOME' | 'EXPENSE';

export interface BudgetSummary {
  id: string;
  name: string;
  notes: string | null;
  lineCount: number;
  totalIncome: string;
  totalExpense: string;
  balance: string;
  updatedAt: string;
}

export interface BudgetLine {
  id: string;
  type: BudgetLineType;
  name: string;
  amount: string;
  included: boolean;
  position: number;
}

export interface BudgetDetail {
  id: string;
  name: string;
  notes: string | null;
  lines: BudgetLine[];
  totalIncome: string;
  totalExpense: string;
  balance: string;
}

export interface BudgetLinePayload {
  type?: BudgetLineType;
  name?: string;
  amount?: number;
  included?: boolean;
}
