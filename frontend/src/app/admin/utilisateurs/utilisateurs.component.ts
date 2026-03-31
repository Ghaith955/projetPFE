import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-utilisateurs',
  templateUrl: './utilisateurs.component.html',
  styleUrls: ['./utilisateurs.component.css']
})
export class UtilisateursComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = [];
  searchQuery = '';
  filterRole = '';
  filterStatus = '';
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  showModal = false;
  isEditMode = false;
  selectedId = '';

  form = {
    nom: '', prenom: '', email: '',
    password: '', phone: '', role: '', isActive: true
  };

  roles = [
    { value: 'RESPONSABLE', label: 'Administrateur' },
    { value: 'ENTRAINEUR', label: 'Entraîneur' },
    { value: 'NAGEUR', label: 'Nageur' }
  ];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.isLoading = true;
    this.api.getAllUsers().subscribe({
      next: (data) => {
        this.users = Array.isArray(data) ? data : [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Erreur de chargement.';
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    let result = [...this.users];
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(u =>
        u.nom?.toLowerCase().includes(q) ||
        u.prenom?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    if (this.filterStatus === 'actif') result = result.filter(u => u.isActive);
    if (this.filterStatus === 'inactif') result = result.filter(u => !u.isActive);
    this.filteredUsers = result;
  }

  openAddModal() {
    this.isEditMode = false;
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(u: any) {
    this.isEditMode = true;
    this.selectedId = u._id;
    this.form = {
      nom: u.nom || '',
      prenom: u.prenom || '',
      email: u.email || '',
      password: '',
      phone: u.phone || '',
      role: u.role || '',
      isActive: u.isActive
    };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.resetForm(); }

  resetForm() {
    this.form = { nom: '', prenom: '', email: '', password: '', phone: '', role: '', isActive: true };
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit() {
    this.errorMessage = '';
    if (!this.form.nom || !this.form.prenom || !this.form.email) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }
    if (!this.isEditMode && !this.form.password) {
      this.errorMessage = 'Le mot de passe est obligatoire.';
      return;
    }
    if (this.isEditMode) {
      this.api.updateUser(this.selectedId, this.form).subscribe({
        next: () => {
          this.successMessage = 'Utilisateur mis à jour !';
          this.loadUsers();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    } else {
      this.api.createUser(this.form).subscribe({
        next: () => {
          this.successMessage = 'Utilisateur créé !';
          this.loadUsers();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    }
  }

  toggleActive(u: any) {
    this.api.toggleUserActive(u._id).subscribe({
      next: () => {
        this.successMessage = `Compte ${u.isActive ? 'désactivé' : 'activé'} !`;
        this.loadUsers();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => { this.errorMessage = 'Erreur.'; }
    });
  }

  deleteUser(id: string, nom: string) {
    if (!confirm(`Supprimer l'utilisateur ${nom} ?`)) return;
    this.api.deleteUser(id).subscribe({
      next: () => {
        this.successMessage = 'Utilisateur supprimé !';
        this.loadUsers();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => { this.errorMessage = 'Erreur lors de la suppression.'; }
    });
  }

  getInitials(u: any): string {
    return ((u.nom?.[0] || '') + (u.prenom?.[0] || '')).toUpperCase();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getStats() {
    return {
      total: this.users.length,
      actifs: this.users.filter(u => u.isActive).length,
      inactifs: this.users.filter(u => !u.isActive).length
    };
  }

  navigate(route: string) { this.router.navigate([route]); }
}