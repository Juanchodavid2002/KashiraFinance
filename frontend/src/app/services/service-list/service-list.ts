import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ServiceService } from '../../core/services/service.service';
import { CurrencyService } from '../../core/services/currency.service';
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

  remove(service: Service): void {
    if (!confirm(`¿Eliminar el servicio "${service.name}"?`)) {
      return;
    }

    this.deletingId.set(service.id);
    this.serviceService.remove(service.id).subscribe({
      next: () => this.load(),
      error: () => {
        this.deletingId.set(null);
        this.error.set('No se pudo eliminar el servicio.');
      },
    });
  }
}