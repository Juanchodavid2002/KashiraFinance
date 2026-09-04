import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';

import { DebtService } from '../../core/services/debt.service';
import { ToastService } from '../../core/services/toast.service';
import { todayIsoDate } from '../../core/utils/format';
import type { DebtKind, InterestType } from '../../core/models/debt.models';

function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCMonth(date.getUTCMonth() + months);

  const yy = date.getUTCFullYear();
  const mm = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getUTCDate()}`.padStart(2, '0');

  return `${yy}-${mm}-${dd}`;
}

@Component({
  selector: 'app-debt-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './debt-form.html',
  styleUrl: './debt-form.css',
})
export class DebtForm implements OnInit, OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly debtService = inject(DebtService);
  private readonly toast = inject(ToastService);

  private readonly valueSubscription: Subscription;

  debtId: string | null = null;

  readonly saving = signal(false);
  readonly loadingDebt = signal(false);
  readonly formError = signal('');
  readonly isEdit = signal(false);

  readonly dueDateLabel = signal('');

  readonly form = this.fb.group({
    kind: ['ENTITY' as DebtKind, [Validators.required]],
    interestType: ['NONE' as InterestType, [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    lender: ['', [Validators.maxLength(200)]],
    totalAmount: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],
    totalInstallments: [
      null as number | null,
      [Validators.min(1), Validators.pattern(/^\d+$/)],
    ],
    paidInstallments: [
      null as number | null,
      [Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
    installmentAmount: [null as number | null, [Validators.min(0.01)]],
    startDate: [todayIsoDate()],
    dueDate: [''],
    notes: [''],
  });

  readonly isEntity = (): boolean => this.form.controls.kind.value === 'ENTITY';

  constructor() {
    this.valueSubscription = this.form.valueChanges.subscribe(() => {
      this.syncDueDate();
      this.updateDueDateLabel();
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.syncDueDate();
      this.updateDueDateLabel();
      return;
    }

    this.debtId = id;
    this.isEdit.set(true);
    this.loadingDebt.set(true);

    this.debtService
      .getById(id)
      .pipe(finalize(() => this.loadingDebt.set(false)))
      .subscribe({
        next: (debt) => {
          this.form.patchValue(
            {
              kind: debt.kind,
              interestType: debt.interestType ?? 'NONE',
              name: debt.name,
              lender: debt.lender ?? '',
              totalAmount: Number(debt.totalAmount),
              totalInstallments: debt.totalInstallments ?? null,
              paidInstallments: debt.paidInstallments ?? null,
              installmentAmount: debt.installmentAmount
                ? Number(debt.installmentAmount)
                : null,
              startDate: debt.startDate.slice(0, 10),
              dueDate: debt.dueDate ? debt.dueDate.slice(0, 10) : '',
              notes: debt.notes ?? '',
            },
            { emitEvent: false },
          );
          this.syncDueDate();
          this.updateDueDateLabel();
        },
        error: () =>
          this.formError.set('No se pudo cargar la deuda solicitada.'),
      });
  }

  ngOnDestroy(): void {
    this.valueSubscription.unsubscribe();
  }

  setKind(kind: DebtKind): void {
    this.form.controls.kind.setValue(kind);
    this.syncDueDate();
    this.updateDueDateLabel();
  }

  setInterestType(interestType: InterestType): void {
    this.form.controls.interestType.setValue(interestType);
  }

  syncDueDate(): void {
    if (this.isEntity()) {
      const due = this.calculateDueDate();
      this.form.controls.dueDate.setValue(due, { emitEvent: false });
    }
  }

  updateDueDateLabel(): void {
    this.dueDateLabel.set(
      this.isEntity() ? (this.calculateDueDate() || '—') : '',
    );
  }

  private calculateDueDate(): string {
    const { startDate, totalInstallments, paidInstallments } =
      this.form.getRawValue();
    const start = startDate || todayIsoDate();
    const total = totalInstallments ?? 0;
    const paid = paidInstallments ?? 0;
    const remaining = total - paid;

    if (remaining <= 0) {
      return '';
    }

    return addMonths(start, remaining);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      kind: value.kind as DebtKind,
      interestType: value.interestType as InterestType,
      name: value.name.trim(),
      lender: value.lender.trim() || undefined,
      totalAmount: value.totalAmount as number,
      totalInstallments:
        value.totalInstallments !== null ? value.totalInstallments : undefined,
      paidInstallments:
        value.paidInstallments !== null ? value.paidInstallments : undefined,
      installmentAmount:
        value.installmentAmount !== null
          ? value.installmentAmount
          : undefined,
      startDate: value.startDate || undefined,
      dueDate: value.dueDate || undefined,
      notes: value.notes.trim() || undefined,
    };

    this.saving.set(true);
    this.formError.set('');

    const request =
      this.debtId !== null
        ? this.debtService.update(this.debtId, payload)
        : this.debtService.create(payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        const debtName = value.name.trim();
        this.toast.success(
          this.debtId !== null ? 'Deuda actualizada' : 'Deuda creada',
          debtName,
        );
        void this.router.navigate(
          this.debtId !== null ? ['/app/debts', this.debtId] : ['/app/debts'],
        );
      },
      error: (err) => {
        const message =
          err?.error?.message?.[0] ??
          'No se pudo guardar la deuda. Revisa los datos e intenta de nuevo.';
        this.formError.set(message);
        this.toast.error('No se pudo guardar la deuda', message);
      },
    });
  }

  invalid(
    controlName:
      | 'name'
      | 'lender'
      | 'totalAmount'
      | 'totalInstallments'
      | 'paidInstallments'
      | 'installmentAmount'
      | 'dueDate',
  ): boolean {
    const control = this.form.controls[controlName];

    return control.invalid && (control.touched || control.dirty);
  }
}
