import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-cotisations',
  templateUrl: './cotisations.component.html',
  styleUrls: ['./cotisations.component.css']
})
export class CotisationsComponent implements OnInit {
  cotisations: any[] = [];
  filteredCotisations: any[] = [];
  nageurs: any[] = [];
  stats: any = { total: 0, totalMontant: 0, paye: 0, enAttente: 0, enRetard: 0, montantPercu: 0 };

  searchQuery = '';
  filterStatut = '';
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  showModal = false;
  isEditMode = false;
  selectedId = '';

  form = {
    nageur: '', montant: 150, dateDebut: '', dateFin: '',
    statut: 'En attente', modePaiement: 'Espèces', notes: ''
  };

  statuts = ['Payé', 'En attente', 'En retard', 'Annulé'];
  modesPaiement = ['Espèces', 'Virement', 'Chèque', 'Carte'];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  get isAdmin() { return this.auth.currentUser?.role === 'RESPONSABLE'; }
  get isNageur() { return this.auth.currentUser?.role === 'NAGEUR'; }

  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading = true;

    this.api.getAllCotisations().subscribe({
      next: (data) => {
        this.cotisations = Array.isArray(data) ? data : [];
        this.applyFilters();
      },
      error: () => { this.errorMessage = 'Erreur de chargement des cotisations.'; }
    });

    if (this.isAdmin) {
      this.api.getAllNageurs().subscribe({
        next: (data) => { this.nageurs = Array.isArray(data) ? data : []; },
        error: () => {}
      });
    }

    this.api.getCotisationStats().subscribe({
      next: (data) => { this.stats = data; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  applyFilters() {
    let result = [...this.cotisations];
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(c => {
        const nom = c.nageur?.utilisateur?.nom?.toLowerCase() || '';
        const prenom = c.nageur?.utilisateur?.prenom?.toLowerCase() || '';
        return nom.includes(q) || prenom.includes(q);
      });
    }
    if (this.filterStatut) result = result.filter(c => c.statut === this.filterStatut);
    this.filteredCotisations = result;
  }

  openAddModal() {
    if (!this.isAdmin) return;
    this.isEditMode = false;
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(c: any) {
    if (!this.isAdmin) return;
    this.isEditMode = true;
    this.selectedId = c._id;
    this.form = {
      nageur: c.nageur?._id || '',
      montant: c.montant || 150,
      dateDebut: c.dateDebut ? new Date(c.dateDebut).toISOString().substring(0, 10) : '',
      dateFin: c.dateFin ? new Date(c.dateFin).toISOString().substring(0, 10) : '',
      statut: c.statut || 'En attente',
      modePaiement: c.modePaiement || 'Espèces',
      notes: c.notes || ''
    };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.resetForm(); }

  resetForm() {
    this.form = { nageur: '', montant: 150, dateDebut: '', dateFin: '', statut: 'En attente', modePaiement: 'Espèces', notes: '' };
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit() {
    this.errorMessage = '';
    if (!this.form.nageur || !this.form.montant || !this.form.dateDebut || !this.form.dateFin) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }
    if (this.isEditMode) {
      this.api.updateCotisation(this.selectedId, this.form).subscribe({
        next: () => {
          this.successMessage = 'Cotisation mise à jour !';
          this.loadData();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    } else {
      this.api.createCotisation(this.form).subscribe({
        next: () => {
          this.successMessage = 'Cotisation créée !';
          this.loadData();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    }
  }

  deleteCotisation(id: string) {
    if (!this.isAdmin) return;
    if (!confirm('Supprimer cette cotisation ?')) return;
    this.api.deleteCotisation(id).subscribe({
      next: () => {
        this.successMessage = 'Cotisation supprimée !';
        this.loadData();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => { this.errorMessage = 'Erreur lors de la suppression.'; }
    });
  }

  markAsPaid(c: any) {
    if (!this.isAdmin) return;
    this.api.updateCotisation(c._id, { ...c, nageur: c.nageur?._id, statut: 'Payé' }).subscribe({
      next: () => {
        this.successMessage = 'Cotisation marquée comme payée !';
        this.loadData();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => { this.errorMessage = 'Erreur.'; }
    });
  }

  getStatutClass(statut: string): string {
    const map: any = { 'Payé': 'paye', 'En attente': 'attente', 'En retard': 'retard', 'Annulé': 'annule' };
    return map[statut] || '';
  }

  getNageurName(nageur: any): string {
    if (!nageur) return '—';
    return `${nageur.utilisateur?.nom || ''} ${nageur.utilisateur?.prenom || ''}`.trim();
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  isExpiringSoon(dateFin: string): boolean {
    const diff = new Date(dateFin).getTime() - new Date().getTime();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }

  navigate(route: string) { this.router.navigate([route]); }
}