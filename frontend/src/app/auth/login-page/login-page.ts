import { Component } from '@angular/core';
import { LoginCharacters } from '../login-characters/login-characters';

@Component({
  selector: 'app-login-page',
  imports: [LoginCharacters],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss'
})
export class LoginPage {}
