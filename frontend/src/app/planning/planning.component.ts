import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

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
  allNageurs: any[] = [];

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
    lieu: 'Piscine principale', description: '', statut: 'Planifié', nageurs: [] as string[]
  };

  types = ['Endurance', 'Vitesse', 'Technique', 'Force', 'Récupération'];
  intensites = ['Faible', 'Modérée', 'Élevée', 'Maximale'];
  statuts = ['Planifié', 'En cours', 'Terminé', 'Annulé'];
  monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  get isAdmin() { return this.auth.role === 'RESPONSABLE'; }
  get isEntraineur() { return this.auth.role === 'ENTRAINEUR'; }
  get canEdit() { return this.isAdmin || this.isEntraineur; }

  ngOnInit() { 
    this.loadEntrainements(); 
    this.loadNageurs();
  }

  loadNageurs() {
    this.api.getAllNageurs().subscribe({
      next: (data) => {
        this.allNageurs = Array.isArray(data) ? data : [];
      }
    });
  }

  loadEntrainements() {
    this.isLoading = true;
    this.api.getAllEntrainements().subscribe({
      next: (data) => {
        this.entrainements = Array.isArray(data) ? data : [];
        this.buildCalendar();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Erreur de chargement.';
        this.isLoading = false;
      }
    });
  }

  buildCalendar() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const days: any[] = [];

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
      statut: e.statut || 'Planifié',
      nageurs: e.nageurs ? e.nageurs.map((n: any) => n._id || n) : []
    };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.resetForm(); }

  resetForm() {
    this.form = { titre: '', date: '', heureDebut: '08:00', heureFin: '10:00', type: 'Endurance', intensite: 'Modérée', duree: 120, lieu: 'Piscine principale', description: '', statut: 'Planifié', nageurs: [] };
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit() {
    this.errorMessage = '';
    if (!this.form.titre || !this.form.date) {
      this.errorMessage = 'Veuillez remplir les champs obligatoires.';
      return;
    }
    if (this.isEditMode) {
      this.api.updateEntrainement(this.selectedId, this.form).subscribe({
        next: () => {
          this.closeModal();
          this.successMessage = 'Entraînement mis à jour !';
          this.loadEntrainements();
          if (this.selectedDay) {
            setTimeout(() => {
              this.selectedDay = this.calendarDays.find(d => d.date === this.selectedDay?.date);
            }, 100);
          }
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    } else {
      this.api.createEntrainement(this.form).subscribe({
        next: () => {
          this.closeModal();
          this.successMessage = 'Entraînement ajouté !';
          this.loadEntrainements();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur.'; }
      });
    }
  }

  deleteEntrainement(id: string) {
    if (!confirm('Supprimer cet entraînement ?')) return;
    this.api.deleteEntrainement(id).subscribe({
      next: () => {
        this.successMessage = 'Entraînement supprimé !';
        this.loadEntrainements();
        if (this.selectedDay) {
          setTimeout(() => {
            this.selectedDay = this.calendarDays.find(d => d.date === this.selectedDay?.date) || null;
          }, 100);
        }
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => { this.errorMessage = 'Erreur lors de la suppression.'; }
    });
  }

  getTypeColor(type: string): string {
    const colors: any = { 'Endurance': '#6366f1', 'Vitesse': '#ef4444', 'Technique': '#10b981', 'Force': '#f59e0b', 'Récupération': '#06b6d4' };
    return colors[type] || '#6b7280';
  }

  getTypeBg(type: string): string {
    const colors: any = { 'Endurance': 'rgba(99,102,241,0.1)', 'Vitesse': 'rgba(239,68,68,0.1)', 'Technique': 'rgba(16,185,129,0.1)', 'Force': 'rgba(245,158,11,0.1)', 'Récupération': 'rgba(6,182,212,0.1)' };
    return colors[type] || 'var(--bg-input)';
  }

  getIntensiteClass(i: string): string {
    const map: any = { 'Faible': 'int-faible', 'Modérée': 'int-moderee', 'Élevée': 'int-elevee', 'Maximale': 'int-maximale' };
    return map[i] || '';
  }

  formatDate(date: string) {
    return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
  }

  navigate(route: string) { this.router.navigate([route]); }
}