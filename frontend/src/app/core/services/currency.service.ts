import { Injectable, computed, signal } from '@angular/core';

import type { Currency } from '../models/auth.models';

const CURRENCY_KEY = 'kashira_currency';
const DEFAULT_CURRENCY: Currency = 'COP';

const CURRENCY_MAP: Record<Currency, { locale: string; code: string }> = {
  COP: { locale: 'es-CO', code: 'COP' },
  USD: { locale: 'en-US', code: 'USD' },
  MXN: { locale: 'es-MX', code: 'MXN' },
  EUR: { locale: 'de-DE', code: 'EUR' },
  ARS: { locale: 'es-AR', code: 'ARS' },
  CLP: { locale: 'es-CL', code: 'CLP' },
};

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly currencySignal = signal<Currency>(this.readStored());

  readonly currency = this.currencySignal.asReadonly();

  readonly currencyInfo = computed(() => CURRENCY_MAP[this.currencySignal()]);

  setCurrency(currency: Currency): void {
    localStorage.setItem(CURRENCY_KEY, currency);
    this.currencySignal.set(currency);
  }

  private readStored(): Currency {
    const raw = localStorage.getItem(CURRENCY_KEY);

    if (raw && raw in CURRENCY_MAP) {
      return raw as Currency;
    }

    return this.detectFromLocale();
  }

  private detectFromLocale(): Currency {
    const lang = navigator.language?.toLowerCase() ?? '';

    if (lang.includes('es-co')) return 'COP';
    if (lang.includes('es-mx')) return 'MXN';
    if (lang.includes('es-ar')) return 'ARS';
    if (lang.includes('es-cl')) return 'CLP';
    if (lang.startsWith('en')) return 'USD';

    return DEFAULT_CURRENCY;
  }
}