import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from '../auth.interceptor';
import { AccountPage } from './account-page';

describe('AccountPage', () => {
  let fixture: ComponentFixture<AccountPage>;
  let element: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.setItem('live-quiz-session', JSON.stringify({
      accessToken: 'access-1', refreshToken: 'refresh-1', userId: 'user-1', role: 'student',
      expiresAt: Math.floor(Date.now() / 1000) + 900,
      refreshExpiresAt: Math.floor(Date.now() / 1000) + 604800
    }));
    await TestBed.configureTestingModule({ imports: [AccountPage], providers: [
      provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()
    ] }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AccountPage);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });
  afterEach(() => { http.verify(); sessionStorage.clear(); });

  it('shows success only after the server verifies the session', () => {
    expect(element.textContent).toContain('Checking your session.');
    expect(element.textContent).not.toContain('You have successfully signed in.');
    http.expectOne('/api/me').flush({ userId: 'user-1', role: 'student' });
    fixture.detectChanges();
    expect(element.textContent).toContain('You have successfully signed in.');
    expect(element.querySelector('.role-badge')?.textContent).toBe('Student');
    expect(element.textContent).not.toContain('user-1');
  });

  it('allows retrying a temporary account error', () => {
    http.expectOne('/api/me').flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Please try again.');
    element.querySelector<HTMLButtonElement>('.account-button')!.click();
    http.expectOne('/api/me').flush({ userId: 'user-1', role: 'professor' });
    fixture.detectChanges();
    expect(element.querySelector('.role-badge')?.textContent).toBe('Instructor');
  });

  it('signs out through the BFF and returns to login', () => {
    http.expectOne('/api/me').flush({ userId: 'user-1', role: 'student' });
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.sign-out-button')!.click();
    const request = http.expectOne('/api/auth/logout');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-1' });
    request.flush({ success: true });
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login']);
    expect(sessionStorage.getItem('live-quiz-session')).toBeNull();
  });

  it('reports local-only sign out if the server is unavailable', () => {
    http.expectOne('/api/me').flush({ userId: 'user-1', role: 'student' });
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.sign-out-button')!.click();
    http.expectOne('/api/auth/logout').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login'], { queryParams: { signOut: 'local' } });
    expect(sessionStorage.getItem('live-quiz-session')).toBeNull();
  });
});
