import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  phone?: number;
  role: 'RESPONSABLE' | 'ENTRAINEUR' | 'NAGEUR';
  imageprofile?: string;
  preferences?: { theme: string };
  roleData?: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3300/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { this.currentUserSubject.next(JSON.parse(stored)); }
      catch { localStorage.removeItem('user'); }
    }
  }

  get currentUser(): User | null { return this.currentUserSubject.value; }
  get token(): string | null { return localStorage.getItem('token'); }
  get isLoggedIn(): boolean { return !!this.token; }
  get role(): string | null { return this.currentUser?.role || null; }
  get isCoach(): boolean { return this.role === 'ENTRAINEUR'; }

  getCoachSwimmerIds(): string[] {
    if (!this.isCoach) return [];
    const nageurs = this.currentUser?.roleData?.nageurs || [];
    if (!Array.isArray(nageurs)) return [];
    return nageurs
      .map((n: any) => n?._id || n?.id || n)
      .filter((id: any) => !!id)
      .map((id: any) => String(id));
  }

  hasCoachAccess(nageurId: string): boolean {
    if (!this.isCoach) return true;
    if (!nageurId) return false;
    const swimmerIds = this.getCoachSwimmerIds();
    return swimmerIds.includes(String(nageurId));
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      })
    );
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getMe(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`).pipe(
      tap((user: any) => {
        const current = { ...this.currentUser, ...user, id: user._id };
        localStorage.setItem('user', JSON.stringify(current));
        this.currentUserSubject.next(current);
      })
    );
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile`, data).pipe(
      tap((res: any) => {
        if (res.user) {
          const updated = { ...this.currentUser, ...res.user, id: res.user._id };
          localStorage.setItem('user', JSON.stringify(updated));
          this.currentUserSubject.next(updated);
        }
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/change-password`, { currentPassword, newPassword });
  }

  getDashboardRoute(): string {
    switch (this.role) {
      case 'RESPONSABLE': return '/dashboard';
      case 'ENTRAINEUR': return '/dashboard';
      case 'NAGEUR': return '/dashboard';
      default: return '/login';
    }
  }
}
