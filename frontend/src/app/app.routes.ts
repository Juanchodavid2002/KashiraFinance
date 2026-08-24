import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/register/register').then((m) => m.Register),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./expenses/expense-list/expense-list').then(
            (m) => m.ExpenseList,
          ),
      },
      {
        path: 'expenses/nuevo',
        loadComponent: () =>
          import('./expenses/expense-form/expense-form').then(
            (m) => m.ExpenseForm,
          ),
      },
      {
        path: 'expenses/:id/editar',
        loadComponent: () =>
          import('./expenses/expense-form/expense-form').then(
            (m) => m.ExpenseForm,
          ),
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./categories/category-list/category-list').then(
            (m) => m.CategoryList,
          ),
      },
      {
        path: 'incomes',
        loadComponent: () =>
          import('./incomes/income-list/income-list').then((m) => m.IncomeList),
      },
      {
        path: 'incomes/new',
        loadComponent: () =>
          import('./incomes/income-form/income-form').then((m) => m.IncomeForm),
      },
      {
        path: 'incomes/:id/edit',
        loadComponent: () =>
          import('./incomes/income-form/income-form').then((m) => m.IncomeForm),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
