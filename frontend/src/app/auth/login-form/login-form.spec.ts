import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  let fixture: ComponentFixture<LoginForm>;
  let element: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginForm],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginForm);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => { http.verify(); sessionStorage.clear(); });

  function input(id: string): HTMLInputElement {
    return element.querySelector<HTMLInputElement>('#' + id)!;
  }

  function fill(id: string, value: string): HTMLInputElement {
    const field = input(id);
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    return field;
  }

  function submit(): void {
    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
  }

  it('should show a field error only after interaction', () => {
    expect(element.querySelector('#email-error')).toBeNull();
    expect(element.querySelector('#password-error')).toBeNull();

    input('email').dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(element.querySelector('#email-error')?.textContent)
      .toContain('Enter your email address.');
    expect(element.querySelector('#password-error')).toBeNull();
    expect(input('email').getAttribute('aria-describedby')).toBe('email-error');
  });

  it('should mark required fields when the form is submitted', () => {
    submit();

    expect(element.querySelector('#email-error')?.textContent)
      .toContain('Enter your email address.');
    expect(element.querySelector('#password-error')?.textContent)
      .toContain('Enter your password.');
    expect(input('email').getAttribute('aria-invalid')).toBe('true');
    expect(input('password').getAttribute('aria-invalid')).toBe('true');
  });

  it('should reject malformed emails and clear the error after correction', () => {
    fill('email', 'email-invalid');
    fill('password', 'parola-de-test');
    submit();

    expect(element.querySelector('#email-error')?.textContent)
      .toContain('Enter a valid email address.');
    expect(element.querySelector('#password-error')).toBeNull();

    fill('email', 'student@exemplu.ro');

    expect(element.querySelector('#email-error')).toBeNull();
    expect(input('email').getAttribute('aria-invalid')).toBeNull();
  });

  it('should trim the email without changing the password', () => {
    fill('email', '  student@exemplu.ro  ');
    fill('password', '  parola-de-test  ');
    submit();

    expect(input('email').value).toBe('student@exemplu.ro');
    expect(input('password').value).toBe('  parola-de-test  ');
    const request = http.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ email: 'student@exemplu.ro', password: '  parola-de-test  ' });
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(element.querySelector('#email-error')).toBeNull();
    expect(element.querySelector('#password-error')).toBeNull();
  });

  it('should show and hide the password without changing it', () => {
    const password = fill('password', 'parola-de-test');
    const toggle = element.querySelector<HTMLButtonElement>('[aria-controls="password"]')!;

    expect(password.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    toggle.click();
    fixture.detectChanges();

    expect(password.type).toBe('text');
    expect(password.value).toBe('parola-de-test');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    toggle.click();
    fixture.detectChanges();

    expect(password.type).toBe('password');
    expect(password.value).toBe('parola-de-test');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
  });

  it('rejects short passwords before sending a request', () => {
    fill('email', 'student@example.com');
    fill('password', 'short');
    submit();
    expect(element.querySelector('#password-error')?.textContent).toContain('Use at least 8 characters.');
    http.expectNone('/api/auth/login');
  });

  it('prevents duplicate submission and opens the account page on success', () => {
    fill('email', 'student@example.com');
    fill('password', 'password1');
    submit();
    submit();
    const button = element.querySelector<HTMLButtonElement>('.login-button')!;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Signing in...');
    http.expectOne('/api/auth/login').flush({
      accessToken: 'access-1', refreshToken: 'refresh-1', userId: 'user-1', role: 'student',
      expiresAt: Math.floor(Date.now() / 1000) + 900,
      refreshExpiresAt: Math.floor(Date.now() / 1000) + 604800
    });
    fixture.detectChanges();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/account']);
    expect(input('password').value).toBe('');
    expect(button.disabled).toBe(false);
  });

  it.each([
    [401, 'Incorrect email or password.'],
    [400, 'Check your email and password'],
    [503, 'Sign in is temporarily unavailable.']
  ])('shows a useful error for status %s and enables retry', (status, message) => {
    fill('email', 'student@example.com');
    fill('password', 'password1');
    submit();
    http.expectOne('/api/auth/login').flush({}, { status: Number(status), statusText: 'Error' });
    fixture.detectChanges();
    expect(element.querySelector('.login-error')?.textContent).toContain(String(message));
    expect(element.querySelector<HTMLButtonElement>('.login-button')!.disabled).toBe(false);
    expect(element.querySelector('.login-button')?.classList.contains('login-failed')).toBe(true);
    fill('password', 'password2');
    expect(element.querySelector('.login-error')).toBeNull();
  });
});
