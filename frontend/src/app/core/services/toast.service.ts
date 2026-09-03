import { Injectable, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastr = inject(ToastrService);

  success(title: string, message?: string): void {
    this.toastr.success(title, message);
  }

  error(title: string, message?: string): void {
    this.toastr.error(title, message);
  }

  info(title: string, message?: string): void {
    this.toastr.info(title, message);
  }

  warning(title: string, message?: string): void {
    this.toastr.warning(title, message);
  }

  fromHttpError(
    error: unknown,
    fallbackTitle = 'Algo salió mal',
  ): void {
    let message: string | undefined;

    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;

      if (Array.isArray(body?.message)) {
        message = body.message.join(' ');
      } else {
        message = body?.message ?? error.statusText;
      }
    }

    this.error(fallbackTitle, message);
  }
}