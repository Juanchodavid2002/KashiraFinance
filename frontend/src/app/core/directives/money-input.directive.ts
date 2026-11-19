import { Directive, ElementRef, HostListener, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Campo de monto con puntos de miles (1.234.567) y coma decimal (1.234,50).
 * Se usa en <input type="text" appMoneyInput formControlName="...">.
 * El valor del control es un `number | null`.
 */
@Directive({
  selector: 'input[appMoneyInput]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MoneyInputDirective),
      multi: true,
    },
  ],
})
export class MoneyInputDirective implements ControlValueAccessor {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    const input = this.el.nativeElement;
    input.setAttribute('inputmode', 'decimal');
    input.setAttribute('autocomplete', 'off');
  }

  writeValue(value: number | string | null): void {
    this.el.nativeElement.value =
      value === null || value === undefined || value === ''
        ? ''
        : this.format(String(value).replace('.', ','));
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.el.nativeElement.disabled = disabled;
  }

  @HostListener('input')
  onInput(): void {
    const input = this.el.nativeElement;
    const caret = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = this.countSignificant(input.value.slice(0, caret));

    const formatted = this.format(input.value);
    input.value = formatted;

    // Reposiciona el cursor tras el mismo número de dígitos/coma que había.
    let seen = 0;
    let pos = 0;
    while (pos < formatted.length && seen < digitsBeforeCaret) {
      if (formatted[pos] !== '.') {
        seen++;
      }
      pos++;
    }
    input.setSelectionRange(pos, pos);

    this.onChange(this.toNumber(formatted));
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  private countSignificant(text: string): number {
    return text.replace(/[^0-9,]/g, '').length;
  }

  /** Deja solo dígitos y una coma decimal (máx. 2 decimales) y agrupa miles. */
  private format(raw: string): string {
    const cleaned = raw.replace(/[^0-9,]/g, '');
    const commaIndex = cleaned.indexOf(',');
    const hasComma = commaIndex !== -1;

    let integer = hasComma ? cleaned.slice(0, commaIndex) : cleaned;
    const decimals = hasComma
      ? cleaned.slice(commaIndex + 1).replace(/,/g, '').slice(0, 2)
      : '';

    integer = integer.replace(/^0+(?=\d)/, '');
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    if (!hasComma) {
      return grouped;
    }

    return `${grouped === '' ? '0' : grouped},${decimals}`;
  }

  private toNumber(formatted: string): number | null {
    if (formatted === '') {
      return null;
    }

    const value = Number(formatted.replace(/\./g, '').replace(',', '.'));

    return Number.isNaN(value) ? null : value;
  }
}
