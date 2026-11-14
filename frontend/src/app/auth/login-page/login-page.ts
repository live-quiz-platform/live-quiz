import { Component, signal } from '@angular/core';
import { LoginCharacters } from '../login-characters/login-characters';
import { LoginForm } from '../login-form/login-form';

@Component({
  selector: 'app-login-page',
  imports: [LoginCharacters, LoginForm],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss'
})
export class LoginPage {
  protected readonly passwordActive = signal(false);
}
