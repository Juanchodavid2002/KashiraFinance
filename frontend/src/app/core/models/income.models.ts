export interface Income {
  id: string;
  description: string | null;
  amount: string;
  incomeDate: string;
  source: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sum: string;
}

export interface IncomeListResponse {
  data: Income[];
  meta: IncomeListMeta;
}

export interface IncomeFilters {
  from?: string;
  to?: string;
  source?: string;
  page?: number;
  limit?: number;
}

export interface CreateIncomePayload {
  description?: string;
  amount: number;
  incomeDate?: string;
  source?: string;
  notes?: string;
}

export interface UpdateIncomePayload {
  description?: string;
  amount?: number;
  incomeDate?: string;
  source?: string;
  notes?: string;
}
