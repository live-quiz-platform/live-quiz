import { Component, output, signal } from '@angular/core';
import {
  FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators
} from '@angular/forms';

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

  protected onSubmit(): void {
    const { username, email } = this.signUpForm.controls;
    username.setValue(username.value.trim());
    email.setValue(email.value.trim());
    this.signUpForm.markAllAsTouched();
  }

  private updatePasswordState(): void {
    this.passwordActiveChange.emit(
      this.focusedPassword !== null || this.passwordVisible() || this.confirmationVisible()
    );
  }
}
