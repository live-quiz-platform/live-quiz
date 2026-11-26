import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, AuthUser, UserRole } from '../auth.service';

@Component({
  selector: 'app-account-page',
  imports: [RouterLink],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss'
})
export class AccountPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly user = signal<AuthUser | null>(null);
  protected readonly loading = signal(true);
  protected readonly signingOut = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly roleNames: Record<UserRole, string> = {
    student: 'Student', professor: 'Instructor', administrator: 'Administrator'
  };

  ngOnInit(): void {
    this.loadUser();
  }

  protected loadUser(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.auth.me().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (user) => this.user.set(user),
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.auth.clearSession();
          void this.router.navigate(['/login'], { queryParams: { sessionExpired: 'true' } });
          return;
        }
        this.errorMessage.set('Could not load your account. Please try again.');
      }
    });
  }

  protected signOut(): void {
    if (this.signingOut()) {
      return;
    }
    this.signingOut.set(true);
    this.auth.logout().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.signingOut.set(false))
    ).subscribe({
      next: () => { void this.router.navigate(['/login']); },
      error: () => {
        void this.router.navigate(['/login'], { queryParams: { signOut: 'local' } });
      }
    });
  }
}
