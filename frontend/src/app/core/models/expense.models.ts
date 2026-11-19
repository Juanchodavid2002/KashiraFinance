export const PAYMENT_METHODS = [
  'CASH',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'TRANSFER',
  'OTHER',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Category {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  userId: string | null;
}

export interface CategoryPayload {
  name: string;
  color?: string;
  icon?: string;
}

export interface ExpenseCategoryRef {
  id: string;
  name: string;
  color: string | null;
}

export interface ExpenseEnvelopeRef {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  description: string | null;
  amount: string;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  category: ExpenseCategoryRef;
  /** Sobre del que salió el gasto (si se gastó desde un sobre). */
  envelope?: ExpenseEnvelopeRef | null;
}

export interface ExpenseListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sum: string;
}

export interface ExpenseListResponse {
  data: Expense[];
  meta: ExpenseListMeta;
}

export interface ExpenseFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  paymentMethod?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateExpensePayload {
  description?: string;
  amount: number;
  categoryId: string;
  expenseDate?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  envelopeId?: string;
}

export interface UpdateExpensePayload {
  description?: string;
  amount?: number;
  categoryId?: string;
  expenseDate?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}
