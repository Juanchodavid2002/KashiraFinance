import type { PaymentMethod } from '../models/expense.models';
import type { Currency } from '../models/auth.models';

const CURRENCY_MAP: Record<Currency, { locale: string; code: string }> = {
  COP: { locale: 'es-CO', code: 'COP' },
  USD: { locale: 'en-US', code: 'USD' },
  MXN: { locale: 'es-MX', code: 'MXN' },
  EUR: { locale: 'de-DE', code: 'EUR' },
  ARS: { locale: 'es-AR', code: 'ARS' },
  CLP: { locale: 'es-CL', code: 'CLP' },
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: Currency): Intl.NumberFormat {
  const info = CURRENCY_MAP[currency];
  let fmt = formatterCache.get(info.code);

  if (!fmt) {
    fmt = new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: info.code,
      maximumFractionDigits: currency === 'CLP' || currency === 'COP' ? 0 : 2,
    });
    formatterCache.set(info.code, fmt);
  }

  return fmt;
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  DEBIT_CARD: 'Tarjeta débito',
  CREDIT_CARD: 'Tarjeta crédito',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

export function formatAmount(
  amount: string | number,
  currency: Currency = 'COP',
): string {
  return getFormatter(currency).format(Number(amount));
}

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}
