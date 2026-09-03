import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  CreateDebtPayload,
  CreateDebtPaymentPayload,
  Debt,
  DebtDetail,
  DebtListResponse,
  DebtPayment,
  UpdateDebtPayload,
} from '../models/debt.models';

@Injectable({ providedIn: 'root' })
export class DebtService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(
    filters: { search?: string; page?: number; limit?: number } = {},
  ): Observable<DebtListResponse> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`);
      }
    }

    return this.http.get<DebtListResponse>(`${this.apiUrl}/debts`, { params });
  }

  getById(id: string): Observable<DebtDetail> {
    return this.http.get<DebtDetail>(`${this.apiUrl}/debts/${id}`);
  }

  create(payload: CreateDebtPayload): Observable<Debt> {
    return this.http.post<Debt>(`${this.apiUrl}/debts`, payload);
  }

  update(id: string, payload: UpdateDebtPayload): Observable<Debt> {
    return this.http.patch<Debt>(`${this.apiUrl}/debts/${id}`, payload);
  }

  remove(id: string): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(`${this.apiUrl}/debts/${id}`);
  }

  addPayment(
    debtId: string,
    payload: CreateDebtPaymentPayload,
  ): Observable<DebtPayment> {
    return this.http.post<DebtPayment>(
      `${this.apiUrl}/debts/${debtId}/payments`,
      payload,
    );
  }

  removePayment(
    debtId: string,
    paymentId: string,
  ): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(
      `${this.apiUrl}/debts/${debtId}/payments/${paymentId}`,
    );
  }
}
