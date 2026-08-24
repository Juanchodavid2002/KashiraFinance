import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  CreateIncomePayload,
  Income,
  IncomeFilters,
  IncomeListResponse,
  UpdateIncomePayload,
} from '../models/income.models';

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(filters: IncomeFilters = {}): Observable<IncomeListResponse> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`);
      }
    }

    return this.http.get<IncomeListResponse>(`${this.apiUrl}/incomes`, {
      params,
    });
  }

  getById(id: string): Observable<Income> {
    return this.http.get<Income>(`${this.apiUrl}/incomes/${id}`);
  }

  create(payload: CreateIncomePayload): Observable<Income> {
    return this.http.post<Income>(`${this.apiUrl}/incomes`, payload);
  }

  update(id: string, payload: UpdateIncomePayload): Observable<Income> {
    return this.http.patch<Income>(`${this.apiUrl}/incomes/${id}`, payload);
  }

  remove(id: string): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(
      `${this.apiUrl}/incomes/${id}`,
    );
  }
}
