import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-forgot-password-form',
  imports: [ReactiveFormsModule],
  templateUrl: './forgot-password-form.html',
  styleUrls: ['../login-form/login-form.scss', './forgot-password-form.scss']
})
export class ForgotPasswordForm {
  readonly recoveryForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    })
  });

  protected hasEmailError(): boolean {
    const email = this.recoveryForm.controls.email;
    return email.invalid && email.touched;
  }

  protected onSubmit(): void {
    const email = this.recoveryForm.controls.email;
    email.setValue(email.value.trim());
    this.recoveryForm.markAllAsTouched();
  }
}
