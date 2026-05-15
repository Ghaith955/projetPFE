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
  showResultModal = false;
  isEditMode = false;
  selectedId = '';
  allNageurs: any[] = [];

  form = {
    nom: '', date: '', lieu: '',
    description: '', niveauRequis: 'Intermédiaire', statut: 'À venir', nageurs: [] as string[]
  };

  resultForm = {
    competitionId: '',
    nageurId: '',
    score: '',
    rank: '',
    time: '',
    distance: '',
    stroke: '',
    category: '',
    techniqueScore: '',
    enduranceScore: '',
    sprintScore: '',
    strokeEfficiency: '',
    consistencyScore: '',
    notes: ''
  };

  niveaux = ['Débutant', 'Intermédiaire', 'Confirmé', 'Expert'];
  statuts = ['À venir', 'En cours', 'Terminée', 'Annulée'];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  get isAdmin() { return this.auth.role === 'RESPONSABLE'; }
  get canManageCompetitions() { return this.auth.role === 'RESPONSABLE' || this.auth.role === 'ENTRAINEUR'; }
  get isCoach() { return this.auth.role === 'ENTRAINEUR'; }

  ngOnInit() { 
    this.loadCompetitions(); 
    this.loadNageurs();
  }

  loadNageurs() {
    this.api.getAllNageurs().subscribe({
      next: (data) => {
        const raw = Array.isArray(data) ? data : [];
        this.allNageurs = this.filterCoachSwimmers(raw);
      }
    });
  }

  loadCompetitions() {
    this.isLoading = true;
    this.api.getAllCompetitions().subscribe({
      next: (data) => {
        const raw = Array.isArray(data) ? data : [];
        this.competitions = this.filterCoachCompetitions(raw);
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

  private filterCoachSwimmers(list: any[]): any[] {
    if (!this.isCoach) return list;
    const allowed = new Set(this.auth.getCoachSwimmerIds());
    if (!allowed.size) return list;
    return list.filter((n: any) => allowed.has(String(n?._id || n?.id || n)));
  }

  private filterCoachCompetitions(list: any[]): any[] {
    if (!this.isCoach) return list;
    const allowed = new Set(this.auth.getCoachSwimmerIds());
    if (!allowed.size) return list;
    return list.filter((c: any) => {
      const nageurs = Array.isArray(c?.nageurs) ? c.nageurs : [];
      return nageurs.some((n: any) => allowed.has(String(n?._id || n?.id || n)));
    });
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
      statut: c.statut || 'À venir',
      nageurs: c.nageurs ? c.nageurs.map((n: any) => n._id || n) : []
    };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.resetForm(); }
  closeResultModal() { this.showResultModal = false; this.resetResultForm(); }

  resetForm() {
    this.form = { nom: '', date: '', lieu: '', description: '', niveauRequis: 'Intermédiaire', statut: 'À venir', nageurs: [] };
    this.errorMessage = '';
    this.successMessage = '';
  }

  resetResultForm() {
    this.resultForm = {
      competitionId: '',
      nageurId: '',
      score: '',
      rank: '',
      time: '',
      distance: '',
      stroke: '',
      category: '',
      techniqueScore: '',
      enduranceScore: '',
      sprintScore: '',
      strokeEfficiency: '',
      consistencyScore: '',
      notes: ''
    };
    this.errorMessage = '';
    this.successMessage = '';
  }

  openResultModal(c: any) {
    this.resetResultForm();
    this.resultForm.competitionId = c._id;
    this.showResultModal = true;
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
          this.closeModal();
          this.successMessage = 'Compétition mise à jour !';
          this.loadCompetitions();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    } else {
      this.api.createCompetition(this.form).subscribe({
        next: () => {
          this.closeModal();
          this.successMessage = 'Compétition créée !';
          this.loadCompetitions();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    }
  }

  submitResult() {
    this.errorMessage = '';
    if (!this.resultForm.competitionId || !this.resultForm.nageurId || !this.resultForm.score || !this.resultForm.rank) {
      this.errorMessage = 'Veuillez remplir les champs obligatoires du résultat.';
      return;
    }

    const payload = {
      competitionId: this.resultForm.competitionId,
      nageurId: this.resultForm.nageurId,
      score: this.resultForm.score,
      rank: this.resultForm.rank,
      time: this.resultForm.time,
      distance: this.resultForm.distance,
      stroke: this.resultForm.stroke,
      category: this.resultForm.category,
      performanceMetrics: {
        techniqueScore: this.resultForm.techniqueScore,
        enduranceScore: this.resultForm.enduranceScore,
        sprintScore: this.resultForm.sprintScore,
        strokeEfficiency: this.resultForm.strokeEfficiency,
        consistencyScore: this.resultForm.consistencyScore
      },
      notes: this.resultForm.notes
    };

    this.api.addCompetitionResult(payload).subscribe({
      next: () => {
        this.closeResultModal();
        this.successMessage = 'Résultat enregistré !';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
    });
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