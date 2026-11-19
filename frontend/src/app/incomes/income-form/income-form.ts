import { Component, OnInit, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ProviderService } from '../../core/services/provider.service';
import { IncomeService } from '../../core/services/income.service';
import { ToastService } from '../../core/services/toast.service';
import { MoneyInputDirective } from '../../core/directives/money-input.directive';
import { todayIsoDate } from '../../core/utils/format';

@Component({
  selector: 'app-income-form',
  imports: [ReactiveFormsModule, RouterLink, MoneyInputDirective],
  templateUrl: './income-form.html',
  styleUrl: './income-form.css',
})
export class IncomeForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly incomeService = inject(IncomeService);
  private readonly toast = inject(ToastService);
  private readonly providerService = inject(ProviderService);

  readonly providers = this.providerService.providers;
  readonly legacyProvider = signal<string | null>(null);

  private incomeId: string | null = null;

  readonly saving = signal(false);
  readonly loadingIncome = signal(false);
  readonly formError = signal('');
  readonly isEdit = signal(false);

  readonly form = this.fb.group({
    description: ['', [Validators.maxLength(200)]],
    amount: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],
    incomeDate: [todayIsoDate()],
    providerId: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.providerService.load().subscribe();

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      return;
    }

    this.incomeId = id;
    this.isEdit.set(true);
    this.loadingIncome.set(true);

    this.incomeService
      .getById(id)
      .pipe(finalize(() => this.loadingIncome.set(false)))
      .subscribe({
        next: (income) => {
          this.form.patchValue({
            description: income.description ?? '',
            amount: Number(income.amount),
            incomeDate: income.incomeDate.slice(0, 10),
            providerId: income.providerId ?? '',
            notes: income.notes ?? '',
          });
          this.legacyProvider.set(
            income.providerId ? null : (income.source ?? null),
          );
        },
        error: () =>
          this.formError.set('No se pudo cargar el ingreso solicitado.'),
      });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      description: value.description.trim() || undefined,
      amount: value.amount as number,
      incomeDate: value.incomeDate || undefined,
      providerId: value.providerId || undefined,
      notes: value.notes.trim() || undefined,
    };

    this.saving.set(true);
    this.formError.set('');

    const request =
      this.incomeId !== null
        ? this.incomeService.update(this.incomeId, payload)
        : this.incomeService.create(payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.toast.success(
          this.incomeId !== null ? 'Ingreso actualizado' : 'Ingreso registrado',
          value.description.trim() || undefined,
        );
        void this.router.navigate(['/app/incomes']);
      },
      error: () => {
        this.formError.set(
          'No se pudo guardar el ingreso. Revisa los datos e intenta de nuevo.',
        );
        this.toast.error('No se pudo guardar el ingreso');
      },
    });
  }

  invalid(controlName: 'description' | 'amount'): boolean {
    const control = this.form.controls[controlName];

    return control.invalid && (control.touched || control.dirty);
  }
}
