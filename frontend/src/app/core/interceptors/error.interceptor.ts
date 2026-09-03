import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, Observable } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown): Observable<never> => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        authService.isAuthenticated()
      ) {
        toast.warning('Sesión expirada', 'Debes iniciar sesión de nuevo.');
        authService.logout();
        void router.navigate(['/login'], {
          queryParams: { expired: 1 },
        });
      } else if (
        error instanceof HttpErrorResponse &&
        !isInlineHandledStatus(error.status)
      ) {
        toast.fromHttpError(error);
      }

      return throwError(() => error);
    }),
  );
};

function isInlineHandledStatus(status: number): boolean {
  return status === 400 || status === 409 || status === 422;
}
