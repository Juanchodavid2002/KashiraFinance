import { Component, OnInit, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EnvelopeService } from '../../core/services/envelope.service';
import { ToastService } from '../../core/services/toast.service';
import type { EnvelopeFrequency } from '../../core/models/envelope.models';
import { ENVELOPE_FREQUENCIES, ENVELOPE_FREQUENCY_LABELS } from '../../core/models/envelope.models';

@Component({
  selector: 'app-envelope-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './envelope-form.html',
  styleUrl: './envelope-form.css',
})
export class EnvelopeForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly envelopeService = inject(EnvelopeService);
  private readonly toast = inject(ToastService);

  envelopeId: string | null = null;
  isEdit = false;

  readonly frequencies = ENVELOPE_FREQUENCIES;

  readonly frequencyLabel = (frequency: EnvelopeFrequency): string =>
    ENVELOPE_FREQUENCY_LABELS[frequency];

  readonly saving = signal(false);
  readonly loadingEnvelope = signal(false);
  readonly formError = signal('');

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    frequency: ['MONTHLY' as EnvelopeFrequency, Validators.required],
    dayOfMonth: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
    amount: [
      null as number | null,
      [Validators.required, Validators.min(0)],
    ],
    notes: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id || id === 'new') {
      return;
    }

    this.envelopeId = id;
    this.isEdit = true;
    this.loadingEnvelope.set(true);

    this.envelopeService
      .getById(id)
      .pipe(finalize(() => this.loadingEnvelope.set(false)))
      .subscribe({
        next: (envelope) =>
          this.form.patchValue({
            name: envelope.name,
            frequency: envelope.frequency,
            dayOfMonth: envelope.dayOfMonth,
            amount: Number(envelope.amount),
            notes: envelope.notes ?? '',
          }),
        error: () =>
          this.formError.set('No se pudo cargar el sobre solicitado.'),
      });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const frequency = value.frequency;
    const payload = {
      name: value.name.trim(),
      frequency,
      dayOfMonth: value.dayOfMonth,
      amount: Number(value.amount),
      notes: value.notes.trim() || undefined,
    };

    this.saving.set(true);
    this.formError.set('');

    const request =
      this.envelopeId !== null
        ? this.envelopeService.update(this.envelopeId, payload)
        : this.envelopeService.create(payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (envelope) => {
        this.toast.success(
          this.envelopeId !== null ? 'Sobre actualizado' : 'Sobre creado',
          envelope.name,
        );
        void this.router.navigate(['/app/envelopes']);
      },
      error: () => {
        this.formError.set(
          'No se pudo guardar el sobre. Revisa los datos e intenta de nuevo.',
        );
        this.toast.error('No se pudo guardar el sobre');
      },
    });
  }

  invalid(controlName: 'name' | 'frequency' | 'dayOfMonth' | 'amount' | 'notes'): boolean {
    const control = this.form.controls[controlName];

    return control.invalid && (control.touched || control.dirty);
  }
}