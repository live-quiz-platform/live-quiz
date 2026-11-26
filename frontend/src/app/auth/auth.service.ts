import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, defer, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';

export type UserRole = 'student' | 'professor' | 'administrator';

export interface AuthUser {
  userId: string;
  role: UserRole;
}

export interface AuthSession extends AuthUser {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshExpiresAt: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'live-quiz-session';
  private readonly session = signal<AuthSession | null>(this.readSession());
  private refreshRequest: Observable<AuthSession> | null = null;
  private sessionVersion = 0;

  readonly user = computed<AuthUser | null>(() => {
    const session = this.session();
    return session ? { userId: session.userId, role: session.role } : null;
  });
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);
  readonly hasSession = computed(() => this.session() !== null);

  login(request: LoginRequest): Observable<AuthSession> {
    return defer(() => {
      this.clearSession();
      const version = this.sessionVersion;
      return this.http.post<AuthSession>('/api/auth/login', request, { timeout: 15000 }).pipe(
        tap((session) => {
          if (version !== this.sessionVersion) {
            throw this.unauthorized();
          }
          this.saveSession(session);
        })
      );
    });
  }

  getAccessToken(): Observable<string> {
    return defer(() => {
      const session = this.session();
      if (!session || session.refreshExpiresAt <= Date.now() / 1000) {
        this.clearSession();
        return throwError(() => this.unauthorized());
      }
      return session.expiresAt > Date.now() / 1000 + 15
        ? of(session.accessToken)
        : this.refresh().pipe(map((updated) => updated.accessToken));
    });
  }

  refresh(): Observable<AuthSession> {
    if (this.refreshRequest) {
      return this.refreshRequest;
    }

    const session = this.session();
    if (!session || session.refreshExpiresAt <= Date.now() / 1000) {
      this.clearSession();
      return throwError(() => this.unauthorized());
    }

    const version = this.sessionVersion;
    const request = this.http.post<AuthSession>('/api/auth/refresh', {
      refreshToken: session.refreshToken
    }, { timeout: 15000 }).pipe(
      tap((updated) => {
        if (version !== this.sessionVersion) {
          throw this.unauthorized();
        }
        this.saveSession(updated);
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && version === this.sessionVersion) {
          this.clearSession();
        }
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.refreshRequest === request) {
          this.refreshRequest = null;
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.refreshRequest = request;
    return request;
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>('/api/me', { timeout: 15000 });
  }

  logout(): Observable<{ success: boolean }> {
    return defer(() => {
      const session = this.session();
      this.clearSession();
      return session
        ? this.http.post<{ success: boolean }>('/api/auth/logout', {
          refreshToken: session.refreshToken
        }, { timeout: 15000 })
        : of({ success: true });
    });
  }

  clearSession(): void {
    this.sessionVersion++;
    this.session.set(null);
    this.refreshRequest = null;
    try {
      this.document.defaultView?.sessionStorage.removeItem(this.storageKey);
    } catch {}
  }

  private saveSession(session: AuthSession): void {
    if (!this.validSession(session)) {
      throw new HttpErrorResponse({ status: 502, statusText: 'Invalid session response' });
    }
    this.session.set(session);
    try {
      this.document.defaultView?.sessionStorage.setItem(this.storageKey, JSON.stringify(session));
    } catch {}
  }

  private readSession(): AuthSession | null {
    try {
      const storage = this.document.defaultView?.sessionStorage;
      const saved = storage?.getItem(this.storageKey);
      if (saved) {
        const session: unknown = JSON.parse(saved);
        if (this.validSession(session)) {
          return session;
        }
        storage?.removeItem(this.storageKey);
      }
    } catch {}
    return null;
  }

  private validSession(value: unknown): value is AuthSession {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const session = value as Partial<AuthSession>;
    return typeof session.accessToken === 'string' && session.accessToken.length > 0
      && typeof session.refreshToken === 'string' && session.refreshToken.length > 0
      && typeof session.userId === 'string' && session.userId.length > 0
      && (session.role === 'student' || session.role === 'professor' || session.role === 'administrator')
      && typeof session.expiresAt === 'number' && Number.isFinite(session.expiresAt)
      && typeof session.refreshExpiresAt === 'number' && Number.isFinite(session.refreshExpiresAt)
      && session.refreshExpiresAt > Date.now() / 1000;
  }

  private unauthorized(): HttpErrorResponse {
    return new HttpErrorResponse({ status: 401, statusText: 'Session expired' });
  }
}
