import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface RegisteredUser {
  userId: string;
  email: string;
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private readonly http = inject(HttpClient);

  register(request: RegisterRequest): Observable<RegisteredUser> {
    return this.http.post<RegisteredUser>('/api/auth/register', request, {
      timeout: 15000
    });
  }
}
