import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Don't intercept external API calls (e.g. Groq) — only touch local backend
    if (!req.url.startsWith('http://localhost')) {
      return next.handle(req);
    }

    const token = localStorage.getItem('token');

    let authReq = req;
    if (token) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Only auto-redirect on 401 for NON-auth endpoints.
        // Auth endpoints (login, register) return 401 for invalid credentials
        // and should be handled by the component, not the interceptor.
        const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
        if (error.status === 401 && !isAuthEndpoint) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
