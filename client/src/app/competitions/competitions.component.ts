import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-competitions',
  templateUrl: './competitions.component.html',
  styleUrls: ['./competitions.component.css']
})
export class CompetitionsComponent implements OnInit {
  competitions: any[] = [];
  filteredCompetitions: any[] = [];
  searchQuery: string = '';
  filterStatut: string = '';
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';
  showModal: boolean = false;
  isEditMode: boolean = false;
  selectedId: string = '';

  form = {
    nom: '', date: '', lieu: '',
    description: '', niveauRequis: 'Intermédiaire', statut: 'À venir'
  };

  niveaux = ['Débutant', 'Intermédiaire', 'Confirmé', 'Expert'];
  statuts = ['À venir', 'En cours', 'Terminée', 'Annulée'];

  constructor(private router: Router) {}

  ngOnInit() { this.loadCompetitions(); }

  getHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };
  }

  async loadCompetitions() {
    this.isLoading = true;
    try {
      const res = await fetch('http://localhost:3300/competitions', { headers: this.getHeaders() });
      const data = await res.json();
      this.competitions = Array.isArray(data) ? data : [];
      this.applyFilters();
    } catch {
      this.errorMessage = 'Erreur de chargement.';
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters() {
    let result = [...this.competitions];
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(c => c.nom?.toLowerCase().includes(q) || c.lieu?.toLowerCase().includes(q));
    }
    if (this.filterStatut) {
      result = result.filter(c => c.statut === this.filterStatut);
    }
    this.filteredCompetitions = result;
  }

  openAddModal() {
    this.isEditMode = false;
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(c: any) {
    this.isEditMode = true;
    this.selectedId = c._id;
    this.form = {
      nom: c.nom || '',
      date: c.date ? new Date(c.date).toISOString().substring(0, 10) : '',
      lieu: c.lieu || '',
      description: c.description || '',
      niveauRequis: c.niveauRequis || 'Intermédiaire',
      statut: c.statut || 'À venir'
    };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.resetForm(); }

  resetForm() {
    this.form = { nom: '', date: '', lieu: '', description: '', niveauRequis: 'Intermédiaire', statut: 'À venir' };
    this.errorMessage = '';
    this.successMessage = '';
  }

  async onSubmit() {
    this.errorMessage = '';
    if (!this.form.nom || !this.form.date || !this.form.lieu) {
      this.errorMessage = 'Veuillez remplir les champs obligatoires.';
      return;
    }
    try {
      const url = this.isEditMode
        ? `http://localhost:3300/competitions/${this.selectedId}`
        : 'http://localhost:3300/competitions';
      const method = this.isEditMode ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: this.getHeaders(), body: JSON.stringify(this.form) });
      const data = await res.json();
      if (res.ok) {
        this.successMessage = this.isEditMode ? 'Compétition mise à jour!' : 'Compétition créée!';
        this.loadCompetitions();
        setTimeout(() => this.closeModal(), 1500);
      } else {
        this.errorMessage = data.message || 'Erreur.';
      }
    } catch {
      this.errorMessage = 'Erreur de connexion.';
    }
  }

  async deleteCompetition(id: string, nom: string) {
    if (!confirm(`Supprimer la compétition "${nom}" ?`)) return;
    try {
      const res = await fetch(`http://localhost:3300/competitions/${id}`, {
        method: 'DELETE', headers: this.getHeaders()
      });
      if (res.ok) {
        this.successMessage = 'Compétition supprimée!';
        this.loadCompetitions();
        setTimeout(() => this.successMessage = '', 3000);
      }
    } catch {
      this.errorMessage = 'Erreur lors de la suppression.';
    }
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'À venir': return 'statut-avenir';
      case 'En cours': return 'statut-encours';
      case 'Terminée': return 'statut-terminee';
      case 'Annulée': return 'statut-annulee';
      default: return '';
    }
  }

  getNiveauClass(niveau: string): string {
    switch (niveau) {
      case 'Débutant': return 'niveau-debutant';
      case 'Intermédiaire': return 'niveau-intermediaire';
      case 'Confirmé': return 'niveau-confirme';
      case 'Expert': return 'niveau-expert';
      default: return '';
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  getDaysLeft(date: string): number {
    const diff = new Date(date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  navigate(route: string) { this.router.navigate([route]); }
  logout() { localStorage.clear(); this.router.navigate(['/login']); }
}