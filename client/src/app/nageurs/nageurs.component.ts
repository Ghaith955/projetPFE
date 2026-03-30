import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nageurs',
  templateUrl: './nageurs.component.html',
  styleUrls: ['./nageurs.component.css']
})
export class NageursComponent implements OnInit {
  nageurs: any[] = [];
  filteredNageurs: any[] = [];
  searchQuery: string = '';
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';

  showModal: boolean = false;
  isEditMode: boolean = false;
  selectedNageurId: string = '';

  form = {
    nom: '',
    prenom: '',
    email: '',
    password: '',
    phone: '',
    age: '',
    sexe: 'Homme',
    poid: '',
    specialite: ''
  };

  sexeOptions = ['Homme', 'Femme', 'Autre'];
  specialiteOptions = ['Nage libre', 'Dos crawlé', 'Brasse', 'Papillon', 'Quatre nages'];

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadNageurs();
  }

  getHeaders() {
    const token = localStorage.getItem('token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async loadNageurs() {
    this.isLoading = true;
    try {
      const response = await fetch('http://localhost:3300/nageurs', {
        headers: this.getHeaders()
      });
      const data = await response.json();
      this.nageurs = Array.isArray(data) ? data : [];
      this.filteredNageurs = [...this.nageurs];
    } catch (err) {
      this.errorMessage = 'Erreur de chargement des nageurs.';
    } finally {
      this.isLoading = false;
    }
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
      nom: nageur.utilisateur?.nom || '',
      prenom: nageur.utilisateur?.prenom || '',
      email: nageur.utilisateur?.email || '',
      password: '',
      phone: nageur.utilisateur?.phone || '',
      age: nageur.age || '',
      sexe: nageur.sexe || 'Homme',
      poid: nageur.poid || '',
      specialite: nageur.specialite?.[0] || ''
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.resetForm();
  }

  resetForm() {
    this.form = { nom: '', prenom: '', email: '', password: '', phone: '', age: '', sexe: 'Homme', poid: '', specialite: '' };
    this.errorMessage = '';
    this.successMessage = '';
  }

  async onSubmit() {
    this.errorMessage = '';
    if (!this.form.nom || !this.form.prenom || !this.form.email || !this.form.age) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    try {
      if (this.isEditMode) {
        const response = await fetch(`http://localhost:3300/nageurs/${this.selectedNageurId}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(this.form)
        });
        const data = await response.json();
        if (response.ok) {
          this.successMessage = 'Nageur mis à jour avec succès!';
          this.loadNageurs();
          setTimeout(() => this.closeModal(), 1500);
        } else {
          this.errorMessage = data.message || 'Erreur lors de la mise à jour.';
        }
      } else {
        const formData = new FormData();
        Object.entries(this.form).forEach(([k, v]) => formData.append(k, v as string));

        const response = await fetch('http://localhost:3300/nageurs/register_Nageur', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await response.json();
        if (response.ok) {
          this.successMessage = 'Nageur ajouté avec succès!';
          this.loadNageurs();
          setTimeout(() => this.closeModal(), 1500);
        } else {
          this.errorMessage = data.message || "Erreur lors de l'ajout.";
        }
      }
    } catch (err) {
      this.errorMessage = 'Erreur de connexion au serveur.';
    }
  }

  async deleteNageur(id: string, nom: string) {
    if (!confirm(`Supprimer le nageur ${nom} ?`)) return;
    try {
      const response = await fetch(`http://localhost:3300/nageurs/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (response.ok) {
        this.successMessage = 'Nageur supprimé avec succès!';
        this.loadNageurs();
        setTimeout(() => this.successMessage = '', 3000);
      }
    } catch (err) {
      this.errorMessage = 'Erreur lors de la suppression.';
    }
  }

  getInitials(nageur: any): string {
    const nom = nageur.utilisateur?.nom || '?';
    const prenom = nageur.utilisateur?.prenom || '';
    return (nom[0] + (prenom[0] || '')).toUpperCase();
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}