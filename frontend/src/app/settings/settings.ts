import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { ThemeService, type ThemePreference } from '../core/services/theme.service';
import { CategoryList } from '../categories/category-list/category-list';
import { AuthService } from '../core/services/auth.service';
import { CurrencyService } from '../core/services/currency.service';
import { ProviderService } from '../core/services/provider.service';
import { ToastService } from '../core/services/toast.service';
import { confirmAction } from '../core/utils/confirm';
import {
  CURRENCY_LABELS,
  SUPPORTED_CURRENCIES,
  type Currency,
} from '../core/models/auth.models';
import type { Provider } from '../core/models/provider.models';

type SettingsModule = 'cuenta' | 'general' | 'proveedores' | 'categorias';

/** Módulos de la pantalla. Para agregar uno: añadirlo aquí y su bloque en el HTML. */
const MODULES: { id: SettingsModule; label: string; icon: string }[] = [
  { id: 'cuenta', label: 'Mi cuenta', icon: '👤' },
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'proveedores', label: 'Proveedores', icon: '🤝' },
  { id: 'categorias', label: 'Categorías', icon: '🏷️' },
];

@Component({
  selector: 'app-settings',
  imports: [FormsModule, CategoryList],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly currencyService = inject(CurrencyService);
  private readonly providerService = inject(ProviderService);
  private readonly toast = inject(ToastService);

  readonly currencies = SUPPORTED_CURRENCIES;
  readonly currencyLabels = CURRENCY_LABELS;

  readonly selectedCurrency = signal(this.currencyService.currency());
  readonly saving = signal(false);
  readonly message = signal<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  // ── Módulos (pestañas) ──
  readonly modules = MODULES;
  readonly activeModule = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => {
        const id = params.get('modulo');
        const found = MODULES.find((m) => m.id === id);

        // Cada módulo carga sus datos solo cuando se abre.
        if (found?.id === 'proveedores') {
          this.providerService.load().subscribe();
        }

        return found?.id ?? 'cuenta';
      }),
    ),
    { initialValue: 'cuenta' as SettingsModule },
  );

  selectModule(id: SettingsModule): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { modulo: id },
      replaceUrl: true,
    });
  }

  onCurrencyChange(value: string): void {
    this.updateSelection(value);
    this.save();
  }

  updateSelection(value: string): void {
    this.selectedCurrency.set(value as Currency);
  }

  // ── Apariencia ──
  private readonly themeService = inject(ThemeService);
  readonly themePreference = this.themeService.preference;
  readonly themeOptions: { id: ThemePreference; label: string; icon: string }[] = [
    { id: 'light', label: 'Claro', icon: '☀️' },
    { id: 'dark', label: 'Oscuro', icon: '🌙' },
    { id: 'system', label: 'Automático', icon: '💻' },
  ];

  setTheme(preference: ThemePreference): void {
    this.themeService.set(preference);
  }

  // ── Mi cuenta ──
  readonly user = this.authService.currentUser;
  readonly profileName = signal(this.authService.currentUser()?.name ?? '');
  readonly profileUsername = signal(
    this.authService.currentUser()?.username ?? '',
  );
  readonly profileBusy = signal(false);

  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly showPasswords = signal(false);
  readonly passwordBusy = signal(false);
  readonly passwordError = signal<string | null>(null);

  readonly profileChanged = computed(() => {
    const user = this.user();

    return (
      this.profileName().trim() !== (user?.name ?? '') ||
      this.profileUsername().trim().toLowerCase() !== (user?.username ?? '')
    );
  });

  saveProfile(): void {
    const name = this.profileName().trim();
    const username = this.profileUsername().trim().toLowerCase();

    if (name.length < 2) {
      this.toast.error('Nombre inválido', 'Debe tener al menos 2 caracteres.');
      return;
    }

    if (username && !/^[a-z0-9_.]{3,30}$/.test(username)) {
      this.toast.error(
        'Usuario inválido',
        'Usa 3 a 30 caracteres: letras, números, "_" y ".".',
      );
      return;
    }

    if (this.profileBusy()) {
      return;
    }

    this.profileBusy.set(true);
    this.authService
      .updateProfile({ name, username: username || undefined })
      .subscribe({
        next: () => {
          this.profileBusy.set(false);
          this.toast.success('Perfil actualizado');
        },
        error: (error: { status: number }) => {
          this.profileBusy.set(false);
          this.toast.error(
            'No se pudo actualizar el perfil',
            error.status === 409 ? 'Ese usuario ya está en uso.' : undefined,
          );
        },
      });
  }

  changePassword(): void {
    const current = this.currentPassword();
    const next = this.newPassword();

    this.passwordError.set(null);

    if (!current) {
      this.passwordError.set('Ingresa tu contraseña actual.');
      return;
    }

    if (next.length < 8) {
      this.passwordError.set('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (next !== this.confirmPassword()) {
      this.passwordError.set('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    if (next === current) {
      this.passwordError.set('La nueva contraseña debe ser distinta a la actual.');
      return;
    }

    this.passwordBusy.set(true);
    this.authService
      .changePassword({ currentPassword: current, newPassword: next })
      .subscribe({
        next: () => {
          this.passwordBusy.set(false);
          this.currentPassword.set('');
          this.newPassword.set('');
          this.confirmPassword.set('');
          this.toast.success('Contraseña actualizada');
        },
        error: (error: { status: number }) => {
          this.passwordBusy.set(false);
          this.passwordError.set(
            error.status === 401
              ? 'La contraseña actual no es correcta.'
              : 'No se pudo cambiar la contraseña. Intenta de nuevo.',
          );
        },
      });
  }

  // ── Proveedores ──
  readonly providers = this.providerService.providers;
  readonly newProviderName = signal('');
  readonly providerBusy = signal(false);
  readonly editingProviderId = signal<string | null>(null);
  readonly editingProviderName = signal('');

  addProvider(): void {
    const name = this.newProviderName().trim();

    if (!name || this.providerBusy()) {
      return;
    }

    this.providerBusy.set(true);
    this.providerService.create({ name }).subscribe({
      next: () => {
        this.newProviderName.set('');
        this.providerBusy.set(false);
        this.toast.success('Proveedor agregado', name);
      },
      error: (error: { status: number }) => {
        this.providerBusy.set(false);
        this.toast.error(
          'No se pudo agregar el proveedor',
          error.status === 409 ? 'Ya existe un proveedor con ese nombre.' : undefined,
        );
      },
    });
  }

  startEditProvider(provider: Provider): void {
    this.editingProviderId.set(provider.id);
    this.editingProviderName.set(provider.name);
  }

  cancelEditProvider(): void {
    this.editingProviderId.set(null);
  }

  saveProvider(provider: Provider): void {
    const name = this.editingProviderName().trim();

    if (!name || this.providerBusy()) {
      return;
    }

    if (name === provider.name) {
      this.cancelEditProvider();
      return;
    }

    this.providerBusy.set(true);
    this.providerService.update(provider.id, { name }).subscribe({
      next: () => {
        this.providerBusy.set(false);
        this.cancelEditProvider();
        this.toast.success('Proveedor actualizado', name);
      },
      error: (error: { status: number }) => {
        this.providerBusy.set(false);
        this.toast.error(
          'No se pudo actualizar el proveedor',
          error.status === 409 ? 'Ya existe un proveedor con ese nombre.' : undefined,
        );
      },
    });
  }

  async removeProvider(provider: Provider): Promise<void> {
    const confirmed = await confirmAction({
      title: `¿Eliminar "${provider.name}"?`,
      text:
        provider.debtCount + provider.incomeCount > 0
          ? `Sus ${provider.incomeCount} ingreso(s) y ${provider.debtCount} deuda(s) se conservan con su nombre, pero ya no estarán ligados a él.`
          : 'Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.providerService.remove(provider.id).subscribe({
      next: () => this.toast.success('Proveedor eliminado', provider.name),
      error: () => this.toast.error('No se pudo eliminar el proveedor'),
    });
  }

  private save(): void {
    const currency = this.selectedCurrency();

    this.message.set(null);
    this.saving.set(true);

    this.authService.updateCurrency(currency).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set({
          type: 'success',
          text: 'Moneda actualizada correctamente.',
        });
      },
      error: () => {
        this.saving.set(false);
        this.message.set({
          type: 'error',
          text: 'No se pudo actualizar la moneda. Intenta de nuevo.',
        });
      },
    });
  }
}
