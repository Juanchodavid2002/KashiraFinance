import { Component, OnInit, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { IncomeService } from '../../core/services/income.service';
import { todayIsoDate } from '../../core/utils/format';

@Component({
  selector: 'app-income-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './income-form.html',
  styleUrl: './income-form.css',
})
export class IncomeForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly incomeService = inject(IncomeService);

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
    source: ['', [Validators.maxLength(100)]],
    notes: [''],
  });

  ngOnInit(): void {
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
            source: income.source ?? '',
            notes: income.notes ?? '',
          });
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
      source: value.source.trim() || undefined,
      notes: value.notes.trim() || undefined,
    };

    this.saving.set(true);
    this.formError.set('');

    const request =
      this.incomeId !== null
        ? this.incomeService.update(this.incomeId, payload)
        : this.incomeService.create(payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => void this.router.navigate(['/incomes']),
      error: () =>
        this.formError.set(
          'No se pudo guardar el ingreso. Revisa los datos e intenta de nuevo.',
        ),
    });
  }

  invalid(controlName: 'description' | 'amount' | 'source'): boolean {
    const control = this.form.controls[controlName];

    return control.invalid && (control.touched || control.dirty);
  }
}
