import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  selectedRole: string = 'Administrateur';
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  roles = ['Administrateur', 'Entraîneur', 'Responsable'];

  constructor(private router: Router) {}

  selectRole(role: string) { this.selectedRole = role; }

  async onLogin() {
    if (!this.email || !this.password) { this.errorMessage = 'Veuillez remplir tous les champs.'; return; }
    this.isLoading = true; this.errorMessage = '';
    try {
      const response = await fetch('http://localhost:3300/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password, role: this.selectedRole })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = data.message || 'Email ou mot de passe incorrect.';
      }
    } catch { this.errorMessage = 'Erreur de connexion au serveur.'; }
    finally { this.isLoading = false; }
  }
}