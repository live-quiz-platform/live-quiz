import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open the login page from the default route', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent)
      .toContain('Welcome back!');
  });

  it('should open password recovery without submitting login and return to sign in', async () => {
    const harness = await RouterTestingHarness.create('/login');
    const router = TestBed.inject(Router);

    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.forgot-password-button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(router.url).toBe('/forgot-password');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent)
      .toBe('Forgot your password?');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('input[type="password"]')).toBeNull();

    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.back-to-login')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(router.url).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent)
      .toBe('Welcome back!');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
  });

  it('should navigate to sign up, protect both password fields and return to login', async () => {
    const harness = await RouterTestingHarness.create('/login');
    const router = TestBed.inject(Router);
    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.sign-up-button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(router.url).toBe('/sign-up');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent)
      .toBe('Create your account');
    expect(harness.routeNativeElement?.querySelectorAll('input').length).toBe(4);
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();

    const page = harness.routeNativeElement!;
    const characters = page.querySelector('app-login-characters')!;
    page.querySelector<HTMLInputElement>('#sign-up-password')!.focus();
    harness.detectChanges();
    expect(characters.classList.contains('password-active')).toBe(true);
    page.querySelector<HTMLInputElement>('#sign-up-confirm-password')!.focus();
    harness.detectChanges();
    expect(characters.classList.contains('password-active')).toBe(true);
    page.querySelector<HTMLInputElement>('#sign-up-username')!.focus();
    harness.detectChanges();
    expect(characters.classList.contains('password-active')).toBe(false);

    page.querySelector<HTMLAnchorElement>('.sign-in-link')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(router.url).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
  });
});
