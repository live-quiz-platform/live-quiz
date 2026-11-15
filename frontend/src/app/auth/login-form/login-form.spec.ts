import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  let fixture: ComponentFixture<LoginForm>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginForm],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginForm);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

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
});
