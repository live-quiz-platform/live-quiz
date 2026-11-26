import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/') || request.url.startsWith('/api/auth/')
    || request.headers.has('Authorization')) {
    return next(request);
  }

  const auth = inject(AuthService);
  if (!auth.hasSession()) {
    return next(request);
  }

  return auth.getAccessToken().pipe(
    switchMap((token) => next(request.clone({
      setHeaders: { Authorization: 'Bearer ' + token }
    })).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401) {
          return throwError(() => error);
        }
        const refreshed = auth.accessToken() !== token
          ? auth.getAccessToken()
          : auth.refresh().pipe(map((session) => session.accessToken));

        return refreshed.pipe(
          switchMap((updated) => next(request.clone({
            setHeaders: { Authorization: 'Bearer ' + updated }
          }))),
          catchError((retryError: HttpErrorResponse) => {
            if (retryError.status === 401) {
              auth.clearSession();
            }
            return throwError(() => retryError);
          })
        );
      })
    ))
  );
};
