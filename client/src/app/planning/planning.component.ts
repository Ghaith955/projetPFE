import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-planning',
  templateUrl: './planning.component.html',
  styleUrls: ['./planning.component.css']
})
export class PlanningComponent implements OnInit {
  entrainements: any[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  showModal = false;
  isEditMode = false;
  selectedId = '';

  // Calendar
  currentDate = new Date();
  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();
  calendarDays: any[] = [];
  selectedDay: any = null;
  viewMode: 'calendar' | 'list' = 'calendar';

  form = {
    titre: '', date: '', heureDebut: '08:00', heureFin: '10:00',
    type: 'Endurance', intensite: 'Modérée', duree: 120,
    lieu: 'Piscine principale', description: '', statut: 'Planifié'
  };

  types = ['Endurance', 'Vitesse', 'Technique', 'Force', 'Récupération'];
  intensites = ['Faible', 'Modérée', 'Élevée', 'Maximale'];
  statuts = ['Planifié', 'En cours', 'Terminé', 'Annulé'];
  monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  constructor(private router: Router) {}

  ngOnInit() { this.loadEntrainements(); }

  getHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };
  }

  async loadEntrainements() {
    this.isLoading = true;
    try {
      const res = await fetch('http://localhost:3300/planning', { headers: this.getHeaders() });
      const data = await res.json();
      this.entrainements = Array.isArray(data) ? data : [];
      this.buildCalendar();
    } catch {
      this.errorMessage = 'Erreur de chargement.';
    } finally {
      this.isLoading = false;
    }
  }

  buildCalendar() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const days: any[] = [];

    // start from Monday
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    for (let i = 0; i < startDow; i++) days.push({ empty: true });

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(this.currentYear, this.currentMonth, d);
      const dateStr = date.toISOString().substring(0, 10);
      const events = this.entrainements.filter(e => {
        return new Date(e.date).toISOString().substring(0, 10) === dateStr;
      });
      const isToday = dateStr === new Date().toISOString().substring(0, 10);
      days.push({ day: d, date: dateStr, events, isToday, empty: false });
    }

    this.calendarDays = days;
  }

  prevMonth() {
    if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; }
    else this.currentMonth--;
    this.buildCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; }
    else this.currentMonth++;
    this.buildCalendar();
  }

  selectDay(day: any) {
    if (day.empty) return;
    this.selectedDay = day;
  }

  openAddModal(date?: string) {
    this.isEditMode = false;
    this.resetForm();
    if (date) this.form.date = date;
    this.showModal = true;
  }

  openEditModal(e: any) {
    this.isEditMode = true;
    this.selectedId = e._id;
    this.form = {
      titre: e.titre || '',
      date: new Date(e.date).toISOString().substring(0, 10),
      heureDebut: e.heureDebut || '08:00',
      heureFin: e.heureFin || '10:00',
      type: e.type || 'Endurance',
      intensite: e.intensite || 'Modérée',
      duree: e.duree || 120,
      lieu: e.lieu || 'Piscine principale',
      description: e.description || '',
      statut: e.statut || 'Planifié'
    };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.resetForm(); }

  resetForm() {
    this.form = { titre: '', date: '', heureDebut: '08:00', heureFin: '10:00', type: 'Endurance', intensite: 'Modérée', duree: 120, lieu: 'Piscine principale', description: '', statut: 'Planifié' };
    this.errorMessage = '';
    this.successMessage = '';
  }

  async onSubmit() {
    this.errorMessage = '';
    if (!this.form.titre || !this.form.date) {
      this.errorMessage = 'Veuillez remplir les champs obligatoires.';
      return;
    }
    try {
      const url = this.isEditMode ? `http://localhost:3300/planning/${this.selectedId}` : 'http://localhost:3300/planning';
      const method = this.isEditMode ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: this.getHeaders(), body: JSON.stringify(this.form) });
      const data = await res.json();
      if (res.ok) {
        this.successMessage = this.isEditMode ? 'Entraînement mis à jour!' : 'Entraînement ajouté!';
        await this.loadEntrainements();
        if (this.selectedDay) {
          this.selectedDay = this.calendarDays.find(d => d.date === this.selectedDay.date);
        }
        setTimeout(() => this.closeModal(), 1500);
      } else {
        this.errorMessage = data.message || 'Erreur.';
      }
    } catch {
      this.errorMessage = 'Erreur de connexion.';
    }
  }

  async deleteEntrainement(id: string) {
    if (!confirm('Supprimer cet entraînement ?')) return;
    try {
      const res = await fetch(`http://localhost:3300/planning/${id}`, { method: 'DELETE', headers: this.getHeaders() });
      if (res.ok) {
        this.successMessage = 'Entraînement supprimé!';
        await this.loadEntrainements();
        if (this.selectedDay) {
          this.selectedDay = this.calendarDays.find(d => d.date === this.selectedDay.date) || null;
        }
        setTimeout(() => this.successMessage = '', 3000);
      }
    } catch {
      this.errorMessage = 'Erreur lors de la suppression.';
    }
  }

  getTypeColor(type: string): string {
    const colors: any = { 'Endurance': '#185fa5', 'Vitesse': '#c8102e', 'Technique': '#0d4228', 'Force': '#ba7517', 'Récupération': '#639922' };
    return colors[type] || '#666';
  }

  getTypeBg(type: string): string {
    const colors: any = { 'Endurance': '#e6f1fb', 'Vitesse': '#fff0f2', 'Technique': '#f0faf5', 'Force': '#faeeda', 'Récupération': '#eaf3de' };
    return colors[type] || '#f5f5f5';
  }

  getIntensiteClass(i: string): string {
    const map: any = { 'Faible': 'int-faible', 'Modérée': 'int-moderee', 'Élevée': 'int-elevee', 'Maximale': 'int-maximale' };
    return map[i] || '';
  }

  formatDate(date: string) {
    return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
  }

  navigate(route: string) { this.router.navigate([route]); }
  logout() { localStorage.clear(); this.router.navigate(['/login']); }
}