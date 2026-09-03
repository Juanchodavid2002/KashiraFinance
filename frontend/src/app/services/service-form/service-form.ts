import { Component, OnInit, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ServiceService } from '../../core/services/service.service';
import { EnvelopeService } from '../../core/services/envelope.service';
import { ToastService } from '../../core/services/toast.service';
import type { Envelope } from '../../core/models/envelope.models';

@Component({
  selector: 'app-service-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './service-form.html',
  styleUrl: './service-form.css',
})
export class ServiceForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly serviceService = inject(ServiceService);
  private readonly envelopeService = inject(EnvelopeService);
  private readonly toast = inject(ToastService);

  serviceId: string | null = null;
  isEdit = false;

  readonly saving = signal(false);
  readonly loadingService = signal(false);
  readonly formError = signal('');
  readonly envelopes = signal<Envelope[]>([]);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    color: [''],
    notes: [''],
    envelopeId: [''],
  });

  ngOnInit(): void {
    this.envelopeService.list().subscribe({
      next: (envelopes) => this.envelopes.set(envelopes),
      error: () => this.formError.set('No se pudieron cargar los sobres.'),
    });

    const id = this.route.snapshot.paramMap.get('id');

    if (!id || id === 'new') {
      return;
    }

    this.serviceId = id;
    this.isEdit = true;
    this.loadingService.set(true);

    this.serviceService
      .getById(id)
      .pipe(finalize(() => this.loadingService.set(false)))
      .subscribe({
        next: (service) =>
          this.form.patchValue({
            name: service.name,
            color: service.color ?? '',
            notes: service.notes ?? '',
            envelopeId: service.envelopeId ?? '',
          }),
        error: () =>
          this.formError.set('No se pudo cargar el servicio solicitado.'),
      });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: {
      name: string;
      color?: string;
      notes?: string;
      envelopeId?: string | null;
    } = {
      name: value.name.trim(),
      color: value.color || undefined,
      notes: value.notes.trim() || undefined,
      envelopeId: value.envelopeId ? value.envelopeId : null,
    };

    this.saving.set(true);
    this.formError.set('');

    const request =
      this.serviceId !== null
        ? this.serviceService.update(this.serviceId, payload)
        : this.serviceService.create(payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (service) => {
        this.toast.success(
          this.serviceId !== null ? 'Servicio actualizado' : 'Servicio creado',
          service.name,
        );
        void this.router.navigate(
          this.serviceId !== null
            ? ['/app/services', this.serviceId]
            : ['/app/services'],
        );
      },
      error: () => {
        this.formError.set(
          'No se pudo guardar el servicio. Revisa los datos e intenta de nuevo.',
        );
        this.toast.error('No se pudo guardar el servicio');
      },
    });
  }

  invalid(
    controlName: 'name' | 'color' | 'notes' | 'envelopeId',
  ): boolean {
    const control = this.form.controls[controlName];

    return control.invalid && (control.touched || control.dirty);
  }
}