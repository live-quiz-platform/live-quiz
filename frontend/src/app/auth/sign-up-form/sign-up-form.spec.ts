import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignUpForm } from './sign-up-form';

describe('SignUpForm', () => {
  let fixture: ComponentFixture<SignUpForm>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SignUpForm] }).compileComponents();
    fixture = TestBed.createComponent(SignUpForm);
    element = fixture.nativeElement;
    fixture.detectChanges();
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

  it('should show required errors only after interaction', () => {
    expect(element.querySelector('[role="alert"]')).toBeNull();
    submit();
    expect(element.querySelectorAll('[role="alert"]').length).toBe(4);
    for (const name of ['username', 'email', 'password', 'confirmPassword']) {
      expect(input(name).getAttribute('aria-invalid')).toBe('true');
    }
  });

  it('should reject malformed email addresses and short passwords', () => {
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
  });

  it('should recheck confirmation when either password changes', () => {
    fillValid();
    fill('confirmPassword', 'another-password');
    submit();
    expect(element.querySelector('#confirmation-error')?.textContent)
      .toContain('Passwords do not match.');
    expect(input('confirmPassword').getAttribute('aria-invalid')).toBe('true');

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

  it('should trim username and email while preserving both passwords', () => {
    fillValid();
    fill('username', '   ');
    submit();
    expect(element.querySelector('#username-error')?.textContent)
      .toContain('Enter your username.');

    fill('username', '  student  ');
    fill('email', '  student@example.com  ');
    fill('password', '  long pass  ');
    fill('confirmPassword', '  long pass  ');
    submit();

    expect(input('username').value).toBe('student');
    expect(input('email').value).toBe('student@example.com');
    expect(input('password').value).toBe('  long pass  ');
    expect(input('confirmPassword').value).toBe('  long pass  ');
    expect(fixture.componentInstance.signUpForm.valid).toBe(true);
    expect(element.querySelector('[role="alert"]')).toBeNull();
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
    expect(confirmationToggle.getAttribute('aria-label')).toBe('Show password confirmation');
    expect(privacy).toHaveBeenLastCalledWith(false);
    expect(input('password').value).toBe('quiz-pass-123');
    expect(input('confirmPassword').value).toBe('quiz-pass-123');
  });
});
