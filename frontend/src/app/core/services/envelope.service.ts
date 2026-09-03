import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  ContributeEnvelopePayload,
  Envelope,
  EnvelopeDetail,
  EnvelopePayload,
  EnvelopeUpdatePayload,
  SpendEnvelopePayload,
} from '../models/envelope.models';

@Injectable({ providedIn: 'root' })
export class EnvelopeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(): Observable<Envelope[]> {
    return this.http.get<Envelope[]>(`${this.apiUrl}/envelopes`);
  }

  getById(id: string): Observable<Envelope> {
    return this.http.get<Envelope>(`${this.apiUrl}/envelopes/${id}/basic`);
  }

  getDetail(id: string): Observable<EnvelopeDetail> {
    return this.http.get<EnvelopeDetail>(`${this.apiUrl}/envelopes/${id}`);
  }

  create(payload: EnvelopePayload): Observable<Envelope> {
    return this.http.post<Envelope>(`${this.apiUrl}/envelopes`, payload);
  }

  update(
    id: string,
    payload: EnvelopeUpdatePayload,
  ): Observable<Envelope> {
    return this.http.patch<Envelope>(`${this.apiUrl}/envelopes/${id}`, payload);
  }

  contribute(
    id: string,
    payload: ContributeEnvelopePayload,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.apiUrl}/envelopes/${id}/contribute`,
      payload,
    );
  }

  spend(
    id: string,
    payload: SpendEnvelopePayload,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.apiUrl}/envelopes/${id}/spend`,
      payload,
    );
  }

  removeMovement(
    id: string,
    movementId: string,
  ): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(
      `${this.apiUrl}/envelopes/${id}/movements/${movementId}`,
    );
  }

  remove(id: string): Observable<{ success: true }> {
    return this.http.delete<{ success: true }>(
      `${this.apiUrl}/envelopes/${id}`,
    );
  }
}