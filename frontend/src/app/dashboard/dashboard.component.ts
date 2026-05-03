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

  /* DSS - Admin/Coach — real IDSS data */
  idssSummary: any = null;
  dssAlerts: any[] = [];
  dssTopPerformers: any[] = [];
  dssFatigueRisks: any[] = [];
  idssAtRisk: any[] = [];
  idssLevelCounts: any = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  idssPendingAlerts = 0;

  /* DSS - Coach */
  coachDecisions: any[] = [];
  coachFeedbacks: any[] = [];

  /* DSS - Swimmer */
  idssMyDecision: any = null;
  idssMyBaseline: any = null;

  /* ── AI Brain (Python) ── */
  aiBrainLoading = false;
  aiBrainOnline = false;
  aiBrainDashboard: any = null;
  aiBrainSwimmers: any[] = [];
  aiBrainAtRisk: any[] = [];
  aiBrainHealthy: any[] = [];
  aiBrainStats = { total: 0, atRisk: 0, avgAcwr: 0, highFatigue: 0 };

  /* AI Brain - Swimmer individual */
  aiMyAnalysis: any = null;
  aiMyPrediction: any = null;
  aiMyLoading = false;

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
  swimmerSexe = 'Masculin';
  get bmi() { return +(this.weight / ((this.height / 100) ** 2)).toFixed(1); }
  get bodyImagePath(): string { return this.swimmerSexe === 'Féminin' ? 'assets/branding/bodyf.png' : 'assets/branding/bodym.png'; }

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
    this.api.getAllNageurs().subscribe({ next: d => { this.nageurs = Array.isArray(d) ? d : []; }, error: () => {} });
    this.api.getAllEntraineurs().subscribe({ next: d => { this.entraineurs = Array.isArray(d) ? d : []; }, error: () => {} });
    this.api.getAllCompetitions().subscribe({ next: d => { this.upcomingCompetitions = Array.isArray(d) ? d.slice(0, 5) : []; }, error: () => {} });
    this.api.getPendingDemandesCount().subscribe({ next: d => { this.pendingDemandes = d.count; }, error: () => {} });
    this.loadIdssSummary();
    this.loadAiBrainDashboard();
  }

  loadCoachData() {
    this.api.getAllNageurs().subscribe({ next: d => { this.nageurs = Array.isArray(d) ? d : []; this.computeCoachStaticCards(); }, error: () => {} });
    this.api.getAllEntraineurs().subscribe({ next: d => { this.entraineurs = Array.isArray(d) ? d : []; }, error: () => {} });
    this.api.getAllCompetitions().subscribe({ next: d => { this.upcomingCompetitions = Array.isArray(d) ? d : []; }, error: () => {} });
    this.api.getPendingDemandesCount().subscribe({ next: d => { this.pendingDemandes = d.count; }, error: () => {} });
    this.loadIdssSummary();
    this.loadAiBrainDashboard();
  }

  loadSwimmerData() {
    this.auth.getMe().subscribe({
      next: (d: any) => {
        if (d?.roleData?.sexe) this.swimmerSexe = d.roleData.sexe;
        if (d?.roleData?.poid) this.weight = +d.roleData.poid || 72;
      }, error: () => {}
    });
    this.api.getPerformanceInsights({ nageurId: this.currentUser?.id }).subscribe({
      next: (d: any) => {
        if (d) { this.bestTime = d.bestTime || '58.4'; this.trainingLoad = d.trainingLoad || 16; this.attendancePercent = d.attendance || 92; }
      }, error: () => {}
    });
    this.api.getAllCompetitions().subscribe({ next: d => { this.upcomingCompetitions = Array.isArray(d) ? d.slice(0, 3) : []; }, error: () => {} });
    this.api.getPendingDemandesCount().subscribe({ next: d => { this.pendingDemandes = d.count; }, error: () => {} });
    // Load IDSS swimmer status
    this.api.getIdssMyStatus().subscribe({
      next: (d: any) => {
        this.idssMyDecision = d?.decision || null;
        this.idssMyBaseline = d?.baseline || null;
      }, error: () => {}
    });
    // Load AI Brain analysis for this swimmer
    this.loadAiMyAnalysis();
  }

  /* ── IDSS Data Loaders ── */
  loadIdssSummary() {
    this.api.getIdssSummary().subscribe({
      next: (d: any) => {
        this.idssSummary      = d;
        this.idssLevelCounts  = d.levelCounts || { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
        this.idssPendingAlerts = d.pendingAlerts || 0;
        this.idssAtRisk = d.atRiskSwimmers || [];

        // Map to existing template structure
        this.dssFatigueRisks = this.idssAtRisk.slice(0, 5).map((r: any) => ({
          name:      this.fullName(r.nageur),
          avatar:    this.avatarUrl(r.nageur),
          severity:  r.fatigueLevel === 'CRITICAL' ? 'high' : 'medium',
          fatigueScore: r.fatigueScore,
          fatigueLevel: r.fatigueLevel,
          recommendation: r.recommendation,
          triggeredRules: r.triggeredRules || [],
          decisionId: r.decisionId
        }));

        // Alert list = unacknowledged high-risk decisions
        this.dssAlerts = this.idssAtRisk.slice(0, 4).map((r: any) => ({
          name:    this.fullName(r.nageur),
          avatar:  this.avatarUrl(r.nageur),
          level:   r.fatigueLevel,
          score:   r.fatigueScore,
          message: r.triggeredRules?.[0]?.message || 'Risque de fatigue détecté'
        }));
      },
      error: () => {}
    });
  }

  acknowledgeAlert(decisionId: string) {
    this.api.acknowledgeIdssDecision(decisionId).subscribe({
      next: () => this.loadIdssSummary(),
      error: () => {}
    });
  }

  /* ── DSS Computations (static cards for coach) ── */
  computeCoachStaticCards() {
    const n = this.nageurs;
    if (!n.length) return;
    this.coachDecisions = [
      { icon: 'trophy', textKey: 'dashboard.coach.decisions.trophy', priority: 'high' },
      { icon: 'alert',  textKey: 'dashboard.coach.decisions.alert',  priority: 'medium' },
      { icon: 'calendar', textKey: 'dashboard.coach.decisions.calendar', priority: 'low' }
    ];
    this.coachFeedbacks = n.slice(0, 3).map((s, i) => ({
      name: this.fullName(s),
      statusKey: ['dashboard.coach.feedback.status.progress','dashboard.coach.feedback.status.stable','dashboard.coach.feedback.status.watch'][i],
      statusClass: ['green','blue','amber'][i],
      noteKey: ['dashboard.coach.feedback.note.up','dashboard.coach.feedback.note.steady','dashboard.coach.feedback.note.down'][i],
      avatar: this.avatarUrl(s)
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

  /* ── AI Brain Data Loaders ── */
  loadAiBrainDashboard() {
    this.aiBrainLoading = true;
    this.api.aiDashboard().subscribe({
      next: (d: any) => {
        this.aiBrainOnline = true;
        this.aiBrainDashboard = d;
        const swimmers = d?.swimmers || d?.results || [];
        this.aiBrainSwimmers = swimmers;
        this.aiBrainAtRisk = swimmers.filter((s: any) => s.fatigue_level === 'HIGH' || s.fatigue_level === 'CRITICAL');
        this.aiBrainHealthy = swimmers.filter((s: any) => s.fatigue_level === 'LOW');

        const total = swimmers.length;
        const atRisk = this.aiBrainAtRisk.length;
        const acwrVals = swimmers.map((s: any) => s.acwr).filter((v: number) => v != null && v > 0);
        const avgAcwr = acwrVals.length ? +(acwrVals.reduce((a: number, b: number) => a + b, 0) / acwrVals.length).toFixed(2) : 0;
        const highFatigue = swimmers.filter((s: any) => (s.fatigue_score || 0) >= 60).length;
        this.aiBrainStats = { total, atRisk, avgAcwr, highFatigue };
        this.aiBrainLoading = false;
      },
      error: () => { this.aiBrainOnline = false; this.aiBrainLoading = false; }
    });
  }

  loadAiMyAnalysis() {
    if (!this.currentUser?.id) return;
    this.aiMyLoading = true;
    // Get the nageur ID from auth
    this.auth.getMe().subscribe({
      next: (d: any) => {
        const nageurId = d?.roleData?._id;
        if (!nageurId) { this.aiMyLoading = false; return; }
        // Fetch performance analysis
        this.api.aiAnalyzePerformance(nageurId).subscribe({
          next: (analysis: any) => { this.aiMyAnalysis = analysis; },
          error: () => {}
        });
        // Fetch time prediction
        this.api.aiPredictTime(nageurId).subscribe({
          next: (pred: any) => { this.aiMyPrediction = pred; this.aiMyLoading = false; },
          error: () => { this.aiMyLoading = false; }
        });
      },
      error: () => { this.aiMyLoading = false; }
    });
  }

  getAcwrStatus(acwr: number): { label: string; color: string; icon: string } {
    if (acwr <= 0) return { label: 'Pas de données', color: '#86a6c4', icon: '—' };
    if (acwr < 0.8) return { label: 'Sous-entraîné', color: '#3b82f6', icon: '↓' };
    if (acwr <= 1.3) return { label: 'Zone Optimale', color: '#22c55e', icon: '✓' };
    if (acwr <= 1.5) return { label: 'Attention', color: '#f59e0b', icon: '⚠' };
    return { label: 'Danger', color: '#ef4444', icon: '🔴' };
  }

  getTrendLabel(slope: number): string {
    if (slope < -0.5) return 'En forte progression ↗';
    if (slope < -0.1) return 'En progression ↗';
    if (slope < 0.1) return 'Stable →';
    if (slope < 0.5) return 'En régression ↘';
    return 'En forte régression ↘';
  }

  getTrendColor(slope: number): string {
    if (slope < -0.1) return '#22c55e';
    if (slope < 0.1) return '#f59e0b';
    return '#ef4444';
  }

  /* ── Form actions ── */
  openTrainingModal() { this.trainingForm = { titre: '', date: '', heure: '', duree: 60, nageurs: [], notes: '' }; this.showTrainingModal = true; }
  openCompetitionModal() { this.competitionForm = { nom: '', date: '', lieu: '', niveauRequis: 'Junior', nageurs: [] }; this.showCompetitionModal = true; }
  openFeedbackModal(nageurId?: string) { this.feedbackForm = { nageurId: nageurId || '', rating: 0, comment: '', type: 'general' }; this.showFeedbackModal = true; }

  closeModals() { this.showTrainingModal = false; this.showCompetitionModal = false; this.showFeedbackModal = false; }

  submitTraining() {
    if (!this.trainingForm.titre || !this.trainingForm.date || !this.trainingForm.heure) {
      return;
    }

    this.formSubmitting = true;
    const payload = this.buildTrainingPayload();
    this.api.createEntrainement(payload).subscribe({
      next: () => {
        this.formSubmitting = false;
        this.showTrainingModal = false;
        this.loadData();
      },
      error: () => { this.formSubmitting = false; }
    });
  }

  private buildTrainingPayload() {
    const heureDebut = this.trainingForm.heure || '08:00';
    const duree = Number(this.trainingForm.duree || 60);
    const heureFin = this.addMinutes(heureDebut, duree);

    return {
      titre: this.trainingForm.titre,
      date: this.trainingForm.date,
      heureDebut,
      heureFin,
      duree,
      type: 'Endurance',
      intensite: 'Modérée',
      lieu: 'Piscine principale',
      description: this.trainingForm.notes || '',
      statut: 'Planifié',
      nageurs: Array.isArray(this.trainingForm.nageurs) ? this.trainingForm.nageurs : []
    };
  }

  private addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map((v) => Number(v));
    if (Number.isNaN(h) || Number.isNaN(m)) {
      return time;
    }
    const total = (h * 60 + m + minutes) % (24 * 60);
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
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