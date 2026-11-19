export interface Provider {
  id: string;
  name: string;
  notes: string | null;
  debtCount: number;
  incomeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderPayload {
  name: string;
  notes?: string;
}
