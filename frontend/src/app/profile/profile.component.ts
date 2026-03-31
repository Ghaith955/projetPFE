import { Component, OnInit } from '@angular/core';
import { AuthService, User } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  // base fields
  nom = ''; prenom = ''; phone = '';
  imageFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  // nageur fields
  age: number | null = null;
  sexe = '';
  poids: number | null = null;
  club = '';

  // entraineur fields
  numeroCertification = '';
  diplome = '';
  experience: number | null = null;

  // shared fields
  specialites: string[] = [];
  availableSpecialites = ['Crawl', 'Dos', 'Brasse', 'Papillon', 'Nage libre', '100m', '200m', '400m', '800m', '1500m'];

  // passwords
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  pwdSuccess = '';
  pwdError = '';

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.auth.getMe().subscribe({
      next: (data) => {
        this.user = data;
        this.nom = data.nom || '';
        this.prenom = data.prenom || '';
        this.phone = data.phone?.toString() || '';
        if (data.imageprofile) {
          this.imagePreview = `http://localhost:3300${data.imageprofile}`;
        }

        if (data.roleData) {
          if (data.role === 'NAGEUR') {
            this.age = data.roleData.age;
            this.sexe = data.roleData.sexe;
            this.poids = data.roleData.poid;
            this.club = data.roleData.club;
            this.specialites = data.roleData.specialite || [];
          } else if (data.role === 'ENTRAINEUR') {
            this.experience = data.roleData.experience;
            this.numeroCertification = data.roleData.numeroCertification;
            this.diplome = data.roleData.diplome;
            this.specialites = data.roleData.specialites || [];
          }
        }
      }
    });
  }

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

  onSaveProfile() {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const formData = new FormData();
    formData.append('nom', this.nom);
    formData.append('prenom', this.prenom);
    if (this.phone) formData.append('phone', this.phone);

    if (this.imageFile) {
      formData.append('imageprofile', this.imageFile);
    }

    if (this.user?.role === 'NAGEUR') {
      if (this.age) formData.append('age', this.age.toString());
      if (this.sexe) formData.append('sexe', this.sexe);
      if (this.poids) formData.append('poids', this.poids.toString());
      if (this.club) formData.append('club', this.club);
      formData.append('specialites', JSON.stringify(this.specialites));
    } else if (this.user?.role === 'ENTRAINEUR') {
      if (this.numeroCertification) formData.append('numeroCertification', this.numeroCertification);
      if (this.diplome) formData.append('diplome', this.diplome);
      if (this.experience) formData.append('experience', this.experience.toString());
      formData.append('specialites', JSON.stringify(this.specialites));
    }

    this.auth.updateProfile(formData).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = 'Profil mis à jour avec succès.';
        if (res.user?.imageprofile) {
           this.imagePreview = `http://localhost:3300${res.user.imageprofile}`;
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Erreur lors de la mise à jour.';
      }
    });
  }

  onChangePassword() {
    this.pwdSuccess = '';
    this.pwdError = '';
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.pwdError = 'Tous les champs de mot de passe sont requis.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.pwdError = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.pwdSuccess = 'Mot de passe modifié avec succès.';
        this.currentPassword = ''; this.newPassword = ''; this.confirmPassword = '';
      },
      error: (err) => {
        this.pwdError = err.error?.message || 'Erreur lors de la modification du mot de passe.';
      }
    });
  }
}
