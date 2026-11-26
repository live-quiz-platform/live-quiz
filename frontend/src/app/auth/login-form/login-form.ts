import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-form.html',
  styleUrl: './login-form.scss'
})
export class LoginForm {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly passwordActiveChange = output<boolean>();
  protected readonly passwordVisible = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal(
    this.route.snapshot.queryParamMap.get('sessionExpired') === 'true'
      ? 'Your session has expired. Please sign in again.'
      : this.route.snapshot.queryParamMap.get('signOut') === 'local'
        ? 'Signed out on this device. The server could not be reached.'
        : ''
  );
  private passwordFocused = false;

  readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)]
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

  protected clearMessages(): void {
    this.errorMessage.set('');
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.clearMessages();
    const { email, password } = this.loginForm.controls;
    email.setValue(email.value.trim());
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    this.loginForm.disable({ emitEvent: false });
    this.auth.login({ email: email.value, password: password.value }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.loginForm.enable({ emitEvent: false });
        this.isSubmitting.set(false);
      })
    ).subscribe({
      next: () => {
        this.loginForm.reset();
        this.passwordVisible.set(false);
        this.passwordFocused = false;
        this.updatePasswordState();
        void this.router.navigate(['/account']);
      },
      error: (error: HttpErrorResponse) => this.errorMessage.set(this.getErrorMessage(error))
    });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 400:
        return 'Check your email and password, then try again.';
      case 401:
        return 'Incorrect email or password.';
      case 0:
        return 'Could not reach the server. Please try again.';
      case 502:
      case 503:
        return 'Sign in is temporarily unavailable. Please try again later.';
      default:
        return 'Could not sign in. Please try again.';
    }
  }

  private updatePasswordState(): void {
    this.passwordActiveChange.emit(this.passwordFocused || this.passwordVisible());
  }
}
