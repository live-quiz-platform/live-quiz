import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginCharacters } from '../login-characters/login-characters';
import { SignUpForm } from '../sign-up-form/sign-up-form';

@Component({
  selector: 'app-sign-up-page',
  imports: [RouterLink, LoginCharacters, SignUpForm],
  templateUrl: './sign-up-page.html',
  styleUrls: ['../login-page/login-page.scss', './sign-up-page.scss']
})
export class SignUpPage {
  protected readonly passwordActive = signal(false);
}
