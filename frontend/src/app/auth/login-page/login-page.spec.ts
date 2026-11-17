import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  function field(id: string): HTMLInputElement {
    return element.querySelector<HTMLInputElement>('#' + id)!;
  }

  function lookingAway(): boolean {
    return element.querySelector('app-login-characters')!
      .classList.contains('password-active');
  }

  it('should look away while the password field has focus', () => {
    field('password').focus();
    fixture.detectChanges();
    expect(lookingAway()).toBe(true);

    field('email').focus();
    fixture.detectChanges();
    expect(lookingAway()).toBe(false);
  });

  it('should keep looking away while the password is visible outside the field', () => {
    const toggle = element.querySelector<HTMLButtonElement>('.password-toggle')!;
    field('password').focus();
    toggle.focus();
    toggle.click();
    fixture.detectChanges();
    expect(lookingAway()).toBe(true);

    field('email').focus();
    fixture.detectChanges();
    expect(field('password').type).toBe('text');
    expect(lookingAway()).toBe(true);

    toggle.click();
    fixture.detectChanges();
    expect(field('password').type).toBe('password');
    expect(lookingAway()).toBe(false);
  });
});
