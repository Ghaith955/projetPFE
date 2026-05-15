import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {

  email = '';
  password = '';
  rememberSession = false;
  acceptRules = false;
  errorMessage = '';
  isLoading = false;
  isScanning = false;
  showPassword = false;

  private destroy$ = new Subject<void>();
  private heroClipEndTime: number | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Always show the login form — no auto-redirect
    // After successful login, the user will be sent to /dashboard
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onHeroVideoReady(video: HTMLVideoElement): void {
    this.configureHeroVideo(video);
    this.heroClipEndTime = Math.max(0, video.duration - 6);
  }

  startHeroVideo(video: HTMLVideoElement): void {
    this.configureHeroVideo(video);
    void video.play();
  }

  enforceHeroClip(video: HTMLVideoElement): void {
    if (this.heroClipEndTime === null || this.heroClipEndTime <= 0) {
      return;
    }

    if (video.currentTime >= this.heroClipEndTime) {
      video.currentTime = 0;
      void video.play();
    }
  }

  onLogin(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Veuillez entrer une adresse email valide.';
      return;
    }

    if (!this.acceptRules) {
      this.errorMessage = 'Veuillez accepter les regles de la plateforme.';
      return;
    }

    this.isScanning = true;
    this.isLoading = true;

    this.auth.login(this.email, this.password)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.handleLoginError(err);
          this.isLoading = false;
          this.isScanning = false;
        }
      });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  private configureHeroVideo(video: HTMLVideoElement): void {
    video.defaultPlaybackRate = 0.8;
    video.playbackRate = 0.8;
    video.muted = true;
    video.volume = 0;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private handleLoginError(err: unknown): void {
    const error = err as { error?: { message?: string }; status?: number } | null;

    if (error?.error?.message) {
      this.errorMessage = error.error.message;
    } else if (error?.status === 401) {
      this.errorMessage = 'Email ou mot de passe incorrect.';
    } else if (error?.status === 429) {
      this.errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
    } else if (error?.status === 0) {
      this.errorMessage = 'Erreur de connexion au serveur.';
    } else {
      this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
    }
  }
}