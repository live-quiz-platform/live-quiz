import { Component, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule],
  templateUrl: './login-form.html',
  styleUrl: './login-form.scss'
})
export class LoginForm {
  readonly passwordActiveChange = output<boolean>();
  protected readonly passwordVisible = signal(false);
  private passwordFocused = false;

  readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  protected hasError(field: 'email' | 'password'): boolean {
    const control = this.loginForm.controls[field];
    return control.invalid && control.touched;
  }

  protected onPasswordFocus(): void {
    this.passwordFocused = true;
    this.updatePasswordState();
  }

  protected onPasswordBlur(event: FocusEvent): void {
    const field = event.currentTarget as HTMLElement;

    if (event.relatedTarget instanceof Node && field.contains(event.relatedTarget)) {
      return;
    }

    this.passwordFocused = false;
    this.updatePasswordState();
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
    this.updatePasswordState();
  }

  protected onSubmit(): void {
    const email = this.loginForm.controls.email;
    email.setValue(email.value.trim());
    this.loginForm.markAllAsTouched();
  }

  private updatePasswordState(): void {
    this.passwordActiveChange.emit(this.passwordFocused || this.passwordVisible());
  }
}
