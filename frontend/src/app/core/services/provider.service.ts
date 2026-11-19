import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Provider, ProviderPayload } from '../models/provider.models';

/**
 * Proveedores (empresas, bancos o personas con quienes tienes ingresos o deudas),
 * parametrizados en Configuración y compartidos por toda la app.
 */
@Injectable({ providedIn: 'root' })
export class ProviderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/providers`;

  private readonly providersSignal = signal<Provider[]>([]);

  readonly providers = this.providersSignal.asReadonly();

  load(): Observable<Provider[]> {
    return this.http
      .get<Provider[]>(this.apiUrl)
      .pipe(tap((providers) => this.providersSignal.set(providers)));
  }

  create(payload: ProviderPayload): Observable<Provider> {
    return this.http
      .post<Provider>(this.apiUrl, payload)
      .pipe(tap(() => this.load().subscribe()));
  }

  update(id: string, payload: Partial<ProviderPayload>): Observable<Provider> {
    return this.http
      .patch<Provider>(`${this.apiUrl}/${id}`, payload)
      .pipe(tap(() => this.load().subscribe()));
  }

  remove(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(tap(() => this.load().subscribe()));
  }
}
