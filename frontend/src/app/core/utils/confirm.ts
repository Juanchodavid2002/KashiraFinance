import Swal from 'sweetalert2';

interface ConfirmOptions {
  title?: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export function confirmAction(
  options: ConfirmOptions,
): Promise<boolean> {
  return Swal.fire({
    title: options.title ?? '¿Confirmar acción?',
    text: options.text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Sí, continuar',
    cancelButtonText: options.cancelText ?? 'Cancelar',
    confirmButtonColor: options.danger
      ? 'var(--color-danger)'
      : 'var(--color-primary)',
    cancelButtonColor: 'var(--color-border)',
    buttonsStyling: true,
    customClass: {
      confirmButton: 'swal-confirm-btn',
      cancelButton: 'swal-cancel-btn',
    },
  }).then((result) => result.isConfirmed);
}