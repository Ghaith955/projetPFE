import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadData();
  }

  getHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };
  }

  async loadData() {
    this.isLoading = true;
    try {
      const [cotisRes, nageurRes, statsRes] = await Promise.all([
        fetch('http://localhost:3300/cotisations', { headers: this.getHeaders() }),
        fetch('http://localhost:3300/nageurs', { headers: this.getHeaders() }),
        fetch('http://localhost:3300/cotisations/stats', { headers: this.getHeaders() })
      ]);
      this.cotisations = await cotisRes.json();
      this.nageurs = await nageurRes.json();
      this.stats = await statsRes.json();
      this.applyFilters();
    } catch {
      this.errorMessage = 'Erreur de chargement.';
    } finally {
      this.isLoading = false;
    }
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
    this.isEditMode = false;
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(c: any) {
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

  async onSubmit() {
    this.errorMessage = '';
    if (!this.form.nageur || !this.form.montant || !this.form.dateDebut || !this.form.dateFin) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }
    try {
      const url = this.isEditMode ? `http://localhost:3300/cotisations/${this.selectedId}` : 'http://localhost:3300/cotisations';
      const method = this.isEditMode ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: this.getHeaders(), body: JSON.stringify(this.form) });
      const data = await res.json();
      if (res.ok) {
        this.successMessage = this.isEditMode ? 'Cotisation mise à jour!' : 'Cotisation créée!';
        this.loadData();
        setTimeout(() => this.closeModal(), 1500);
      } else {
        this.errorMessage = data.message || 'Erreur.';
      }
    } catch {
      this.errorMessage = 'Erreur de connexion.';
    }
  }

  async deleteCotisation(id: string) {
    if (!confirm('Supprimer cette cotisation ?')) return;
    try {
      const res = await fetch(`http://localhost:3300/cotisations/${id}`, { method: 'DELETE', headers: this.getHeaders() });
      if (res.ok) {
        this.successMessage = 'Cotisation supprimée!';
        this.loadData();
        setTimeout(() => this.successMessage = '', 3000);
      }
    } catch {
      this.errorMessage = 'Erreur lors de la suppression.';
    }
  }

  async markAsPaid(c: any) {
    try {
      const res = await fetch(`http://localhost:3300/cotisations/${c._id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ ...c, nageur: c.nageur?._id, statut: 'Payé' })
      });
      if (res.ok) {
        this.successMessage = 'Cotisation marquée comme payée!';
        this.loadData();
        setTimeout(() => this.successMessage = '', 3000);
      }
    } catch {
      this.errorMessage = 'Erreur.';
    }
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
  logout() { localStorage.clear(); this.router.navigate(['/login']); }
}