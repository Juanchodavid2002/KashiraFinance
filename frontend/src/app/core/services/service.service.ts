import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  CreateServicePayload,
  CreateServicePaymentPayload,
  Service,
  ServiceDetail,
  ServiceListResponse,
  ServicePayment,
  UpdateServicePayload,
} from '../models/service.models';

@Injectable({ providedIn: 'root' })
export class ServiceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(): Observable<ServiceListResponse> {
    return this.http.get<ServiceListResponse>(`${this.apiUrl}/services`);
  }

  getById(id: string): Observable<ServiceDetail> {
    return this.http.get<ServiceDetail>(`${this.apiUrl}/services/${id}`);
  }

  create(payload: CreateServicePayload): Observable<Service> {
    return this.http.post<Service>(`${this.apiUrl}/services`, payload);
  }

  update(
    id: string,
    payload: UpdateServicePayload,
  ): Observable<Service> {
    return this.http.patch<Service>(`${this.apiUrl}/services/${id}`, payload);
  }

  remove(id: string): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(`${this.apiUrl}/services/${id}`);
  }

  addPayment(
    serviceId: string,
    payload: CreateServicePaymentPayload,
  ): Observable<ServicePayment> {
    return this.http.post<ServicePayment>(
      `${this.apiUrl}/services/${serviceId}/payments`,
      payload,
    );
  }

  removePayment(
    serviceId: string,
    paymentId: string,
  ): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(
      `${this.apiUrl}/services/${serviceId}/payments/${paymentId}`,
    );
  }
}