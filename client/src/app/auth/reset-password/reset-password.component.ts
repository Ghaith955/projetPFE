import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {

  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  isLoading: boolean = false;
  isTokenValid: boolean = false;
  isTokenChecking: boolean = true;

  errorMessage: string = '';
  successMessage: string = '';

  constructor(private router: Router, private route: ActivatedRoute) {}

  async ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (this.token) {
      await this.verifyToken();
    } else {
      this.isTokenChecking = false;
      this.errorMessage = 'Token invalide.';
    }
  }

  async verifyToken() {
    try {
      const response = await fetch(`http://localhost:3300/password/reset-password/${this.token}`);
      const data = await response.json();

      this.isTokenValid = response.ok && data.isTokenValid;

      if (!this.isTokenValid) {
        this.errorMessage = 'Lien invalide ou expiré.';
      }

    } catch {
      this.errorMessage = 'Erreur de connexion.';
    } finally {
      this.isTokenChecking = false;
    }
  }

  async onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'Minimum 6 caractères.';
      return;
    }

    this.isLoading = true;

    try {
      const response = await fetch(`http://localhost:3300/password/reset-password/${this.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: this.newPassword,
          confirmPassword: this.confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        this.successMessage = 'Mot de passe réinitialisé ! Redirection...';
        setTimeout(() => this.router.navigate(['/login']), 2500);
      } else {
        this.errorMessage = data.message || 'Erreur.';
      }

    } catch {
      this.errorMessage = 'Erreur de connexion.';
    } finally {
      this.isLoading = false;
    }
  }

  
  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  
  goToLogin() {
    this.router.navigate(['/login']);
  }
}