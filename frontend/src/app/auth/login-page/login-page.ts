import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnimatedTitle } from '../animated-title/animated-title';
import { LoginCharacters } from '../login-characters/login-characters';
import { LoginForm } from '../login-form/login-form';

@Component({
  selector: 'app-login-page',
  imports: [RouterLink, AnimatedTitle, LoginCharacters, LoginForm],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss'
})
export class LoginPage {
  protected readonly passwordActive = signal(false);
}
