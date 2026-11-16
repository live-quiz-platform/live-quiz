import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignUpForm } from './sign-up-form';

describe('SignUpForm', () => {
  let fixture: ComponentFixture<SignUpForm>;
  let element: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignUpForm],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    fixture = TestBed.createComponent(SignUpForm);
    element = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  function input(name: string): HTMLInputElement {
    return element.querySelector<HTMLInputElement>('input[name="' + name + '"]')!;
  }

  function fill(name: string, value: string): void {
    input(name).value = value;
    input(name).dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function submit(): void {
    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
  }

  function fillValid(): void {
    fill('username', 'student');
    fill('email', 'student@example.com');
    fill('password', 'quiz-pass-123');
    fill('confirmPassword', 'quiz-pass-123');
  }

  it('should show required errors only after interaction without sending a request', () => {
    expect(element.querySelector('[role="alert"]')).toBeNull();
    submit();
    expect(element.querySelectorAll('[role="alert"]').length).toBe(4);
    for (const name of ['username', 'email', 'password', 'confirmPassword']) {
      expect(input(name).getAttribute('aria-invalid')).toBe('true');
    }
    http.expectNone('/api/auth/register');
  });

  it('should reject malformed email addresses and short passwords without sending a request', () => {
    fillValid();
    fill('email', 'invalid-email');
    fill('password', 'short');
    fill('confirmPassword', 'short');
    submit();
    expect(element.querySelector('#email-error')?.textContent)
      .toContain('Enter a valid email address.');
    expect(element.querySelector('#password-error')?.textContent)
      .toContain('Use at least 8 characters.');
    expect(fixture.componentInstance.signUpForm.valid).toBe(false);
    http.expectNone('/api/auth/register');
  });

  it('should recheck confirmation when either password changes', () => {
    fillValid();
    fill('confirmPassword', 'another-password');
    submit();
    expect(element.querySelector('#confirmation-error')?.textContent)
      .toContain('Passwords do not match.');
    expect(input('confirmPassword').getAttribute('aria-invalid')).toBe('true');
    http.expectNone('/api/auth/register');

    fill('password', 'another-password');
    expect(element.querySelector('#confirmation-error')).toBeNull();
    expect(input('confirmPassword').getAttribute('aria-invalid')).toBeNull();
    expect(fixture.componentInstance.signUpForm.valid).toBe(true);

    fill('password', 'quiz-pass-123');
    expect(element.querySelector('#confirmation-error')).not.toBeNull();
    fill('confirmPassword', 'quiz-pass-123');
    expect(element.querySelector('#confirmation-error')).toBeNull();
    expect(fixture.componentInstance.signUpForm.valid).toBe(true);
  });

  it('should trim username and email and preserve the password in the registration request', () => {
    fillValid();
    fill('username', '   ');
    submit();
    expect(element.querySelector('#username-error')?.textContent)
      .toContain('Enter your username.');
    http.expectNone('/api/auth/register');

    fill('username', '  student  ');
    fill('email', '  student@example.com  ');
    fill('password', '  long pass  ');
    fill('confirmPassword', '  long pass  ');
    submit();

    const request = http.expectOne('/api/auth/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'student@example.com',
      password: '  long pass  ',
      displayName: 'student'
    });
    expect(input('username').value).toBe('student');
    expect(input('email').value).toBe('student@example.com');
    expect(input('password').value).toBe('  long pass  ');
    expect(input('confirmPassword').value).toBe('  long pass  ');

    request.flush({ message: 'identity service unavailable' }, {
      status: 503, statusText: 'Service Unavailable'
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.signUpForm.valid).toBe(true);
    expect(element.querySelector('.field-error')).toBeNull();
  });

  it('should toggle each password separately and keep privacy active while either is visible', () => {
    fillValid();
    const privacy = vi.fn();
    fixture.componentInstance.passwordActiveChange.subscribe(privacy);
    const passwordToggle = element.querySelector<HTMLButtonElement>('[aria-controls="sign-up-password"]')!;
    const confirmationToggle = element.querySelector<HTMLButtonElement>('[aria-controls="sign-up-confirm-password"]')!;

    passwordToggle.click();
    fixture.detectChanges();
    expect(input('password').type).toBe('text');
    expect(input('confirmPassword').type).toBe('password');
    expect(passwordToggle.getAttribute('aria-pressed')).toBe('true');
    expect(privacy).toHaveBeenLastCalledWith(true);

    confirmationToggle.click();
    fixture.detectChanges();
    passwordToggle.click();
    fixture.detectChanges();
    expect(input('password').type).toBe('password');
    expect(input('confirmPassword').type).toBe('text');
    expect(privacy).toHaveBeenLastCalledWith(true);

    confirmationToggle.click();
    fixture.detectChanges();
    expect(input('confirmPassword').type).toBe('password');
    expect(confirmationToggle.getAttribute('aria-pressed')).toBe('false');
    expect(privacy).toHaveBeenLastCalledWith(false);
    expect(input('password').value).toBe('quiz-pass-123');
    expect(input('confirmPassword').value).toBe('quiz-pass-123');
  });

  it('should prevent duplicate submissions and show success only after the server response', () => {
    fillValid();
    const privacy = vi.fn();
    fixture.componentInstance.passwordActiveChange.subscribe(privacy);
    element.querySelector<HTMLButtonElement>('[aria-controls="sign-up-password"]')!.click();
    element.querySelector<HTMLButtonElement>('[aria-controls="sign-up-confirm-password"]')!.click();
    fixture.detectChanges();

    submit();
    submit();
    const request = http.expectOne('/api/auth/register');
    const button = element.querySelector<HTMLButtonElement>('[type="submit"]')!;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Creating account...');
    expect(Array.from(element.querySelectorAll('input')).every(field => field.disabled)).toBe(true);
    expect(element.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('[role="status"]')).toBeNull();

    request.flush({ userId: 'user-123', email: 'student@example.com', displayName: 'student' }, {
      status: 201, statusText: 'Created'
    });
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
    expect(element.querySelector('[role="status"]')?.textContent)
      .toContain('Your account has been created.');
    expect(Array.from(element.querySelectorAll('input')).every(field => field.value === '')).toBe(true);
    expect(input('password').type).toBe('password');
    expect(input('confirmPassword').type).toBe('password');
    expect(fixture.componentInstance.signUpForm.pristine).toBe(true);
    expect(privacy).toHaveBeenLastCalledWith(false);
    expect(element.querySelector('form')?.getAttribute('aria-busy')).toBe('false');
  });

  it.each([
    { name: 'validation error arrays', status: 400, body: { message: ['email must be an email'] },
      message: 'Check your email, username and password, then try again.' },
    { name: 'identity validation strings', status: 400, body: { message: 'display_name: is required' },
      message: 'Check your email, username and password, then try again.' },
    { name: 'duplicate email', status: 409, body: { message: 'email: already exists' },
      message: 'An account with this email already exists.' },
    { name: 'unavailable identity service', status: 503, body: { message: 'identity service unavailable' },
      message: 'Registration is temporarily unavailable. Please try again later.' },
    { name: 'identity gateway errors', status: 502, body: { message: 'identity service error' },
      message: 'Registration is temporarily unavailable. Please try again later.' },
    { name: 'unexpected server errors', status: 500, body: { message: 'Internal server error' },
      message: 'Could not create your account. Please try again.' }
  ])('should handle $name and preserve entered values', ({ status, body, message }) => {
    fillValid();
    submit();
    http.expectOne('/api/auth/register').flush(body, { status, statusText: 'Request failed' });
    fixture.detectChanges();

    expect(element.querySelector('.registration-error')?.textContent).toContain(message);
    expect(element.querySelector('[role="status"]')).toBeNull();
    expect(element.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled).toBe(false);
    expect(input('username').value).toBe('student');
    expect(input('email').value).toBe('student@example.com');
    expect(input('password').value).toBe('quiz-pass-123');
    expect(input('confirmPassword').value).toBe('quiz-pass-123');
    expect(Array.from(element.querySelectorAll('input')).every(field => !field.disabled)).toBe(true);
  });

  it('should recover from a network failure without showing success', () => {
    fillValid();
    submit();
    http.expectOne('/api/auth/register').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(element.querySelector('.registration-error')?.textContent)
      .toContain('Could not reach the server. Please try again.');
    expect(element.querySelector('[role="status"]')).toBeNull();
    expect(element.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled).toBe(false);
    expect(input('password').value).toBe('quiz-pass-123');
  });

  it('should allow retrying with a different email after a conflict', () => {
    fillValid();
    submit();
    http.expectOne('/api/auth/register').flush({ message: 'email: already exists' }, {
      status: 409, statusText: 'Conflict'
    });
    fixture.detectChanges();

    fill('email', 'another@example.com');
    expect(element.querySelector('.registration-error')).toBeNull();
    submit();
    const request = http.expectOne('/api/auth/register');
    expect(request.request.body.email).toBe('another@example.com');
    request.flush({ userId: 'user-456', email: 'another@example.com', displayName: 'student' }, {
      status: 201, statusText: 'Created'
    });
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent)
      .toContain('Your account has been created.');
  });

  it('should cancel the pending request when the page is destroyed', () => {
    fillValid();
    submit();
    const request = http.expectOne('/api/auth/register');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });
});
