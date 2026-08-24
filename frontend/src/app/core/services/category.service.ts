import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Category, CategoryPayload } from '../models/expense.models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }

  create(payload: CategoryPayload): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, payload);
  }

  update(id: string, payload: Partial<CategoryPayload>): Observable<Category> {
    return this.http.patch<Category>(
      `${this.apiUrl}/categories/${id}`,
      payload,
    );
  }

  remove(id: string): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(
      `${this.apiUrl}/categories/${id}`,
    );
  }
}
