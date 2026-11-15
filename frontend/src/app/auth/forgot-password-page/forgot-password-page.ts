import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginCharacters } from '../login-characters/login-characters';
import { ForgotPasswordForm } from '../forgot-password-form/forgot-password-form';

@Component({
  selector: 'app-forgot-password-page',
  imports: [RouterLink, LoginCharacters, ForgotPasswordForm],
  templateUrl: './forgot-password-page.html',
  styleUrls: ['../login-page/login-page.scss', './forgot-password-page.scss']
})
export class ForgotPasswordPage {}
