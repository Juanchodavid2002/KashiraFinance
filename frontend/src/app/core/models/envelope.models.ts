export const ENVELOPE_FREQUENCIES = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const;

export type EnvelopeFrequency = (typeof ENVELOPE_FREQUENCIES)[number];

export interface Envelope {
  id: string;
  name: string;
  frequency: EnvelopeFrequency;
  dayOfMonth: number;
  amount: string;
  balance: string;
  lastRecurredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnvelopePayload {
  name: string;
  frequency: EnvelopeFrequency;
  dayOfMonth?: number;
  amount: number;
  notes?: string;
}

export interface EnvelopeUpdatePayload {
  name?: string;
  frequency?: EnvelopeFrequency;
  dayOfMonth?: number;
  amount?: number;
  balance?: number;
  notes?: string;
}

export const ENVELOPE_FREQUENCY_LABELS: Record<
  EnvelopeFrequency,
  string
> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
};

export type EnvelopeMovementType = 'CONTRIBUTE' | 'SPEND';

export interface EnvelopeMovement {
  id: string;
  type: EnvelopeMovementType;
  amount: string;
  notes: string | null;
  createdAt: string;
  expenseDate?: string | null;
  categoryName?: string | null;
}

export interface EnvelopeDetail extends Envelope {
  contributedAmount: string;
  spentAmount: string;
  movements: EnvelopeMovement[];
}

export interface ContributeEnvelopePayload {
  amount: number;
  notes?: string;
}

export interface SpendEnvelopePayload {
  amount: number;
  description?: string;
  expenseDate?: string;
  categoryId?: string;
  paymentMethod?: string;
  notes?: string;
}