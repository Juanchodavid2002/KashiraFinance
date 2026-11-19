import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  BudgetDetail,
  BudgetLine,
  BudgetLinePayload,
  BudgetSummary,
} from '../models/budget.models';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/budgets`;

  list(): Observable<BudgetSummary[]> {
    return this.http.get<BudgetSummary[]>(this.apiUrl);
  }

  getById(id: string): Observable<BudgetDetail> {
    return this.http.get<BudgetDetail>(`${this.apiUrl}/${id}`);
  }

  create(name: string): Observable<{ id: string; name: string }> {
    return this.http.post<{ id: string; name: string }>(this.apiUrl, { name });
  }

  update(
    id: string,
    payload: { name?: string; notes?: string },
  ): Observable<{ id: string; name: string }> {
    return this.http.patch<{ id: string; name: string }>(
      `${this.apiUrl}/${id}`,
      payload,
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  duplicate(id: string): Observable<{ id: string; name: string }> {
    return this.http.post<{ id: string; name: string }>(
      `${this.apiUrl}/${id}/duplicate`,
      {},
    );
  }

  addLine(id: string, payload: BudgetLinePayload): Observable<BudgetLine> {
    return this.http.post<BudgetLine>(`${this.apiUrl}/${id}/lines`, payload);
  }

  updateLine(
    id: string,
    lineId: string,
    payload: BudgetLinePayload,
  ): Observable<BudgetLine> {
    return this.http.patch<BudgetLine>(
      `${this.apiUrl}/${id}/lines/${lineId}`,
      payload,
    );
  }

  removeLine(id: string, lineId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/lines/${lineId}`);
  }
}
