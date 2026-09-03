import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'KashiraFinance — Toma el control de tus finanzas',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./landing/landing').then((m) => m.Landing),
  },
  {
    path: 'login',
    title: 'Iniciar sesión — KashiraFinance',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Crear cuenta — KashiraFinance',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/register/register').then((m) => m.Register),
  },
  {
    path: 'forgot-password',
    title: 'Recuperar contraseña — KashiraFinance',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/forgot-password/forgot-password').then(
        (m) => m.ForgotPassword,
      ),
  },
  {
    path: 'app',
    title: 'Dashboard — KashiraFinance',
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
      {
        path: 'debts',
        loadComponent: () =>
          import('./debts/debt-list/debt-list').then((m) => m.DebtList),
      },
      {
        path: 'debts/nuevo',
        loadComponent: () =>
          import('./debts/debt-form/debt-form').then((m) => m.DebtForm),
      },
      {
        path: 'debts/:id',
        loadComponent: () =>
          import('./debts/debt-detail/debt-detail').then(
            (m) => m.DebtDetailComponent,
          ),
      },
      {
        path: 'debts/:id/editar',
        loadComponent: () =>
          import('./debts/debt-form/debt-form').then((m) => m.DebtForm),
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./services/service-list/service-list').then(
            (m) => m.ServiceList,
          ),
      },
      {
        path: 'services/new',
        loadComponent: () =>
          import('./services/service-form/service-form').then(
            (m) => m.ServiceForm,
          ),
      },
      {
        path: 'services/:id',
        loadComponent: () =>
          import('./services/service-detail/service-detail').then(
            (m) => m.ServiceDetailComponent,
          ),
      },
      {
        path: 'services/:id/editar',
        loadComponent: () =>
          import('./services/service-form/service-form').then(
            (m) => m.ServiceForm,
          ),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./settings/settings').then((m) => m.Settings),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
