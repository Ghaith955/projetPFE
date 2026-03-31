import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { HttpClient } from '@angular/common/http';

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

  constructor(
    private router: Router, 
    private route: ActivatedRoute,
    private api: ApiService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (this.token) {
      this.verifyToken();
    } else {
      this.isTokenChecking = false;
      this.errorMessage = 'Token invalide.';
    }
  }

  verifyToken() {
    this.http.get(`http://localhost:3300/password/reset/${this.token}`).subscribe({
      next: (data: any) => {
        this.isTokenValid = data.isTokenValid !== false;
        if (!this.isTokenValid) {
          this.errorMessage = 'Lien invalide ou expiré.';
        }
        this.isTokenChecking = false;
      },
      error: () => {
        this.errorMessage = 'Erreur de connexion.';
        this.isTokenChecking = false;
      }
    });
  }

  onSubmit() {
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

    this.api.resetPassword(this.token, {
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: (res: any) => {
        this.successMessage = 'Mot de passe réinitialisé ! Redirection...';
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Erreur.';
        this.isLoading = false;
      }
    });
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}