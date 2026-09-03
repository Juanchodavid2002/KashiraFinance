import { Component, OnInit, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ServiceService } from '../../core/services/service.service';

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

  serviceId: string | null = null;
  isEdit = false;

  readonly saving = signal(false);
  readonly loadingService = signal(false);
  readonly formError = signal('');

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    color: [''],
    notes: [''],
  });

  ngOnInit(): void {
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
    const payload = {
      name: value.name.trim(),
      color: value.color || undefined,
      notes: value.notes.trim() || undefined,
    };

    this.saving.set(true);
    this.formError.set('');

    const request =
      this.serviceId !== null
        ? this.serviceService.update(this.serviceId, payload)
        : this.serviceService.create(payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (service) =>
        void this.router.navigate(
          this.serviceId !== null
            ? ['/app/services', this.serviceId]
            : ['/app/services'],
        ),
      error: () =>
        this.formError.set(
          'No se pudo guardar el servicio. Revisa los datos e intenta de nuevo.',
        ),
    });
  }

  invalid(controlName: 'name' | 'color' | 'notes'): boolean {
    const control = this.form.controls[controlName];

    return control.invalid && (control.touched || control.dirty);
  }
}