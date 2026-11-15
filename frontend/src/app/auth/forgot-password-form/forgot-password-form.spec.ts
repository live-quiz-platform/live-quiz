import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPasswordForm } from './forgot-password-form';

describe('ForgotPasswordForm', () => {
  let fixture: ComponentFixture<ForgotPasswordForm>;
  let element: HTMLElement;
  let email: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordForm]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordForm);
    element = fixture.nativeElement;
    fixture.detectChanges();
    email = element.querySelector<HTMLInputElement>('#recovery-email')!;
  });

  function fill(value: string): void {
    email.value = value;
    email.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function submit(): void {
    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
  }

  it('should validate the email after interaction and clear the error after correction', () => {
    expect(element.querySelector('[role="alert"]')).toBeNull();
    submit();
    expect(element.querySelector('[role="alert"]')?.textContent)
      .toContain('Enter your email address.');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe('recovery-email-error');

    fill('invalid-email');
    submit();
    expect(element.querySelector('[role="alert"]')?.textContent)
      .toContain('Enter a valid email address.');

    fill('student@example.com');
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(email.getAttribute('aria-invalid')).toBeNull();
    expect(fixture.componentInstance.recoveryForm.valid).toBe(true);
  });

  it('should trim the email when submitted', () => {
    fill('  student@example.com  ');
    submit();
    expect(email.value).toBe('student@example.com');
    expect(fixture.componentInstance.recoveryForm.controls.email.value)
      .toBe('student@example.com');
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });
});
