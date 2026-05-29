import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/dashboard-layout/dashboard-layout').then((c) => c.DashboardLayoutComponent),
    canActivate: [authGuard],

    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard').then(
            (c) => c.DashboardComponent,
          ),
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/students/pages/students-list/students-list').then(
            (c) => c.StudentsList,
          ),
      },
      {
        path: 'teachers',
        loadComponent: () =>
          import('./features/teachers/pages/teachers-list/teachers-list').then(
            (c) => c.TeachersList,
          ),
      },
      {
        path: 'levels',
        loadComponent: () =>
          import('./features/levels/pages/levels-list/levels-list').then((c) => c.LevelsList),
      },
      {
        path: 'subjects',
        loadComponent: () =>
          import('./features/subjects/pages/subjects-list/subjects-list').then(
            (c) => c.SubjectsList,
          ),
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./features/groups/pages/groups-list/groups-list').then((m) => m.GroupsList),
      },
      {
        path: 'finance',
        children: [
          {
            path: '',
            redirectTo: 'payments',
            pathMatch: 'full',
          },
          {
            path: 'payments',
            loadComponent: () =>
              import('./features/finance/pages/payments-list/payments-list').then(
                (m) => m.PaymentsList,
              ),
          },
          {
            path: 'expenses',
            loadComponent: () =>
              import('./features/finance/pages/expenses-list/expenses-list').then(
                (m) => m.ExpensesList,
              ),
          },
        ],
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];
