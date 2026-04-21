import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  private heroClipEndTime: number | null = null;

  constructor(private router: Router, private api: ApiService) {}

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

  private configureHeroVideo(video: HTMLVideoElement): void {
    video.defaultPlaybackRate = 0.8;
    video.playbackRate = 0.8;
    video.muted = true;
    video.volume = 0;
  }

  onSubmit() {
    this.errorMessage = ''; this.successMessage = '';
    if (!this.email) { this.errorMessage = 'Veuillez entrer votre adresse email.'; return; }
    this.isLoading = true;
    
    this.api.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.successMessage = 'Un email de réinitialisation a été envoyé !';
        this.isLoading = false;
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Erreur lors de l\'envoi.';
        this.isLoading = false;
      }
    });
  }

  goToLogin() { this.router.navigate(['/login']); }
}