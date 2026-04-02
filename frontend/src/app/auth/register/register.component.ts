import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  nom = ''; prenom = ''; email = ''; phone = '';
  password = ''; confirmPassword = '';
  selectedRole: string = 'NAGEUR';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;

  // Image Upload
  imageFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  // Nageur fields
  age: number | null = null;
  sexe = 'Masculin';
  poids: number | null = null;
  club = '';

  // Entraineur fields
  numeroCertification = '';
  diplome = '';
  experience: number | null = null;

  // Shared fields
  specialites: string[] = [];
  availableSpecialites = ['Crawl', 'Dos', 'Brasse', 'Papillon', 'Nage libre', '100m', '200m', '400m', '800m', '1500m'];

  roles = [
    {
      value: 'NAGEUR', label: 'Nageur',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="3"/><path d="M5 20c2-1 4-2 7-2s5 1 7 2"/><path d="M5 17c2-1 4-2 7-2s5 1 7 2"/><line x1="12" y1="9" x2="12" y2="15"/></svg>'
    },
    {
      value: 'ENTRAINEUR', label: 'Entraîneur',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>'
    },
    {
      value: 'RESPONSABLE', label: 'Admin',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
    }
  ];

  constructor(private auth: AuthService, private router: Router) { }

  toggleSpecialite(spec: string) {
    const idx = this.specialites.indexOf(spec);
    if (idx > -1) {
      this.specialites.splice(idx, 1);
    } else {
      this.specialites.push(spec);
    }
  }

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.imageFile = event.target.files[0];
      const reader = new FileReader();
      reader.onload = e => this.imagePreview = reader.result;
      reader.readAsDataURL(this.imageFile as Blob);
    }
  }

  selectRole(role: string) { this.selectedRole = role; }

  getPasswordStrength(): { label: string; class: string; width: number } {
    if (!this.password) return { label: '', class: '', width: 0 };
    let score = 0;
    if (this.password.length >= 6) score++;
    if (this.password.length >= 10) score++;
    if (/[A-Z]/.test(this.password)) score++;
    if (/[0-9]/.test(this.password)) score++;
    if (/[^A-Za-z0-9]/.test(this.password)) score++;

    if (score <= 1) return { label: 'Faible', class: 'weak', width: 20 };
    if (score <= 2) return { label: 'Moyen', class: 'medium', width: 40 };
    if (score <= 3) return { label: 'Bon', class: 'good', width: 60 };
    if (score <= 4) return { label: 'Fort', class: 'strong', width: 80 };
    return { label: 'Excellent', class: 'excellent', width: 100 };
  }

  onRegister() {
    this.errorMessage = ''; this.successMessage = '';
    if (!this.nom || !this.prenom || !this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.'; return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.'; return;
    }

    this.isLoading = true;
    const formData = new FormData();
    formData.append('nom', this.nom);
    formData.append('prenom', this.prenom);
    formData.append('email', this.email);
    formData.append('password', this.password);
    if (this.phone) formData.append('phone', this.phone);
    formData.append('role', this.selectedRole);

    if (this.imageFile) {
      formData.append('imageprofile', this.imageFile);
    }

    if (this.selectedRole === 'NAGEUR') {
      if (this.age) formData.append('age', this.age.toString());
      formData.append('sexe', this.sexe);
      if (this.poids) formData.append('poids', this.poids.toString());
      formData.append('club', this.club);
      formData.append('specialites', JSON.stringify(this.specialites));
    } else if (this.selectedRole === 'ENTRAINEUR') {
      formData.append('numeroCertification', this.numeroCertification);
      formData.append('diplome', this.diplome);
      if (this.experience) formData.append('experience', this.experience.toString());
      formData.append('specialites', JSON.stringify(this.specialites));
    }

    this.auth.register(formData).subscribe({
      next: () => {
        this.successMessage = 'Compte créé avec succès ! Redirection...';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de la création du compte.';
        this.isLoading = false;
      }
    });
  }
}