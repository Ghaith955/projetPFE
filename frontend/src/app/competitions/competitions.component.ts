import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-competitions',
  templateUrl: './competitions.component.html',
  styleUrls: ['./competitions.component.css']
})
export class CompetitionsComponent implements OnInit {
  competitions: any[] = [];
  filteredCompetitions: any[] = [];
  searchQuery = '';
  filterStatut = '';
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  showModal = false;
  isEditMode = false;
  selectedId = '';

  form = {
    nom: '', date: '', lieu: '',
    description: '', niveauRequis: 'Intermédiaire', statut: 'À venir'
  };

  niveaux = ['Débutant', 'Intermédiaire', 'Confirmé', 'Expert'];
  statuts = ['À venir', 'En cours', 'Terminée', 'Annulée'];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  get isAdmin() { return this.auth.role === 'RESPONSABLE'; }

  ngOnInit() { this.loadCompetitions(); }

  loadCompetitions() {
    this.isLoading = true;
    this.api.getAllCompetitions().subscribe({
      next: (data) => {
        this.competitions = Array.isArray(data) ? data : [];
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

  onSubmit() {
    this.errorMessage = '';
    if (!this.form.nom || !this.form.date || !this.form.lieu) {
      this.errorMessage = 'Veuillez remplir les champs obligatoires.';
      return;
    }
    if (this.isEditMode) {
      this.api.updateCompetition(this.selectedId, this.form).subscribe({
        next: () => {
          this.successMessage = 'Compétition mise à jour !';
          this.loadCompetitions();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    } else {
      this.api.createCompetition(this.form).subscribe({
        next: () => {
          this.successMessage = 'Compétition créée !';
          this.loadCompetitions();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    }
  }

  deleteCompetition(id: string, nom: string) {
    if (!confirm(`Supprimer la compétition "${nom}" ?`)) return;
    this.api.deleteCompetition(id).subscribe({
      next: () => {
        this.successMessage = 'Compétition supprimée !';
        this.loadCompetitions();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => { this.errorMessage = 'Erreur lors de la suppression.'; }
    });
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
}