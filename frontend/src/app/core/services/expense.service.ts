import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  CreateExpensePayload,
  Expense,
  ExpenseFilters,
  ExpenseListResponse,
  UpdateExpensePayload,
} from '../models/expense.models';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(filters: ExpenseFilters = {}): Observable<ExpenseListResponse> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`);
      }
    }

    return this.http.get<ExpenseListResponse>(`${this.apiUrl}/expenses`, {
      params,
    });
  }

  getById(id: string): Observable<Expense> {
    return this.http.get<Expense>(`${this.apiUrl}/expenses/${id}`);
  }

  create(payload: CreateExpensePayload): Observable<Expense> {
    return this.http.post<Expense>(`${this.apiUrl}/expenses`, payload);
  }

  update(id: string, payload: UpdateExpensePayload): Observable<Expense> {
    return this.http.patch<Expense>(
      `${this.apiUrl}/expenses/${id}`,
      payload,
    );
  }

  remove(id: string): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(
      `${this.apiUrl}/expenses/${id}`,
    );
  }
}
