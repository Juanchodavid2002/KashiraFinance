import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { CurrencyService } from '../core/services/currency.service';
import {
  CURRENCY_LABELS,
  SUPPORTED_CURRENCIES,
  type Currency,
} from '../core/models/auth.models';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly authService = inject(AuthService);
  private readonly currencyService = inject(CurrencyService);

  readonly currencies = SUPPORTED_CURRENCIES;
  readonly currencyLabels = CURRENCY_LABELS;

  readonly selectedCurrency = signal(this.currencyService.currency());
  readonly saving = signal(false);
  readonly message = signal<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  onCurrencyChange(value: string): void {
    this.updateSelection(value);
    this.save();
  }

  updateSelection(value: string): void {
    this.selectedCurrency.set(value as Currency);
  }

  private save(): void {
    const currency = this.selectedCurrency();

    this.message.set(null);
    this.saving.set(true);

    this.authService.updateCurrency(currency).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set({
          type: 'success',
          text: 'Moneda actualizada correctamente.',
        });
      },
      error: () => {
        this.saving.set(false);
        this.message.set({
          type: 'error',
          text: 'No se pudo actualizar la moneda. Intenta de nuevo.',
        });
      },
    });
  }
}