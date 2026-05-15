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
  entraineurs: any[] = [];
  searchQuery = '';
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  showModal = false;
  isEditMode = false;
  selectedNageurId = '';
  modalCoachId = '';
  initialCoachId = '';
  openCoachPickerFor: string | null = null;

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

  ngOnInit() {
    this.loadNageurs();
    if (this.isAdmin) {
      this.loadEntraineurs();
    }
  }

  loadEntraineurs() {
    this.api.getAllEntraineurs().subscribe({
      next: (data) => {
        this.entraineurs = Array.isArray(data) ? data : [];
      },
      error: () => {
        this.errorMessage = 'Erreur lors du chargement des entraineurs.';
      }
    });
  }

  loadNageurs() {
    this.isLoading = true;
    this.api.getAllNageurs().subscribe({
      next: (data) => {
        const raw = Array.isArray(data) ? data : [];
        this.nageurs = this.filterCoachSwimmers(raw);
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

  getCoachLabel(nageur: any): string {
    const coach = nageur.entraineur?.utilisateur;
    if (!coach) return 'En attente d\'affectation';
    const fullName = `${coach.prenom || ''} ${coach.nom || ''}`.trim();
    if (fullName) return fullName;
    return 'Entraineur';
  }

  getCoachInitials(entraineur: any): string {
    const nom = entraineur?.utilisateur?.nom || '?';
    const prenom = entraineur?.utilisateur?.prenom || '';
    return (nom[0] + (prenom[0] || '')).toUpperCase();
  }

  getMatchingEntraineurs(nageur: any): any[] {
    const nageurSpecialites = (Array.isArray(nageur.specialite) ? nageur.specialite : []).filter((spec: string) => !!spec);
    if (nageurSpecialites.length === 0) return this.entraineurs;
    return this.entraineurs.filter((e) => {
      const coachSpecs = Array.isArray(e.specialites) ? e.specialites : [];
      return nageurSpecialites.some((spec: string) => coachSpecs.includes(spec));
    });
  }

  assignNageur(nageur: any, entraineurId: string, onDone?: () => void) {
    if (!entraineurId) {
      this.errorMessage = 'Veuillez selectionner un entraineur.';
      return;
    }

    this.api.assignNageurToEntraineur({ nageurId: nageur._id, entraineurId }).subscribe({
      next: (res: any) => {
        this.successMessage = 'Affectation mise a jour.';
        this.loadNageurs();
        setTimeout(() => (this.successMessage = ''), 3000);
        if (onDone) onDone();
        if (this.openCoachPickerFor === nageur._id) this.openCoachPickerFor = null;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de l\'affectation.';
      }
    });
  }

  openAddModal() {
    this.isEditMode = false;
    this.modalCoachId = '';
    this.initialCoachId = '';
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(nageur: any) {
    this.isEditMode = true;
    this.selectedNageurId = nageur._id;
    this.initialCoachId = nageur.entraineur?._id || '';
    this.modalCoachId = this.initialCoachId;
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

  setModalCoach(entraineurId: string) {
    this.modalCoachId = entraineurId;
  }

  toggleCoachPicker(nageurId: string) {
    this.openCoachPickerFor = this.openCoachPickerFor === nageurId ? null : nageurId;
  }

  onSubmit() {
    this.errorMessage = '';
    if (!this.form.nom || !this.form.prenom || !this.form.email || !this.form.age) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.'; return;
    }

    if (this.isEditMode) {
      this.api.updateNageur(this.selectedNageurId, this.form).subscribe({
        next: () => {
          const shouldAssign = this.isAdmin && this.modalCoachId && this.modalCoachId !== this.initialCoachId;
          if (shouldAssign) {
            const nageur = this.nageurs.find((n) => n._id === this.selectedNageurId) || { _id: this.selectedNageurId };
            this.assignNageur(nageur, this.modalCoachId, () => {
              this.successMessage = 'Nageur mis a jour !';
              this.loadNageurs();
              setTimeout(() => this.closeModal(), 1500);
            });
          } else {
            this.successMessage = 'Nageur mis a jour !';
            this.loadNageurs();
            setTimeout(() => this.closeModal(), 1500);
          }
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    } else {
      const formData = new FormData();
      Object.entries(this.form).forEach(([k, v]) => { if (v) formData.append(k, v as string); });

      this.api.registerNageur(formData).subscribe({
        next: (res: any) => {
          const createdId = res?.nageur?._id;
          if (this.isAdmin && createdId && this.modalCoachId) {
            this.assignNageur({ _id: createdId }, this.modalCoachId, () => {
              this.successMessage = 'Nageur ajoute !';
              this.loadNageurs();
              setTimeout(() => this.closeModal(), 1500);
            });
          } else {
            this.successMessage = 'Nageur ajoute !';
            this.loadNageurs();
            setTimeout(() => this.closeModal(), 1500);
          }
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

  private filterCoachSwimmers(list: any[]): any[] {
    if (this.auth.role !== 'ENTRAINEUR') return list;
    const allowed = new Set(this.auth.getCoachSwimmerIds());
    if (!allowed.size) return list;
    return list.filter((n: any) => allowed.has(String(n?._id || n?.id || n)));
  }

  navigate(route: string) { this.router.navigate([route]); }
}