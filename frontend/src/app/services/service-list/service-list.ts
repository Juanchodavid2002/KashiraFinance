import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ServiceService } from '../../core/services/service.service';
import { CurrencyService } from '../../core/services/currency.service';
import { ToastService } from '../../core/services/toast.service';
import { confirmAction } from '../../core/utils/confirm';
import { formatAmount } from '../../core/utils/format';
import type { Service } from '../../core/models/service.models';

@Component({
  selector: 'app-service-list',
  templateUrl: './service-list.html',
  styleUrl: './service-list.css',
})
export class ServiceList {
  private readonly serviceService = inject(ServiceService);
  private readonly currencyService = inject(CurrencyService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly services = signal<Service[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  private readonly currency = this.currencyService.currency;

  constructor() {
    this.load();
  }

  format(amount: string): string {
    return formatAmount(Number(amount), this.currency());
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.serviceService.list().subscribe({
      next: (res) => {
        this.services.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los servicios.');
        this.loading.set(false);
      },
    });
  }

  goDetail(service: Service): void {
    void this.router.navigate(['/app/services', service.id]);
  }

  openNew(): void {
    void this.router.navigate(['/app/services', 'new']);
  }

  async remove(service: Service): Promise<void> {
    const confirmed = await confirmAction({
      title: '¿Eliminar servicio?',
      text: `¿Eliminar el servicio "${service.name}"?`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.deletingId.set(service.id);
    this.serviceService.remove(service.id).subscribe({
      next: () => {
        this.toast.success('Servicio eliminado', service.name);
        this.load();
      },
      error: () => {
        this.deletingId.set(null);
        this.error.set('No se pudo eliminar el servicio.');
        this.toast.error('No se pudo eliminar el servicio');
      },
    });
  }
}