import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  DashboardFilters,
  DashboardSummary,
} from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  summary(filters: DashboardFilters = {}): Observable<DashboardSummary> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        params = params.set(key, `${value}`);
      }
    }

    return this.http.get<DashboardSummary>(`${this.apiUrl}/dashboard`, {
      params,
    });
  }
}
