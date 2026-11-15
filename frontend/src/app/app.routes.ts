import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login-page/login-page').then((page) => page.LoginPage),
    title: 'Sign in | Live Quiz'
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./auth/forgot-password-page/forgot-password-page').then((page) => page.ForgotPasswordPage),
    title: 'Forgot Password | Live Quiz'
  },
  {
    path: 'sign-up',
    loadComponent: () =>
      import('./auth/sign-up-page/sign-up-page').then((page) => page.SignUpPage),
    title: 'Sign Up | Live Quiz'
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
