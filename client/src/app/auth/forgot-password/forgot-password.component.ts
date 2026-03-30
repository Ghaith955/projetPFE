import { Component } from '@angular/core';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  async onSubmit() {
    this.errorMessage = ''; this.successMessage = '';
    if (!this.email) { this.errorMessage = 'Veuillez entrer votre adresse email.'; return; }
    this.isLoading = true;
    try {
      const response = await fetch('http://localhost:3300/password/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email })
      });
      const data = await response.json();
      if (response.ok) { this.successMessage = 'Un email de réinitialisation a été envoyé !'; }
      else { this.errorMessage = data.message || 'Erreur lors de l\'envoi.'; }
    } catch { this.errorMessage = 'Erreur de connexion au serveur.'; }
    finally { this.isLoading = false; }
  }

  goToLogin() { this.router.navigate(['/login']); }
}