import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators
} from '@angular/forms';
import { finalize } from 'rxjs';
import { RegistrationService } from '../registration.service';

type SignUpField = 'username' | 'email' | 'password' | 'confirmPassword';
type PasswordField = 'password' | 'confirmPassword';

const passwordsMatch: ValidatorFn = (control) => {
  const password = control.get('password')?.value;
  const confirmation = control.get('confirmPassword')?.value;
  return password && confirmation && password !== confirmation
    ? { passwordMismatch: true }
    : null;
};

@Component({
  selector: 'app-sign-up-form',
  imports: [ReactiveFormsModule],
  templateUrl: './sign-up-form.html',
  styleUrls: ['../login-form/login-form.scss', './sign-up-form.scss']
})
export class SignUpForm {
  readonly passwordActiveChange = output<boolean>();
  protected readonly passwordVisible = signal(false);
  protected readonly confirmationVisible = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  private readonly registration = inject(RegistrationService);
  private readonly destroyRef = inject(DestroyRef);
  private focusedPassword: PasswordField | null = null;

  readonly signUpForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)]
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  }, { validators: passwordsMatch });

  protected hasError(field: SignUpField): boolean {
    const control = this.signUpForm.controls[field];
    const mismatch = field === 'confirmPassword' && this.signUpForm.hasError('passwordMismatch');
    return control.touched && (control.invalid || mismatch);
  }

  protected onPasswordFocus(field: PasswordField): void {
    this.focusedPassword = field;
    this.updatePasswordState();
  }

  protected onPasswordBlur(event: FocusEvent): void {
    const field = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && field.contains(event.relatedTarget)) {
      return;
    }
    this.focusedPassword = null;
    this.updatePasswordState();
  }

  protected togglePasswordVisibility(field: PasswordField): void {
    const visible = field === 'password' ? this.passwordVisible : this.confirmationVisible;
    visible.update((value) => !value);
    this.updatePasswordState();
  }

  protected clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.clearMessages();
    const { username, email, password } = this.signUpForm.controls;
    username.setValue(username.value.trim());
    email.setValue(email.value.trim());
    this.signUpForm.markAllAsTouched();

    if (this.signUpForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    this.signUpForm.disable({ emitEvent: false });
    this.registration.register({
      email: email.value,
      password: password.value,
      displayName: username.value
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.signUpForm.enable({ emitEvent: false });
        this.isSubmitting.set(false);
      })
    ).subscribe({
      next: () => {
        this.signUpForm.reset();
        this.passwordVisible.set(false);
        this.confirmationVisible.set(false);
        this.focusedPassword = null;
        this.updatePasswordState();
        this.successMessage.set('Your account has been created.');
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.getErrorMessage(error));
      }
    });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 400:
        return 'Check your email, username and password, then try again.';
      case 409:
        return 'An account with this email already exists.';
      case 0:
        return 'Could not reach the server. Please try again.';
      case 502:
      case 503:
        return 'Registration is temporarily unavailable. Please try again later.';
      default:
        return 'Could not create your account. Please try again.';
    }
  }

  private updatePasswordState(): void {
    this.passwordActiveChange.emit(
      this.focusedPassword !== null || this.passwordVisible() || this.confirmationVisible()
    );
  }
}
