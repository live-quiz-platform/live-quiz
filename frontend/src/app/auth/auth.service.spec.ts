import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService, AuthSession } from './auth.service';

describe('AuthService', () => {
  let http: HttpTestingController;
  const session = (changes: Partial<AuthSession> = {}): AuthSession => ({
    accessToken: 'access-1', refreshToken: 'refresh-1', userId: 'user-1', role: 'student',
    expiresAt: Math.floor(Date.now() / 1000) + 900,
    refreshExpiresAt: Math.floor(Date.now() / 1000) + 604800, ...changes
  });

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); sessionStorage.clear(); });

  function signedIn(): AuthService {
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'student@example.com', password: 'password1' }).subscribe();
    const request = http.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'student@example.com', password: 'password1' });
    request.flush(session());
    return auth;
  }

  it('stores the session and exposes user information without the password', () => {
    const auth = signedIn();
    expect(auth.user()).toEqual({ userId: 'user-1', role: 'student' });
    const stored = JSON.parse(sessionStorage.getItem('live-quiz-session')!);
    expect(stored.refreshToken).toBe('refresh-1');
    expect(stored.password).toBeUndefined();
  });

  it('restores a valid tab session even when the access token has expired', () => {
    sessionStorage.setItem('live-quiz-session', JSON.stringify(session({ expiresAt: 1 })));
    const auth = TestBed.inject(AuthService);
    let token = '';
    auth.getAccessToken().subscribe((value) => token = value);
    http.expectOne('/api/auth/refresh').flush(session({ accessToken: 'access-2', refreshToken: 'refresh-2' }));
    expect(token).toBe('access-2');
    expect(JSON.parse(sessionStorage.getItem('live-quiz-session')!).refreshToken).toBe('refresh-2');
  });

  it.each(['invalid JSON', JSON.stringify(session({ refreshExpiresAt: 1 })), '{}'])(
    'ignores an unusable stored session: %s', (stored) => {
      sessionStorage.setItem('live-quiz-session', stored);
      expect(TestBed.inject(AuthService).hasSession()).toBe(false);
    }
  );

  it('shares concurrent refresh requests and replaces both tokens', () => {
    const auth = signedIn();
    const tokens: string[] = [];
    auth.refresh().subscribe((value) => tokens.push(value.accessToken));
    auth.refresh().subscribe((value) => tokens.push(value.accessToken));
    const request = http.expectOne('/api/auth/refresh');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-1' });
    request.flush(session({ accessToken: 'access-2', refreshToken: 'refresh-2' }));
    expect(tokens).toEqual(['access-2', 'access-2']);
    auth.refresh().subscribe();
    const next = http.expectOne('/api/auth/refresh');
    expect(next.request.body).toEqual({ refreshToken: 'refresh-2' });
    next.flush(session({ accessToken: 'access-3', refreshToken: 'refresh-3' }));
  });

  it('clears an invalid refresh session', () => {
    const auth = signedIn();
    auth.refresh().subscribe({ error: () => {} });
    http.expectOne('/api/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.hasSession()).toBe(false);
    expect(sessionStorage.getItem('live-quiz-session')).toBeNull();
  });

  it('keeps the session when refresh temporarily cannot reach the server', () => {
    const auth = signedIn();
    auth.refresh().subscribe({ error: () => {} });
    http.expectOne('/api/auth/refresh').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(auth.hasSession()).toBe(true);
  });

  it('clears local state on logout even when the server is unavailable', () => {
    const auth = signedIn();
    auth.logout().subscribe({ error: () => {} });
    expect(auth.hasSession()).toBe(false);
    const logout = http.expectOne('/api/auth/logout');
    expect(logout.request.body).toEqual({ refreshToken: 'refresh-1' });
    logout.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(sessionStorage.getItem('live-quiz-session')).toBeNull();
  });

  it('does not restore a session when a refresh finishes after logout', () => {
    const auth = signedIn();
    auth.refresh().subscribe({ error: () => {} });
    const refresh = http.expectOne('/api/auth/refresh');
    auth.logout().subscribe();
    refresh.flush(session({ accessToken: 'access-2', refreshToken: 'refresh-2' }));
    http.expectOne('/api/auth/logout').flush({ success: true });
    expect(auth.hasSession()).toBe(false);
  });

  it('rejects an incomplete login response', () => {
    const auth = TestBed.inject(AuthService);
    let status = 0;
    auth.login({ email: 'student@example.com', password: 'password1' }).subscribe({ error: (error) => status = error.status });
    http.expectOne('/api/auth/login').flush({ accessToken: 'incomplete' });
    expect(status).toBe(502);
    expect(auth.hasSession()).toBe(false);
  });
});
