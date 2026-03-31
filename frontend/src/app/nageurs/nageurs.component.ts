import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-nageurs',
  templateUrl: './nageurs.component.html',
  styleUrls: ['./nageurs.component.css']
})
export class NageursComponent implements OnInit {
  nageurs: any[] = [];
  filteredNageurs: any[] = [];
  searchQuery = '';
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  showModal = false;
  isEditMode = false;
  selectedNageurId = '';

  form = {
    nom: '', prenom: '', email: '', password: '',
    phone: '', age: '', sexe: 'Homme', poid: '', specialite: ''
  };

  sexeOptions = ['Homme', 'Femme', 'Autre'];
  specialiteOptions = ['Nage libre', 'Dos crawlé', 'Brasse', 'Papillon', 'Quatre nages'];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  get isAdmin() { return this.auth.role === 'RESPONSABLE'; }

  ngOnInit() { this.loadNageurs(); }

  loadNageurs() {
    this.isLoading = true;
    this.api.getAllNageurs().subscribe({
      next: (data) => {
        this.nageurs = Array.isArray(data) ? data : [];
        this.filteredNageurs = [...this.nageurs];
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
    this.filteredNageurs = this.nageurs.filter(n => {
      const nom = n.utilisateur?.nom?.toLowerCase() || '';
      const prenom = n.utilisateur?.prenom?.toLowerCase() || '';
      const email = n.utilisateur?.email?.toLowerCase() || '';
      return nom.includes(q) || prenom.includes(q) || email.includes(q);
    });
  }

  openAddModal() {
    this.isEditMode = false;
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(nageur: any) {
    this.isEditMode = true;
    this.selectedNageurId = nageur._id;
    this.form = {
      nom: nageur.utilisateur?.nom || '', prenom: nageur.utilisateur?.prenom || '',
      email: nageur.utilisateur?.email || '', password: '',
      phone: nageur.utilisateur?.phone || '', age: nageur.age || '',
      sexe: nageur.sexe || 'Homme', poid: nageur.poid || '',
      specialite: nageur.specialite?.[0] || ''
    };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.resetForm(); }

  resetForm() {
    this.form = { nom: '', prenom: '', email: '', password: '', phone: '', age: '', sexe: 'Homme', poid: '', specialite: '' };
    this.errorMessage = ''; this.successMessage = '';
  }

  onSubmit() {
    this.errorMessage = '';
    if (!this.form.nom || !this.form.prenom || !this.form.email || !this.form.age) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.'; return;
    }

    if (this.isEditMode) {
      this.api.updateNageur(this.selectedNageurId, this.form).subscribe({
        next: () => {
          this.successMessage = 'Nageur mis à jour !';
          this.loadNageurs();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    } else {
      const formData = new FormData();
      Object.entries(this.form).forEach(([k, v]) => { if (v) formData.append(k, v as string); });

      this.api.registerNageur(formData).subscribe({
        next: () => {
          this.successMessage = 'Nageur ajouté !';
          this.loadNageurs();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    }
  }

  deleteNageur(id: string, nom: string) {
    if (!confirm(`Supprimer le nageur ${nom} ?`)) return;
    this.api.deleteNageur(id).subscribe({
      next: () => {
        this.successMessage = 'Nageur supprimé !';
        this.loadNageurs();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => { this.errorMessage = 'Erreur lors de la suppression.'; }
    });
  }

  getInitials(nageur: any): string {
    const nom = nageur.utilisateur?.nom || '?';
    const prenom = nageur.utilisateur?.prenom || '';
    return (nom[0] + (prenom[0] || '')).toUpperCase();
  }

  navigate(route: string) { this.router.navigate([route]); }
}