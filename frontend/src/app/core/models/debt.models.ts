export type DebtStatus = 'PENDING' | 'PAID';

export type DebtKind = 'ENTITY' | 'PERSONAL';

export type InterestType = 'NONE' | 'WITH_INTEREST';

export interface Debt {
  id: string;
  userId: string;
  kind: DebtKind;
  interestType: InterestType;
  name: string;
  lender: string | null;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  status: DebtStatus;
  totalInstallments: number | null;
  paidInstallments: number | null;
  installmentAmount: string | null;
  startDate: string;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DebtListItem extends Debt {
  _count?: { payments: number };
}

export interface DebtPayment {
  id: string;
  amount: string;
  capitalAmount: string | null;
  paidDate: string;
  notes: string | null;
  createdAt: string;
}

export interface DebtDetail extends Debt {
  payments: DebtPayment[];
}

export interface DebtListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  pendingCount: number;
}

export interface DebtListResponse {
  data: DebtListItem[];
  meta: DebtListMeta;
}

export interface DebtFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateDebtPayload {
  kind: DebtKind;
  interestType?: InterestType;
  name: string;
  lender?: string;
  totalAmount: number;
  totalInstallments?: number;
  paidInstallments?: number;
  installmentAmount?: number;
  startDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface UpdateDebtPayload {
  kind?: DebtKind;
  interestType?: InterestType;
  name?: string;
  lender?: string;
  totalAmount?: number;
  totalInstallments?: number;
  paidInstallments?: number;
  installmentAmount?: number;
  startDate?: string;
  dueDate?: string | null;
  notes?: string;
}

export interface CreateDebtPaymentPayload {
  amount: number;
  capitalAmount?: number;
  paidDate?: string;
  notes?: string;
  categoryId?: string;
  paymentMethod?: string;
  installment?: boolean;
}
