import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)]
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
});
