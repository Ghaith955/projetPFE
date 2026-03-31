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

  constructor(private router: Router, private api: ApiService) {}

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