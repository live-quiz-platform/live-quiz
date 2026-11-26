import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService, AuthSession } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let auth: AuthService;
  const session = (token = 'access-1', refresh = 'refresh-1'): AuthSession => ({
    accessToken: token, refreshToken: refresh, userId: 'user-1', role: 'student',
    expiresAt: Math.floor(Date.now() / 1000) + 900,
    refreshExpiresAt: Math.floor(Date.now() / 1000) + 604800
  });

  beforeEach(() => {
    sessionStorage.setItem('live-quiz-session', JSON.stringify(session()));
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()
    ] });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => { http.verify(); sessionStorage.clear(); });

  it('sends the access token to the BFF', () => {
    auth.me().subscribe();
    const request = http.expectOne('/api/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-1');
    request.flush({ userId: 'user-1', role: 'student' });
  });

  it.each(['https://example.com/api/me', '//example.com/api/me', '/api/auth/login', '/api/auth/register'])(
    'does not attach session credentials to %s', (url) => {
      client.get(url).subscribe();
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    }
  );

  it('refreshes a 401 response and retries once with the rotated token', () => {
    auth.me().subscribe();
    http.expectOne('/api/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/refresh').flush(session('access-2', 'refresh-2'));
    const retried = http.expectOne('/api/me');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer access-2');
    retried.flush({ userId: 'user-1', role: 'student' });
  });

  it('shares refresh across concurrent 401 responses', () => {
    client.get('/api/one').subscribe();
    client.get('/api/two').subscribe();
    http.expectOne('/api/one').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/two').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/refresh').flush(session('access-2', 'refresh-2'));
    for (const url of ['/api/one', '/api/two']) {
      const request = http.expectOne(url);
      expect(request.request.headers.get('Authorization')).toBe('Bearer access-2');
      request.flush({});
    }
  });

  it('does not rotate again for a late 401 from the previous access token', () => {
    client.get('/api/one').subscribe();
    client.get('/api/two').subscribe();
    const first = http.expectOne('/api/one');
    const late = http.expectOne('/api/two');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/refresh').flush(session('access-2', 'refresh-2'));
    http.expectOne('/api/one').flush({});
    late.flush({}, { status: 401, statusText: 'Unauthorized' });
    const retry = http.expectOne('/api/two');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({});
    http.expectNone('/api/auth/refresh');
  });

  it('ends the session if the retried request is still unauthorized', () => {
    auth.me().subscribe({ error: () => {} });
    http.expectOne('/api/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/refresh').flush(session('access-2', 'refresh-2'));
    http.expectOne('/api/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectNone('/api/auth/refresh');
    expect(auth.hasSession()).toBe(false);
  });

  it('does not refresh ordinary server failures', () => {
    auth.me().subscribe({ error: () => {} });
    http.expectOne('/api/me').flush({}, { status: 503, statusText: 'Unavailable' });
    http.expectNone('/api/auth/refresh');
    expect(auth.hasSession()).toBe(true);
  });
});
