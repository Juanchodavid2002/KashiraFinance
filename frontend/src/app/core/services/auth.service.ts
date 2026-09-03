import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CurrencyService } from './currency.service';
import type {
  AuthResponse,
  Currency,
  LoginPayload,
  MessageResponse,
  RegisterPayload,
  ResetPasswordPayload,
  UpdateCurrencyPayload,
  User,
  VerifyResetCodePayload,
} from '../models/auth.models';

const TOKEN_KEY = 'kashira_token';
const USER_KEY = 'kashira_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly currencyService = inject(CurrencyService);

  private readonly apiUrl = environment.apiUrl;

  private readonly currentUserSignal = signal<User | null>(
    this.readStoredUser(),
  );
  private readonly tokenSignal = signal<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);

  constructor() {
    const user = this.readStoredUser();

    if (user?.currency) {
      this.currencyService.setCurrency(user.currency);
    }
  }

  register(payload: RegisterPayload) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/register`, payload)
      .pipe(
        tap((response) => {
          this.storeSession(response);

          if (response.user.currency) {
            this.currencyService.setCurrency(response.user.currency);
          }
        }),
      );
  }

  login(payload: LoginPayload) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, payload)
      .pipe(
        tap((response) => {
          this.storeSession(response);

          if (response.user.currency) {
            this.currencyService.setCurrency(response.user.currency);
          }
        }),
      );
  }

  forgotPassword(email: string) {
    return this.http.post<MessageResponse>(
      `${this.apiUrl}/auth/forgot-password`,
      { email },
    );
  }

  verifyResetCode(payload: VerifyResetCodePayload) {
    return this.http.post<MessageResponse>(
      `${this.apiUrl}/auth/verify-reset-code`,
      payload,
    );
  }

  resetPassword(payload: ResetPasswordPayload) {
    return this.http.post<MessageResponse>(
      `${this.apiUrl}/auth/reset-password`,
      payload,
    );
  }

  updateCurrency(currency: Currency) {
    return this.http
      .patch<{ id: string; currency: Currency }>(
        `${this.apiUrl}/users/settings`,
        { currency } satisfies UpdateCurrencyPayload,
      )
      .pipe(
        tap(() => {
          this.currencyService.setCurrency(currency);

          const user = this.currentUserSignal();

          if (user) {
            this.currentUserSignal.set({ ...user, currency });
            localStorage.setItem(
              USER_KEY,
              JSON.stringify({ ...user, currency }),
            );
          }
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  private storeSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.tokenSignal.set(response.accessToken);
    this.currentUserSignal.set(response.user);
  }

  private readStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
