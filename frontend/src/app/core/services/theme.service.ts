import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_KEY = 'kashira_theme';

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_KEY);

    return value === 'light' || value === 'dark' || value === 'system'
      ? value
      : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Tema claro/oscuro. El modo oscuro aplica a la zona privada (/app); las
 * páginas públicas (landing, login) mantienen siempre su diseño claro.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly router = inject(Router);
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  private readonly preferenceSignal = signal<ThemePreference>(readStored());
  private readonly systemDark = signal(this.media.matches);
  private readonly inApp = signal(window.location.pathname.startsWith('/app'));

  readonly preference = this.preferenceSignal.asReadonly();

  /** Tema que realmente se está mostrando dentro de la app. */
  readonly resolved = computed<ResolvedTheme>(() => {
    const preference = this.preferenceSignal();

    if (preference === 'system') {
      return this.systemDark() ? 'dark' : 'light';
    }

    return preference;
  });

  constructor() {
    this.media.addEventListener('change', (event) =>
      this.systemDark.set(event.matches),
    );

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) =>
        this.inApp.set(event.urlAfterRedirects.startsWith('/app')),
      );

    effect(() => {
      document.documentElement.setAttribute(
        'data-theme',
        this.inApp() ? this.resolved() : 'light',
      );
    });
  }

  set(preference: ThemePreference): void {
    this.preferenceSignal.set(preference);

    try {
      localStorage.setItem(THEME_KEY, preference);
    } catch {
      // Sin almacenamiento: el tema solo dura la sesión.
    }
  }

  /** Alterna entre claro y oscuro (fija la preferencia explícita). */
  toggle(): void {
    this.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }
}
