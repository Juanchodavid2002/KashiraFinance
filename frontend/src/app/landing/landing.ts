import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

type DashboardTab = 'mes' | 'semana' | 'anio';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly menuOpen = signal(false);
  readonly scrolled = signal(false);
  readonly activeTab = signal<DashboardTab>('mes');

  private revealObserver?: IntersectionObserver;
  private counterObserver?: IntersectionObserver;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.menuOpen()) {
      this.toggleMenu(false);
    }
  }

  toggleMenu(force?: boolean): void {
    const open = force ?? !this.menuOpen();
    this.menuOpen.set(open);
    document.body.classList.toggle('menu-open', open);
  }

  ngAfterViewInit(): void {
    const root: HTMLElement = this.host.nativeElement;

    this.revealObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    root
      .querySelectorAll('.reveal')
      .forEach((el) => this.revealObserver?.observe(el));

    this.counterObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          this.animateCounter(el);
          observer.unobserve(el);
        }
      },
      { threshold: 0.4 },
    );
    root
      .querySelectorAll<HTMLElement>('[data-count]')
      .forEach((el) => this.counterObserver?.observe(el));
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    this.counterObserver?.disconnect();
    document.body.classList.remove('menu-open');
  }

  private animateCounter(el: HTMLElement): void {
    const target = Number.parseInt(el.dataset['count'] ?? '0', 10);
    const duration = 1600;
    const start = performance.now();

    const step = (now: number): void => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = this.formatCOP(Math.floor(target * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = this.formatCOP(target);
      }
    };
    requestAnimationFrame(step);
  }

  private formatCOP(value: number): string {
    return '$' + value.toLocaleString('es-CO');
  }
}
