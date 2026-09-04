export type SavingsStatus = 'ACTIVE' | 'REACHED' | 'CLOSED';

export type SavingsMovementType = 'DEPOSIT' | 'WITHDRAW';

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: string;
  balance: string;
  remainingAmount: string;
  progressPercent: number;
  deadline: string | null;
  notes: string | null;
  status: SavingsStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsMovement {
  id: string;
  type: SavingsMovementType;
  amount: string;
  notes: string | null;
  createdAt: string;
}

export interface SavingsDetail extends SavingsGoal {
  movements: SavingsMovement[];
}

export interface SavingsListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  reachedCount: number;
}

export interface SavingsListResponse {
  data: SavingsGoal[];
  meta: SavingsListMeta;
}

export interface SavingsFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateSavingsPayload {
  name: string;
  targetAmount: number;
  deadline?: string;
  notes?: string;
}

export interface UpdateSavingsPayload {
  name?: string;
  targetAmount?: number;
  deadline?: string | null;
  notes?: string;
  status?: SavingsStatus;
}

export interface DepositSavingsPayload {
  amount: number;
  notes?: string;
}

export interface WithdrawSavingsPayload {
  amount: number;
  notes?: string;
}
