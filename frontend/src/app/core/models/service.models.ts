export interface ServicePayment {
  id: string;
  amount: string;
  paidDate: string;
  notes: string | null;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  totalPaid: string;
  paymentCount: number;
  lastPayment: ServicePayment | null;
}

export interface ServiceDetail extends Service {
  payments: ServicePayment[];
}

export interface ServiceListResponse {
  data: Service[];
}

export interface CreateServicePayload {
  name: string;
  color?: string;
  icon?: string;
  notes?: string;
  categoryId?: string;
}

export interface UpdateServicePayload {
  name?: string;
  color?: string;
  icon?: string;
  notes?: string;
  categoryId?: string;
}

export interface CreateServicePaymentPayload {
  amount: number;
  paidDate?: string;
  notes?: string;
  categoryId?: string;
  paymentMethod?: string;
}