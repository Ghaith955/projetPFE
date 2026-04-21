import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService, User } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  currentDate = '';
  pendingDemandes = 0;

  /* ── Admin ── */
  stats: any = { nageurs: 0, entraineurs: 0, competitions: 0, entrainements: 0, users: 0 };
  nageurs: any[] = [];
  entraineurs: any[] = [];
  pendingRegistrations: any[] = [];
  upcomingCompetitions: any[] = [];
  recentUsers: any[] = [];
  actionLoading: { [key: string]: boolean } = {};
  private scoreCache = new Map<string, number>();
  selectedProfile: { user: any; source: any; role?: string } | null = null;
  showProfileModal = false;

  /* Chart data */
  chartMonths = ['months.jan', 'months.feb', 'months.mar', 'months.apr', 'months.may'];
  chartAtt = [65, 78, 72, 85, 80];
  chartPerf = [55, 70, 68, 78, 72];

  /* DSS - Admin */
  dssAlerts: any[] = [];
  dssTopPerformers: any[] = [];
  dssFatigueRisks: any[] = [];

  /* DSS - Coach */
  coachDecisions: any[] = [];
  coachFeedbacks: any[] = [];

  /* ── Swimmer ── */
  bestTime = '58.4';
  bestTimeDate = '10 Avril 2024';
  trainingLoad = 16;
  attendancePercent = 92;
  feedbackRating = 4;
  feedbackComment = '';
  selectedPeriod = 'trimestre';
  weight = 72;
  height = 170;
  get bmi() { return +(this.weight / ((this.height / 100) ** 2)).toFixed(1); }

  /* SVG chart points */
  perfPts = '40,155 110,140 180,142 250,128 320,130 390,118 460,112 530,98 600,88 670,78';
  attPts  = '40,148 110,132 180,138 250,118 320,122 390,102 460,108 530,88 600,78 670,62';

  /* ── Modals / Forms ── */
  showTrainingModal = false;
  showCompetitionModal = false;
  showFeedbackModal = false;
  trainingForm = { titre: '', date: '', heure: '', duree: 60, nageurs: [] as string[], notes: '' };
  competitionForm = { nom: '', date: '', lieu: '', niveauRequis: 'Junior', nageurs: [] as string[] };
  feedbackForm = { nageurId: '', rating: 0, comment: '', type: 'general' };
  formSubmitting = false;

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.currentUser;
    this.auth.currentUser$.subscribe(u => this.currentUser = u);
    const now = new Date();
    this.currentDate = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    this.loadData();
  }

  loadData() {
    if (this.isAdmin) this.loadAdminData();
    else if (this.isEntraineur) this.loadCoachData();
    else if (this.isNageur) this.loadSwimmerData();
  }

  loadAdminData() {
    this.api.getStats().subscribe({ next: d => { this.stats = d; this.recentUsers = d.recentUsers || []; }, error: () => {} });
    this.api.getPendingRegistrations().subscribe({ next: d => { this.pendingRegistrations = Array.isArray(d) ? d : []; }, error: () => {} });
    this.api.getAllNageurs().subscribe({ next: d => { this.nageurs = Array.isArray(d) ? d : []; this.computeAdminDSS(); }, error: () => {} });
    this.api.getAllEntraineurs().subscribe({ next: d => { this.entraineurs = Array.isArray(d) ? d : []; }, error: () => {} });
    this.api.getAllCompetitions().subscribe({ next: d => { this.upcomingCompetitions = Array.isArray(d) ? d.slice(0, 5) : []; }, error: () => {} });
    this.api.getPendingDemandesCount().subscribe({ next: d => { this.pendingDemandes = d.count; }, error: () => {} });
  }

  loadCoachData() {
    this.api.getAllNageurs().subscribe({ next: d => { this.nageurs = Array.isArray(d) ? d : []; this.computeCoachDSS(); }, error: () => {} });
    this.api.getAllEntraineurs().subscribe({ next: d => { this.entraineurs = Array.isArray(d) ? d : []; }, error: () => {} });
    this.api.getAllCompetitions().subscribe({ next: d => { this.upcomingCompetitions = Array.isArray(d) ? d : []; }, error: () => {} });
    this.api.getPendingDemandesCount().subscribe({ next: d => { this.pendingDemandes = d.count; }, error: () => {} });
  }

  loadSwimmerData() {
    this.api.getPerformanceInsights({ nageurId: this.currentUser?.id }).subscribe({
      next: (d: any) => {
        if (d) { this.bestTime = d.bestTime || '58.4'; this.trainingLoad = d.trainingLoad || 16; this.attendancePercent = d.attendance || 92; }
      }, error: () => {}
    });
    this.api.getAllCompetitions().subscribe({ next: d => { this.upcomingCompetitions = Array.isArray(d) ? d.slice(0, 3) : []; }, error: () => {} });
    this.api.getPendingDemandesCount().subscribe({ next: d => { this.pendingDemandes = d.count; }, error: () => {} });
  }

  /* ── DSS Computations ── */
  computeAdminDSS() {
    const n = this.nageurs;
    if (!n.length) return;
    this.dssTopPerformers = n.slice(0, 3).map((s, i) => ({
      rank: i + 1, name: this.fullName(s), time: ['58.4s', '57.5s', '57.8s'][i],
      detail: ['Br: 119.5', 'Br: 180.8', 'Br: 57.6s'][i], avatar: this.avatarUrl(s)
    }));
    this.dssAlerts = n.slice(0, 3).map((s, i) => ({
      rank: i + 1, name: this.fullName(s),
      prev: ['-1 82.5s', '-1 68.5s', '-1 62.5s'][i], change: ['-0.3s', '-0.8s', '-0.7s'][i],
      avatar: this.avatarUrl(s)
    }));
    this.dssFatigueRisks = n.slice(0, 2).map((s, i) => ({
      name: this.fullName(s), detailKey: ['dashboard.common.fatigueHigh', 'dashboard.common.fatigueMedium'][i],
      time: ['57.5s', '59.6s'][i], severity: ['high', 'medium'][i], avatar: this.avatarUrl(s)
    }));
  }

  computeCoachDSS() {
    const n = this.nageurs;
    if (!n.length) return;
    this.coachDecisions = [
      { icon: 'trophy', textKey: 'dashboard.coach.decisions.trophy', priority: 'high' },
      { icon: 'alert', textKey: 'dashboard.coach.decisions.alert', priority: 'medium' },
      { icon: 'calendar', textKey: 'dashboard.coach.decisions.calendar', priority: 'low' }
    ];
    this.coachFeedbacks = n.slice(0, 3).map((s, i) => ({
      name: this.fullName(s), statusKey: ['dashboard.coach.feedback.status.progress', 'dashboard.coach.feedback.status.stable', 'dashboard.coach.feedback.status.watch'][i],
      statusClass: ['green', 'blue', 'amber'][i],
      noteKey: ['dashboard.coach.feedback.note.up', 'dashboard.coach.feedback.note.steady', 'dashboard.coach.feedback.note.down'][i],
      avatar: this.avatarUrl(s)
    }));
    this.dssTopPerformers = n.slice(0, 3).map((s, i) => ({
      rank: i + 1, name: this.fullName(s), time: ['58.4s', '57.5s', '57.8s'][i],
      detail: ['Br: 119.5', 'Br: 180.8', 'Br: 57.6s'][i], avatar: this.avatarUrl(s)
    }));
    this.dssFatigueRisks = n.slice(0, 2).map((s, i) => ({
      name: this.fullName(s), detailKey: ['dashboard.common.fatigueHigh', 'dashboard.common.fatigueMedium'][i],
      time: ['57.5s', '59.6s'][i], severity: ['high', 'medium'][i], avatar: this.avatarUrl(s)
    }));
  }

  /* ── Helpers ── */
  fullName(n: any): string { const u = n?.utilisateur || n; return `${u?.prenom || ''} ${u?.nom || ''}`.trim() || 'Nageur'; }
  avatarUrl(n: any): string { const img = n?.utilisateur?.imageprofile || n?.imageprofile; return img ? 'http://localhost:3300' + img : ''; }
  getInitials(u: any): string { const x = u?.utilisateur || u; return ((x?.prenom?.[0] || '') + (x?.nom?.[0] || '')).toUpperCase(); }
  selectProfile(entity: any, role?: string) {
    const user = entity?.utilisateur || entity;
    this.selectedProfile = { user, source: entity, role: role || user?.role || entity?.role };
    this.showProfileModal = true;
  }
  closeProfile() { this.showProfileModal = false; }
  clearProfile() {
    this.selectedProfile = null;
    this.showProfileModal = false;
  }
  cachedScore(id: string): number { if (!this.scoreCache.has(id)) this.scoreCache.set(id, +(90 + Math.random() * 8).toFixed(1)); return this.scoreCache.get(id)!; }
  setRating(s: number) { this.feedbackRating = s; }

  sendFeedback() {
    if (!this.feedbackComment.trim()) return;
    this.feedbackComment = '';
  }

  /* ── Form actions ── */
  openTrainingModal() { this.trainingForm = { titre: '', date: '', heure: '', duree: 60, nageurs: [], notes: '' }; this.showTrainingModal = true; }
  openCompetitionModal() { this.competitionForm = { nom: '', date: '', lieu: '', niveauRequis: 'Junior', nageurs: [] }; this.showCompetitionModal = true; }
  openFeedbackModal(nageurId?: string) { this.feedbackForm = { nageurId: nageurId || '', rating: 0, comment: '', type: 'general' }; this.showFeedbackModal = true; }

  closeModals() { this.showTrainingModal = false; this.showCompetitionModal = false; this.showFeedbackModal = false; }

  submitTraining() {
    this.formSubmitting = true;
    this.api.createEntrainement(this.trainingForm).subscribe({
      next: () => { this.formSubmitting = false; this.showTrainingModal = false; this.loadData(); },
      error: () => { this.formSubmitting = false; }
    });
  }

  submitCompetition() {
    this.formSubmitting = true;
    this.api.createCompetition(this.competitionForm).subscribe({
      next: () => { this.formSubmitting = false; this.showCompetitionModal = false; this.loadData(); },
      error: () => { this.formSubmitting = false; }
    });
  }

  submitFeedback() {
    if (!this.feedbackForm.comment.trim()) return;
    this.formSubmitting = true;
    setTimeout(() => { this.formSubmitting = false; this.showFeedbackModal = false; }, 600);
  }

  setFormRating(stars: number) { this.feedbackForm.rating = stars; }

  toggleNageurSelection(id: string, form: 'training' | 'competition') {
    const list = form === 'training' ? this.trainingForm.nageurs : this.competitionForm.nageurs;
    const idx = list.indexOf(id);
    if (idx > -1) list.splice(idx, 1); else list.push(id);
  }

  isNageurSelected(id: string, form: 'training' | 'competition'): boolean {
    return (form === 'training' ? this.trainingForm.nageurs : this.competitionForm.nageurs).includes(id);
  }

  /* ── Registration actions ── */
  approveRegistration(id: string) {
    this.actionLoading[id] = true;
    this.api.respondPendingRegistration(id, 'approve').subscribe({
      next: () => { this.pendingRegistrations = this.pendingRegistrations.filter(u => u._id !== id); this.actionLoading[id] = false; this.loadData(); },
      error: () => { this.actionLoading[id] = false; }
    });
  }

  rejectRegistration(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir rejeter cette inscription ?')) return;
    this.actionLoading[id] = true;
    this.api.respondPendingRegistration(id, 'reject').subscribe({
      next: () => { this.pendingRegistrations = this.pendingRegistrations.filter(u => u._id !== id); this.actionLoading[id] = false; this.loadData(); },
      error: () => { this.actionLoading[id] = false; }
    });
  }

  get isAdmin() { return this.currentUser?.role === 'RESPONSABLE'; }
  get isEntraineur() { return this.currentUser?.role === 'ENTRAINEUR'; }
  get isNageur() { return this.currentUser?.role === 'NAGEUR'; }

  getRoleLabel(role: string): string {
    switch (role) { case 'RESPONSABLE': return 'Admin'; case 'ENTRAINEUR': return 'Entraîneur'; case 'NAGEUR': return 'Nageur'; default: return role; }
  }

  getTimeAgo(date: string): string {
    const d = Date.now() - new Date(date).getTime(), m = Math.floor(d / 60000);
    if (m < 60) return `il y a ${m}min`; const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h}h`; return `il y a ${Math.floor(h / 24)}j`;
  }

  fmtDate(date: string): string { return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  navigate(route: string) { this.router.navigate([route]); }
}