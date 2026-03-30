import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-entraineurs',
  templateUrl: './entraineurs.component.html',
  styleUrls: ['./entraineurs.component.css']
})
export class EntraineursComponent implements OnInit {
  entraineurs: any[] = [];
  filteredEntraineurs: any[] = [];
  searchQuery: string = '';
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';

  showModal: boolean = false;
  isEditMode: boolean = false;
  selectedId: string = '';

  form = {
    nom: '', prenom: '', email: '', password: '',
    phone: '', experience: '', specialites: '', club: ''
  };

  specialiteOptions = ['Nage libre', 'Dos crawlé', 'Brasse', 'Papillon', 'Quatre nages'];

  constructor(private router: Router) {}

  ngOnInit() { this.loadEntraineurs(); }

  getHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };
  }

  async loadEntraineurs() {
    this.isLoading = true;
    try {
      const res = await fetch('http://localhost:3300/entraineurs', { headers: this.getHeaders() });
      const data = await res.json();
      this.entraineurs = Array.isArray(data) ? data : [];
      this.filteredEntraineurs = [...this.entraineurs];
    } catch {
      this.errorMessage = 'Erreur de chargement.';
    } finally {
      this.isLoading = false;
    }
  }

  search() {
    const q = this.searchQuery.toLowerCase();
    this.filteredEntraineurs = this.entraineurs.filter(e => {
      const nom = e.utilisateur?.nom?.toLowerCase() || '';
      const prenom = e.utilisateur?.prenom?.toLowerCase() || '';
      const club = e.club?.toLowerCase() || '';
      return nom.includes(q) || prenom.includes(q) || club.includes(q);
    });
  }

  openAddModal() {
    this.isEditMode = false;
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(e: any) {
    this.isEditMode = true;
    this.selectedId = e._id;
    this.form = {
      nom: e.utilisateur?.nom || '',
      prenom: e.utilisateur?.prenom || '',
      email: e.utilisateur?.email || '',
      password: '',
      phone: e.utilisateur?.phone || '',
      experience: e.experience || '',
      specialites: e.specialites?.[0] || '',
      club: e.club || ''
    };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.resetForm(); }

  resetForm() {
    this.form = { nom: '', prenom: '', email: '', password: '', phone: '', experience: '', specialites: '', club: '' };
    this.errorMessage = '';
    this.successMessage = '';
  }

  async onSubmit() {
    this.errorMessage = '';
    if (!this.form.nom || !this.form.prenom || !this.form.email) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    try {
      if (this.isEditMode) {
        const res = await fetch(`http://localhost:3300/entraineurs/${this.selectedId}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(this.form)
        });
        const data = await res.json();
        if (res.ok) {
          this.successMessage = 'Entraîneur mis à jour!';
          this.loadEntraineurs();
          setTimeout(() => this.closeModal(), 1500);
        } else {
          this.errorMessage = data.message || 'Erreur.';
        }
      } else {
        const formData = new FormData();
        Object.entries(this.form).forEach(([k, v]) => formData.append(k, v as string));
        const res = await fetch('http://localhost:3300/entraineurs/register_entraineur', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          this.successMessage = 'Entraîneur ajouté avec succès!';
          this.loadEntraineurs();
          setTimeout(() => this.closeModal(), 1500);
        } else {
          this.errorMessage = data.message || "Erreur lors de l'ajout.";
        }
      }
    } catch {
      this.errorMessage = 'Erreur de connexion au serveur.';
    }
  }

  async deleteEntraineur(id: string, nom: string) {
    if (!confirm(`Supprimer l'entraîneur ${nom} ?`)) return;
    try {
      const res = await fetch(`http://localhost:3300/entraineurs/${id}`, {
        method: 'DELETE', headers: this.getHeaders()
      });
      if (res.ok) {
        this.successMessage = 'Entraîneur supprimé!';
        this.loadEntraineurs();
        setTimeout(() => this.successMessage = '', 3000);
      }
    } catch {
      this.errorMessage = 'Erreur lors de la suppression.';
    }
  }

  getInitials(e: any): string {
    const nom = e.utilisateur?.nom || '?';
    const prenom = e.utilisateur?.prenom || '';
    return (nom[0] + (prenom[0] || '')).toUpperCase();
  }

  getExperienceLabel(years: number): string {
    if (years < 2) return 'Débutant';
    if (years < 5) return 'Intermédiaire';
    if (years < 10) return 'Confirmé';
    return 'Expert';
  }

  navigate(route: string) { this.router.navigate([route]); }
  logout() { localStorage.clear(); this.router.navigate(['/login']); }
}