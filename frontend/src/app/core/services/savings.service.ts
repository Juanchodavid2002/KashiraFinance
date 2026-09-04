import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  CreateSavingsPayload,
  DepositSavingsPayload,
  SavingsDetail,
  SavingsFilters,
  SavingsGoal,
  SavingsListResponse,
  UpdateSavingsPayload,
  WithdrawSavingsPayload,
} from '../models/savings.models';

@Injectable({ providedIn: 'root' })
export class SavingsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(filters?: SavingsFilters): Observable<SavingsListResponse> {
    let params = new HttpParams();

    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.page) {
      params = params.set('page', String(filters.page));
    }
    if (filters?.limit) {
      params = params.set('limit', String(filters.limit));
    }

    return this.http.get<SavingsListResponse>(`${this.apiUrl}/savings`, {
      params,
    });
  }

  total(): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/savings/total`);
  }

  getDetail(id: string): Observable<SavingsDetail> {
    return this.http.get<SavingsDetail>(`${this.apiUrl}/savings/${id}`);
  }

  create(payload: CreateSavingsPayload): Observable<SavingsGoal> {
    return this.http.post<SavingsGoal>(`${this.apiUrl}/savings`, payload);
  }

  update(
    id: string,
    payload: UpdateSavingsPayload,
  ): Observable<SavingsGoal> {
    return this.http.patch<SavingsGoal>(`${this.apiUrl}/savings/${id}`, payload);
  }

  remove(id: string): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(`${this.apiUrl}/savings/${id}`);
  }

  deposit(
    id: string,
    payload: DepositSavingsPayload,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.apiUrl}/savings/${id}/deposit`,
      payload,
    );
  }

  withdraw(
    id: string,
    payload: WithdrawSavingsPayload,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.apiUrl}/savings/${id}/withdraw`,
      payload,
    );
  }

  removeMovement(
    id: string,
    movementId: string,
  ): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(
      `${this.apiUrl}/savings/${id}/movements/${movementId}`,
    );
  }
}
