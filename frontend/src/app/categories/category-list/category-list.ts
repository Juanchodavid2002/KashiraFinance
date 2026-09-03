import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';

import { CategoryService } from '../../core/services/category.service';
import { ToastService } from '../../core/services/toast.service';
import { confirmAction } from '../../core/utils/confirm';
import type { Category } from '../../core/models/expense.models';

@Component({
  selector: 'app-category-list',
  imports: [ReactiveFormsModule],
  templateUrl: './category-list.html',
  styleUrl: './category-list.css',
})
export class CategoryList implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly listError = signal('');
  readonly createError = signal('');

  readonly form = this.fb.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(60)],
    ],
    color: ['#2563eb'],
  });

  readonly ownCategories = computed(() =>
    this.categories().filter((category) => !category.isDefault),
  );

  readonly defaultCategories = computed(() =>
    this.categories().filter((category) => category.isDefault),
  );

  ngOnInit(): void {
    this.loadCategories();
  }

  submit(): void {
    if (this.form.invalid || this.creating()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, color } = this.form.getRawValue();

    this.creating.set(true);
    this.createError.set('');

    this.categoryService
      .create({ name: name.trim(), color })
      .pipe(finalize(() => this.creating.set(false)))
      .subscribe({
        next: () => {
          this.form.reset({ name: '', color: '#2563eb' });
          this.toast.success('Categoría creada', name.trim());
          this.loadCategories();
        },
        error: () => {
          this.createError.set(
            'No se pudo crear la categoría. Verifica que el nombre no exista.',
          );
          this.toast.error(
            'Error al crear categoría',
            'Verifica que el nombre no exista.',
          );
        },
      });
  }

  async remove(category: Category): Promise<void> {
    const isDefault = category.isDefault;
    const message = isDefault
      ? `Dejará de mostrarse en tu lista, pero no se eliminará para otros usuarios.`
      : `Solo es posible si no tiene gastos asociados.`;

    const confirmed = await confirmAction({
      title: isDefault
        ? `¿Ocultar "${category.name}"?`
        : `¿Eliminar "${category.name}"?`,
      text: message,
      confirmText: isDefault ? 'Sí, ocultar' : 'Sí, eliminar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.deletingId.set(category.id);
    this.categoryService
      .remove(category.id)
      .pipe(finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success(
            isDefault ? 'Categoría oculta' : 'Categoría eliminada',
            category.name,
          );
          this.loadCategories();
        },
        error: () => {
          this.listError.set(
            isDefault
              ? 'No se pudo ocultar la categoría. Intenta de nuevo.'
              : 'No se pudo eliminar. Una categoría con gastos asociados no puede borrarse.',
          );
          this.toast.error(
            'No se pudo eliminar',
            isDefault
              ? 'Intenta de nuevo.'
              : 'Una categoría con gastos asociados no puede borrarse.',
          );
        },
      });
  }

  invalidName(): boolean {
    const control = this.form.controls.name;

    return control.invalid && (control.touched || control.dirty);
  }

  private loadCategories(): void {
    this.loading.set(true);
    this.listError.set('');

    this.categoryService
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (categories) => this.categories.set(categories),
        error: () =>
          this.listError.set('No se pudieron cargar las categorías.'),
      });
  }
}
