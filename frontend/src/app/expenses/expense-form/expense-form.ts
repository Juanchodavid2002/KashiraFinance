import { Component, OnInit, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CategoryService } from '../../core/services/category.service';
import { ExpenseService } from '../../core/services/expense.service';
import { ToastService } from '../../core/services/toast.service';
import {
  PAYMENT_METHOD_LABELS,
  todayIsoDate,
} from '../../core/utils/format';
import type {
  Category,
  PaymentMethod,
} from '../../core/models/expense.models';

@Component({
  selector: 'app-expense-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.css',
})
export class ExpenseForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);

  private expenseId: string | null = null;

  readonly categories = signal<Category[]>([]);
  readonly saving = signal(false);
  readonly loadingExpense = signal(false);
  readonly formError = signal('');
  readonly isEdit = signal(false);

  readonly paymentMethods = Object.entries(PAYMENT_METHOD_LABELS) as [
    PaymentMethod,
    string,
  ][];

  readonly form = this.fb.group({
    description: ['', [Validators.maxLength(200)]],
    amount: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],
    categoryId: ['', [Validators.required]],
    expenseDate: [todayIsoDate()],
    paymentMethod: ['CASH' as PaymentMethod, [Validators.required]],
    notes: [''],
  });

  ngOnInit(): void {
    this.categoryService.list().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.formError.set('No se pudieron cargar las categorías.'),
    });

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      return;
    }

    this.expenseId = id;
    this.isEdit.set(true);
    this.loadingExpense.set(true);

    this.expenseService
      .getById(id)
      .pipe(finalize(() => this.loadingExpense.set(false)))
      .subscribe({
        next: (expense) => {
          this.form.patchValue({
            description: expense.description ?? '',
            amount: Number(expense.amount),
            categoryId: expense.category.id,
            expenseDate: expense.expenseDate.slice(0, 10),
            paymentMethod: expense.paymentMethod,
            notes: expense.notes ?? '',
          });
        },
        error: () =>
          this.formError.set('No se pudo cargar el gasto solicitado.'),
      });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: {
      description?: string;
      amount: number;
      categoryId: string;
      expenseDate?: string;
      paymentMethod: PaymentMethod;
      notes?: string;
    } = {
      description: value.description.trim() || undefined,
      amount: value.amount as number,
      categoryId: value.categoryId,
      expenseDate: value.expenseDate || undefined,
      paymentMethod: value.paymentMethod,
      notes: value.notes.trim() || undefined,
    };

    this.saving.set(true);
    this.formError.set('');

    const request =
      this.expenseId !== null
        ? this.expenseService.update(this.expenseId, payload)
        : this.expenseService.create(payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.toast.success(
          this.expenseId !== null
            ? 'Gasto actualizado'
            : 'Gasto registrado',
          value.description.trim(),
        );
        void this.router.navigate(['/app/expenses']);
      },
      error: () => {
        this.formError.set(
          'No se pudo guardar el gasto. Revisa los datos e intenta de nuevo.',
        );
        this.toast.error('No se pudo guardar el gasto');
      },
    });
  }

  invalid(controlName: 'description' | 'amount' | 'categoryId'): boolean {
    const control = this.form.controls[controlName];

    return control.invalid && (control.touched || control.dirty);
  }
}
