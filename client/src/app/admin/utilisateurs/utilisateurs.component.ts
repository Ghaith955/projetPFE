import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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

  roles = ['Administrateur', 'Entraîneur', 'Responsable'];

  constructor(private router: Router) {}

  ngOnInit() { this.loadUsers(); }

  getHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };
  }

  async loadUsers() {
    this.isLoading = true;
    try {
      const res = await fetch('http://localhost:3300/users', { headers: this.getHeaders() });
      const data = await res.json();
      this.users = Array.isArray(data) ? data : [];
      this.applyFilters();
    } catch {
      this.errorMessage = 'Erreur de chargement.';
    } finally {
      this.isLoading = false;
    }
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

  async onSubmit() {
    this.errorMessage = '';
    if (!this.form.nom || !this.form.prenom || !this.form.email) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }
    if (!this.isEditMode && !this.form.password) {
      this.errorMessage = 'Le mot de passe est obligatoire.';
      return;
    }
    try {
      const url = this.isEditMode
        ? `http://localhost:3300/users/${this.selectedId}`
        : 'http://localhost:3300/users/register-Admin';
      const method = this.isEditMode ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: this.getHeaders(), body: JSON.stringify(this.form) });
      const data = await res.json();
      if (res.ok) {
        this.successMessage = this.isEditMode ? 'Utilisateur mis à jour!' : 'Utilisateur créé!';
        this.loadUsers();
        setTimeout(() => this.closeModal(), 1500);
      } else {
        this.errorMessage = data.message || 'Erreur.';
      }
    } catch {
      this.errorMessage = 'Erreur de connexion.';
    }
  }

  async toggleActive(u: any) {
    try {
      const res = await fetch(`http://localhost:3300/users/${u._id}/toggle-active`, {
        method: 'PATCH', headers: this.getHeaders()
      });
      if (res.ok) {
        this.successMessage = `Compte ${u.isActive ? 'désactivé' : 'activé'}!`;
        this.loadUsers();
        setTimeout(() => this.successMessage = '', 3000);
      }
    } catch {
      this.errorMessage = 'Erreur.';
    }
  }

  async deleteUser(id: string, nom: string) {
    if (!confirm(`Supprimer l'utilisateur ${nom} ?`)) return;
    try {
      const res = await fetch(`http://localhost:3300/users/${id}`, {
        method: 'DELETE', headers: this.getHeaders()
      });
      if (res.ok) {
        this.successMessage = 'Utilisateur supprimé!';
        this.loadUsers();
        setTimeout(() => this.successMessage = '', 3000);
      }
    } catch {
      this.errorMessage = 'Erreur lors de la suppression.';
    }
  }

  getInitials(u: any): string {
    return ((u.nom?.[0] || '') + (u.prenom?.[0] || '')).toUpperCase();
  }

  getAvatarColor(u: any): string {
    const colors = ['#c8102e', '#0d4228', '#185fa5', '#ba7517', '#639922'];
    const idx = (u.nom?.charCodeAt(0) || 0) % colors.length;
    return colors[idx];
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
  logout() { localStorage.clear(); this.router.navigate(['/login']); }
}