import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-entraineurs',
  templateUrl: './entraineurs.component.html',
  styleUrls: ['./entraineurs.component.css']
})
export class EntraineursComponent implements OnInit {
  entraineurs: any[] = [];
  filteredEntraineurs: any[] = [];
  searchQuery = '';
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  showModal = false;
  isEditMode = false;
  selectedId = '';

  form = {
    nom: '', prenom: '', email: '', password: '',
    phone: '', experience: '', specialites: '', club: ''
  };

  specialiteOptions = ['Nage libre', 'Dos crawlé', 'Brasse', 'Papillon', 'Quatre nages'];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() { this.loadEntraineurs(); }

  loadEntraineurs() {
    this.isLoading = true;
    this.api.getAllEntraineurs().subscribe({
      next: (data) => {
        this.entraineurs = Array.isArray(data) ? data : [];
        this.filteredEntraineurs = [...this.entraineurs];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Erreur de chargement.';
        this.isLoading = false;
      }
    });
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

  onSubmit() {
    this.errorMessage = '';
    if (!this.form.nom || !this.form.prenom || !this.form.email) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    if (this.isEditMode) {
      this.api.updateEntraineur(this.selectedId, this.form).subscribe({
        next: () => {
          this.successMessage = 'Entraîneur mis à jour !';
          this.loadEntraineurs();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    } else {
      const formData = new FormData();
      Object.entries(this.form).forEach(([k, v]) => { if (v) formData.append(k, v as string); });

      this.api.registerEntraineur(formData).subscribe({
        next: () => {
          this.successMessage = 'Entraîneur ajouté !';
          this.loadEntraineurs();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    }
  }

  deleteEntraineur(id: string, nom: string) {
    if (!confirm(`Supprimer l'entraîneur ${nom} ?`)) return;
    this.api.deleteEntraineur(id).subscribe({
      next: () => {
        this.successMessage = 'Entraîneur supprimé !';
        this.loadEntraineurs();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => { this.errorMessage = 'Erreur lors de la suppression.'; }
    });
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
}