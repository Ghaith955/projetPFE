import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  nom: string = ''; prenom: string = ''; email: string = '';
  phone: string = ''; password: string = ''; confirmPassword: string = '';
  selectedRole: string = 'Entraîneur';
  isLoading: boolean = false; errorMessage: string = ''; successMessage: string = '';
  roles = ['Administrateur', 'Entraîneur', 'Nageur'];

  constructor(private router: Router) {}

  selectRole(role: string) { this.selectedRole = role; }

  async onRegister() {
    this.errorMessage = ''; this.successMessage = '';
    if (!this.nom || !this.prenom || !this.email || !this.phone || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Veuillez remplir tous les champs.'; return;
    }
    if (this.password !== this.confirmPassword) { this.errorMessage = 'Les mots de passe ne correspondent pas.'; return; }
    if (this.password.length < 6) { this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.'; return; }
    this.isLoading = true;
    try {
      const response = await fetch('http://localhost:3300/users/register-Admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: this.nom, prenom: this.prenom, email: this.email, phone: Number(this.phone), password: this.password, isActive: true })
      });
      const data = await response.json();
      if (response.ok) {
        this.successMessage = 'Compte créé avec succès ! Redirection...';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      } else { this.errorMessage = data.message || 'Erreur lors de la création du compte.'; }
    } catch { this.errorMessage = 'Erreur de connexion au serveur.'; }
    finally { this.isLoading = false; }
  }

  goToLogin() { this.router.navigate(['/login']); }
}