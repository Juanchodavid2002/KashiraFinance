export type Currency = 'COP' | 'USD' | 'MXN' | 'EUR' | 'ARS' | 'CLP';

export const SUPPORTED_CURRENCIES: Currency[] = [
  'COP',
  'USD',
  'MXN',
  'EUR',
  'ARS',
  'CLP',
];

export const CURRENCY_LABELS: Record<Currency, string> = {
  COP: 'Pesos colombianos (COP)',
  USD: 'Dólares (USD)',
  MXN: 'Pesos mexicanos (MXN)',
  EUR: 'Euros (EUR)',
  ARS: 'Pesos argentinos (ARS)',
  CLP: 'Pesos chilenos (CLP)',
};

export interface User {
  id: string;
  name: string;
  email: string;
  currency: Currency;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  currency?: Currency;
}

export interface MessageResponse {
  message: string;
}

export interface VerifyResetCodePayload {
  email: string;
  code: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export interface UpdateCurrencyPayload {
  currency: Currency;
}
