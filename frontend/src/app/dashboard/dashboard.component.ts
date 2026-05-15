
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
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

  // Rankings
  rankingWeekly: any = null;
  rankingMonthly: any = null;
  rankingYearly: any = null;
  rankingLoading = false;
  rankingError = '';

  /* ── Admin ── */
  stats: any = { nageurs: 0, entraineurs: 0, competitions: 0, entrainements: 0, users: 0 };
  nageurs: any[] = [];
  entraineurs: any[] = [];
  pendingRegistrations: any[] = [];
  upcomingCompetitions: any[] = [];
  recentUsers: any[] = [];
  aiEvaluationSummary: any = null;
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
  aiUrgentSwimmer: any = null;
  aiCoachSelectedId = '';
  aiCoachLoading = false;
  aiCoachError = '';
  aiCoachFatigue: any = null;
  aiCoachPlan: any = null;
  aiCoachExplain: any = null;

  /* ── Admin Strategic Center ── */
  adminAlerts: Array<{
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    icon: string;
    timestamp: string;
    explanation: string;
  }> = [];
  adminRecommendations: Array<{
    title: string;
    description: string;
    explanation: string;
    confidence: number;
    secondaryAction: string;
  }> = [];
  adminSummary: {
    attendance: string;
    bestGroup: string;
    weakestProgression: string;
    fatigueIndicators: string;
    readinessScore: number;
  } | null = null;
  adminCoachAnalytics: Array<{
    name: string;
    attendanceImpact: number;
    progression: number;
    consistency: number;
    efficiency: number;
    workloadBalance: number;
  }> = [];

  showRecommendationModal = false;
  selectedRecommendation: {
    title: string;
    description: string;
    explanation: string;
    confidence: number;
    secondaryAction: string;
  } | null = null;

  /* AI Brain - Swimmer individual */
  aiMyAnalysis: any = null;
  aiMyPrediction: any = null;
  aiMyLoading = false;

  /* AI MVP Ranking */
  aiMvpWeekly: any = null;
  aiMvpMonthly: any = null;
  aiMvpLoading = false;

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
    this.api.getStats().subscribe({
      next: d => {
        this.stats = d;
        this.recentUsers = d.recentUsers || [];
        this.buildAdminStrategicCenter();
      },
      error: () => {}
    });
    this.api.getLatestIdssEvaluation().subscribe({ next: d => { this.aiEvaluationSummary = d; }, error: () => {} });
    this.api.getPendingRegistrations().subscribe({ next: d => { this.pendingRegistrations = Array.isArray(d) ? d : []; }, error: () => {} });
    this.api.getAllNageurs().subscribe({
      next: d => {
        this.nageurs = Array.isArray(d) ? d : [];
        this.buildAdminStrategicCenter();
      },
      error: () => {}
    });
    this.api.getAllEntraineurs().subscribe({
      next: d => {
        this.entraineurs = Array.isArray(d) ? d : [];
        this.buildAdminStrategicCenter();
      },
      error: () => {}
    });
    this.api.getAllCompetitions().subscribe({ next: d => { this.upcomingCompetitions = Array.isArray(d) ? d.slice(0, 5) : []; }, error: () => {} });
    this.api.getPendingDemandesCount().subscribe({
      next: d => {
        this.pendingDemandes = d.count;
        this.buildAdminStrategicCenter();
      },
      error: () => {}
    });
    this.loadIdssSummary();
    this.loadAiBrainDashboard();
    this.loadAiMvpRanking();

    // Rankings
    this.rankingLoading = true;
    this.api.getLatestRanking('weekly').subscribe({
      next: d => { this.rankingWeekly = d; },
      error: () => { this.rankingError = 'Erreur chargement classement hebdo.'; }
    });
    this.api.getLatestRanking('monthly').subscribe({
      next: d => { this.rankingMonthly = d; },
      error: () => { this.rankingError = 'Erreur chargement classement mensuel.'; }
    });
    this.api.getLatestRanking('yearly').subscribe({
      next: d => { this.rankingYearly = d; },
      error: () => { this.rankingError = 'Erreur chargement classement annuel.'; }
    });
    this.rankingLoading = false;
  }

  loadCoachData() {
    this.api.getAllNageurs().subscribe({
      next: d => {
        const raw = Array.isArray(d) ? d : [];
        this.nageurs = this.filterCoachSwimmers(raw);
        this.computeCoachStaticCards();
      },
      error: () => {}
    });
    this.api.getAllEntraineurs().subscribe({ next: d => { this.entraineurs = Array.isArray(d) ? d : []; }, error: () => {} });
    this.api.getAllCompetitions().subscribe({ next: d => { this.upcomingCompetitions = Array.isArray(d) ? d : []; }, error: () => {} });
    this.api.getPendingDemandesCount().subscribe({ next: d => { this.pendingDemandes = d.count; }, error: () => {} });
    this.loadIdssSummary();
    this.loadAiBrainDashboard();
    this.loadAiMvpRanking();
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
    // Load real performance trends for SVG chart
    this.loadSwimmerPerformanceTrends();
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
  private filterCoachSwimmers(list: any[]): any[] {
    if (!this.isEntraineur) return list;
    const allowed = new Set(this.auth.getCoachSwimmerIds());
    if (!allowed.size) return list;
    return list.filter((n: any) => allowed.has(String(n?._id || n?.id || n)));
  }
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
        const decisions = d?.decisions || d?.swimmers || d?.results || [];
        const swimmers = decisions.map((s: any) => this.normalizeAiDecision(s));
        this.aiBrainSwimmers = swimmers;
        if (!swimmers.length) {
          this.aiCoachSelectedId = '';
          this.aiCoachFatigue = null;
          this.aiCoachPlan = null;
          this.aiCoachExplain = null;
        }
        this.aiBrainAtRisk = swimmers
          .filter((s: any) => s.fatigue_level === 'HIGH' || s.fatigue_level === 'CRITICAL')
          .sort((a: any, b: any) => this.severityRank(b.fatigue_level) - this.severityRank(a.fatigue_level)
            || (b.fatigue_score || 0) - (a.fatigue_score || 0));
        this.aiBrainHealthy = swimmers.filter((s: any) => s.fatigue_level === 'LOW');
        this.aiUrgentSwimmer = this.aiBrainAtRisk[0] || null;

        const total = swimmers.length;
        const atRisk = this.aiBrainAtRisk.length;
        const acwrVals = swimmers.map((s: any) => Number(s.acwr || 0)).filter((v: number) => v > 0);
        const avgAcwr = acwrVals.length ? +(acwrVals.reduce((a: number, b: number) => a + b, 0) / acwrVals.length).toFixed(2) : 0;
        const highFatigue = swimmers.filter((s: any) => (s.fatigue_score || 0) >= 60).length;
        this.aiBrainStats = { total, atRisk, avgAcwr, highFatigue };
        this.updateAdminPerformanceChart(swimmers);
        this.ensureCoachSelection();
        this.buildAdminStrategicCenter();
        this.aiBrainLoading = false;
      },
      error: () => {
        this.aiBrainOnline = false;
        this.aiBrainLoading = false;
        this.aiBrainDashboard = null;
        this.aiBrainSwimmers = [];
        this.aiBrainAtRisk = [];
        this.aiBrainHealthy = [];
        this.aiUrgentSwimmer = null;
        this.aiBrainStats = { total: 0, atRisk: 0, avgAcwr: 0, highFatigue: 0 };
        this.aiCoachSelectedId = '';
        this.aiCoachFatigue = null;
        this.aiCoachPlan = null;
        this.aiCoachExplain = null;
        this.buildAdminStrategicCenter();
      }
    });
  }

  private buildAdminStrategicCenter() {
    if (!this.isAdmin) return;

    const totalSwimmers = this.stats?.nageurs || this.nageurs.length || 0;
    const totalCoaches = this.stats?.entraineurs || this.entraineurs.length || 0;
    const atRisk = this.aiBrainAtRisk.length || 0;
    const highFatigue = this.aiBrainStats.highFatigue || 0;
    const avgAcwr = this.aiBrainStats.avgAcwr || 0;
    const coachRatio = totalCoaches ? totalSwimmers / totalCoaches : 0;
    const readinessScore = Math.max(0, Math.min(100, Math.round(100 - (atRisk * 6 + highFatigue * 3 + Math.max(0, avgAcwr - 1.3) * 20))));

    this.adminAlerts = this.buildAdminAlerts({
      totalSwimmers,
      totalCoaches,
      atRisk,
      highFatigue,
      avgAcwr,
      coachRatio
    });

    this.adminRecommendations = this.buildAdminRecommendations({
      atRisk,
      highFatigue,
      coachRatio,
      readinessScore
    });

    this.adminSummary = this.buildAdminSummary({
      readinessScore,
      totalSwimmers,
      atRisk,
      avgAcwr,
      highFatigue
    });

    this.adminCoachAnalytics = this.buildAdminCoachAnalytics({
      totalCoaches,
      totalSwimmers,
      atRisk
    });
  }

  private buildAdminAlerts(meta: {
    totalSwimmers: number;
    totalCoaches: number;
    atRisk: number;
    highFatigue: number;
    avgAcwr: number;
    coachRatio: number;
  }) {
    const time = this.formatTimestamp();
    const absenceSeverity = meta.totalSwimmers > 0 && this.pendingDemandes > 3 ? 'medium' : 'low';
    const fatigueSeverity = meta.highFatigue >= 3 ? 'high' : meta.highFatigue > 0 ? 'medium' : 'low';
    const injurySeverity = meta.atRisk >= 4 ? 'critical' : meta.atRisk >= 2 ? 'high' : meta.atRisk ? 'medium' : 'low';
    const coachSeverity = meta.coachRatio >= 14 ? 'high' : meta.coachRatio >= 10 ? 'medium' : 'low';
    const performanceSeverity = meta.avgAcwr >= 1.45 ? 'high' : meta.avgAcwr >= 1.3 ? 'medium' : 'low';
    const readinessSeverity = meta.atRisk >= 3 ? 'high' : meta.atRisk ? 'medium' : 'low';

    return [
      {
        title: 'Swimmer absence anomalies',
        severity: absenceSeverity as any,
        icon: 'calendar',
        timestamp: time,
        explanation: this.pendingDemandes > 0
          ? `${this.pendingDemandes} account requests pending. Potential attendance irregularities flagged.`
          : 'No abnormal absence clusters detected in the last cycle.'
      },
      {
        title: 'Fatigue group detection',
        severity: fatigueSeverity as any,
        icon: 'pulse',
        timestamp: time,
        explanation: meta.highFatigue
          ? `${meta.highFatigue} swimmers above fatigue threshold. Group recovery window suggested.`
          : 'Fatigue indicators remain within controlled band.'
      },
      {
        title: 'Injury risk clusters',
        severity: injurySeverity as any,
        icon: 'shield',
        timestamp: time,
        explanation: meta.atRisk
          ? `${meta.atRisk} at-risk profiles detected. Prioritize monitoring & load reduction.`
          : 'No injury risk clusters detected in current cohort.'
      },
      {
        title: 'Coach overload',
        severity: coachSeverity as any,
        icon: 'users',
        timestamp: time,
        explanation: meta.totalCoaches
          ? `Coach-to-swimmer ratio: ${meta.coachRatio.toFixed(1)}. Rebalance if workload persists.`
          : 'No active coach allocation data detected.'
      },
      {
        title: 'Declining group performance',
        severity: performanceSeverity as any,
        icon: 'trend',
        timestamp: time,
        explanation: meta.avgAcwr
          ? `Global ACWR ${meta.avgAcwr}. Monitoring performance drift across groups.`
          : 'Performance drift stable with no negative trend.'
      },
      {
        title: 'Competition readiness warnings',
        severity: readinessSeverity as any,
        icon: 'trophy',
        timestamp: time,
        explanation: this.upcomingCompetitions.length
          ? `${this.upcomingCompetitions.length} competitions upcoming. Readiness score under review.`
          : 'Competition calendar clear. Readiness steady.'
      }
    ];
  }

  private buildAdminRecommendations(meta: { atRisk: number; highFatigue: number; coachRatio: number; readinessScore: number; }) {
    const recs = [
      {
        title: 'Reduce training intensity for juniors',
        description: 'Adjust junior workload to stabilize fatigue scores and improve recovery.',
        explanation: 'Fatigue volatility in junior groups suggests a taper window to protect progression without impacting attendance.'
      },
      {
        title: 'Add recovery sessions',
        description: 'Introduce 2 recovery blocks this week for high-fatigue swimmers.',
        explanation: 'Clustered fatigue above 60% indicates recovery gaps that can be resolved with low-intensity sessions.'
      },
      {
        title: 'Reorganize coach assignments',
        description: 'Shift 1 senior coach to the high-volume group to balance workload.',
        explanation: 'Coach-to-swimmer ratio is trending high for the main group, risking decision latency and inconsistent feedback.'
      },
      {
        title: 'Increase sprint training volume',
        description: 'Apply targeted sprint sessions for top-performing groups.',
        explanation: 'Top performers show stable readiness, allowing for targeted intensity spikes without elevating injury risk.'
      },
      {
        title: 'Schedule regional competitions',
        description: 'Leverage readiness momentum to lock regional competitive exposure.',
        explanation: 'Readiness and progression signals support exposure planning for the next 4-6 weeks.'
      },
      {
        title: 'Optimize pool schedules',
        description: 'Reduce peak-hour congestion and protect recovery windows.',
        explanation: 'Session congestion is compressing recovery cycles; shifting pool schedules improves overall readiness.'
      }
    ];

    const confidenceBase = Math.max(62, Math.min(94, meta.readinessScore));
    return recs.map((r, i) => ({
      ...r,
      confidence: Math.max(55, Math.min(95, Math.round(confidenceBase - i * 3 + (meta.highFatigue * 2)))) ,
      secondaryAction: 'View'
    }));
  }

  openRecommendation(rec: { title: string; description: string; explanation: string; confidence: number; secondaryAction: string; }) {
    this.selectedRecommendation = rec;
    this.showRecommendationModal = true;
  }

  closeRecommendation() {
    this.showRecommendationModal = false;
    this.selectedRecommendation = null;
  }

  private buildAdminSummary(meta: { readinessScore: number; totalSwimmers: number; atRisk: number; avgAcwr: number; highFatigue: number; }) {
    const attendance = meta.totalSwimmers
      ? `${Math.max(82, 96 - meta.atRisk * 2)}% stable`
      : 'No data';
    const bestGroup = meta.readinessScore > 78 ? 'Elite / Performance' : 'Junior Development';
    const weakestProgression = meta.highFatigue > 2 ? 'Endurance group' : 'Sprint group';
    const fatigueIndicators = meta.highFatigue
      ? `${meta.highFatigue} clusters above 60%`
      : 'Low fatigue volatility';
    return {
      attendance,
      bestGroup,
      weakestProgression,
      fatigueIndicators,
      readinessScore: meta.readinessScore
    };
  }

  private buildAdminCoachAnalytics(meta: { totalCoaches: number; totalSwimmers: number; atRisk: number; }) {
    const list = (this.entraineurs || []).slice(0, 4);
    if (!list.length) return [];

    const baseWorkload = meta.totalCoaches ? Math.max(55, Math.min(88, Math.round((meta.totalSwimmers / meta.totalCoaches) * 6))) : 60;

    return list.map((c, i) => ({
      name: this.fullName(c),
      attendanceImpact: Math.max(60, 90 - i * 6),
      progression: Math.max(58, 88 - meta.atRisk * 2 - i * 4),
      consistency: Math.max(55, 86 - i * 5),
      efficiency: Math.max(60, 92 - i * 7),
      workloadBalance: Math.max(48, baseWorkload - i * 4)
    }));
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  private ensureCoachSelection() {
    if (!this.isAdmin && !this.isEntraineur) return;
    if (this.aiCoachSelectedId) return;
    const urgentId = this.aiUrgentSwimmer?.swimmer_id;
    if (urgentId) {
      this.aiCoachSelectedId = urgentId;
      this.loadCoachSwimmerAnalysis(urgentId);
      return;
    }
    const fallback = this.aiBrainSwimmers?.[0]?.swimmer_id;
    if (fallback) {
      this.aiCoachSelectedId = fallback;
      this.loadCoachSwimmerAnalysis(fallback);
    }
  }

  onCoachSwimmerChange(id: string) {
    if (!id) return;
    this.aiCoachSelectedId = id;
    this.loadCoachSwimmerAnalysis(id);
  }

  loadCoachSwimmerAnalysis(swimmerId: string) {
    this.aiCoachLoading = true;
    this.aiCoachError = '';
    forkJoin({
      fatigue: this.api.aiFatigueDetection([swimmerId]),
      plan: this.api.aiPlan(swimmerId, 4),
      explain: this.api.aiExplain('fatigue', swimmerId)
    }).subscribe({
      next: ({ fatigue, plan, explain }) => {
        this.aiCoachFatigue = this.normalizeAiDecision(fatigue);
        this.aiCoachPlan = plan;
        this.aiCoachExplain = explain;
        this.aiCoachLoading = false;
      },
      error: () => {
        this.aiCoachError = 'Impossible de charger l analyse IA.';
        this.aiCoachLoading = false;
      }
    });
  }

  private updateAdminPerformanceChart(swimmers: any[]) {
    if (!this.isAdmin || !swimmers?.length) return;
    const sample = swimmers.slice(0, 5);
    this.chartMonths = sample.map((s: any, i: number) => s?.name?.split(' ')?.[0] || `AI-${i + 1}`);
    this.chartPerf = sample.map((s: any) => Math.max(0, 100 - (s.fatigue_score || 0)));
    this.chartAtt = sample.map((s: any) => Math.min(100, s.fatigue_score || 0));
  }

  /* ── AI MVP Ranking ── */
  loadAiMvpRanking() {
    this.aiMvpLoading = true;
    this.api.aiMvpRanking('weekly').subscribe({
      next: (d: any) => { this.aiMvpWeekly = d; this.aiMvpLoading = false; },
      error: () => { this.aiMvpLoading = false; }
    });
    this.api.aiMvpRanking('monthly').subscribe({
      next: (d: any) => { this.aiMvpMonthly = d; },
      error: () => {}
    });
  }

  /* ── Swimmer Performance Trends (real AI data for SVG chart) ── */
  chartLabels: string[] = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai'];

  loadSwimmerPerformanceTrends() {
    let limit = 12;
    if (this.selectedPeriod === 'trimestre') limit = 12;
    else if (this.selectedPeriod === 'semestre') limit = 24;
    else if (this.selectedPeriod === 'annee') limit = 48;

    this.auth.getMe().subscribe({
      next: (u: any) => {
        const nageurId = u?.roleData?._id;
        if (!nageurId) return;

        this.api.getIdssHistory(nageurId, limit).subscribe({
          next: (history: any[]) => {
            if (!history || !history.length) return;
            const chronological = history.slice().reverse();
            
            // Generate labels from dates
            this.chartLabels = chronological.map(h => {
              const d = new Date(h.performance?.date || h.createdAt);
              return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
            });

            // Performance Growth: Cumulative calculation based on intensity and lack of fatigue
            let currentGrowth = 40; // start at 40% baseline
            const perfValues = chronological.map(h => {
              const intensity = h.performance?.intensity || 5;
              const fatigue = h.fatigueScore || 50; 
              // Good session: high intensity but reasonable fatigue
              const sessionImpact = (intensity * 1.5) - (fatigue * 0.15) - 2; // minor natural decay
              currentGrowth = Math.min(100, Math.max(10, currentGrowth + sessionImpact));
              return Math.round(currentGrowth);
            });

            // Attendance/Load: Using ACWR or intensity scaled to 100
            const attValues = chronological.map(h => {
              const acwr = h.inputSnapshot?.acwr || 1.0;
              return Math.min(100, Math.max(0, acwr * 60)); // 1.0 -> 60%, 1.5 -> 90%
            });

            this.perfPts = this.buildSvgPoints(perfValues, 100);
            this.attPts = this.buildSvgPoints(attValues, 100);
          },
          error: () => {}
        });
      },
      error: () => {}
    });
  }

  private buildSvgPoints(values: number[], overrideMax?: number): string {
    if (!values.length) return '';
    const maxVal = overrideMax || Math.max(...values, 1);
    const width = 660; // 700 - 40
    const height = 150; // 190 - 40
    const step = width / Math.max(values.length - 1, 1);
    return values.map((v, i) => {
      const x = 40 + i * step;
      const y = 190 - (v / maxVal) * height;
      return `${Math.round(x)},${Math.round(y)}`;
    }).join(' ');
  }

  loadAiMyAnalysis() {
    if (!this.currentUser?.id) return;
    this.aiMyLoading = true;
    this.auth.getMe().subscribe({
      next: (d: any) => {
        const nageurId = d?.roleData?._id;
        if (!nageurId) { this.aiMyLoading = false; return; }

        forkJoin({
          fatigue: this.api.aiFatigueDetection([nageurId]),
          analysis: this.api.aiAnalyzePerformance(nageurId),
          prediction: this.api.aiPredictTime(nageurId)
        }).subscribe({
          next: ({ fatigue, analysis, prediction }) => {
            const normalized = this.normalizeAiDecision(fatigue);
            const slope = analysis?.slope_per_session_sec ?? 0;
            this.aiMyAnalysis = {
              ...normalized,
              metrics: {
                acwr: normalized.acwr,
                recent_workload: normalized.total_load_7d_km,
                chronic_workload: normalized.total_load_28d_km || 0,
                sleep_quality: null,
                stress_level: null,
                performance_trend: slope
              }
            };
            this.aiMyPrediction = this.normalizeAiPrediction(prediction);
            this.aiMyLoading = false;
          },
          error: () => { this.aiMyLoading = false; }
        });
      },
      error: () => { this.aiMyLoading = false; }
    });
  }

  private normalizeAiDecision(decision: any): any {
    if (!decision) return decision;
    return {
      ...decision,
      swimmer_id: decision.swimmer_id || decision.swimmerId || decision.nageur_id || decision.nageurId,
      fatigue_level: decision.fatigue_level || decision.fatigueLevel,
      fatigue_score: decision.fatigue_score ?? decision.fatigueScore ?? 0,
      total_load_7d_km: decision.total_load_7d_km ?? decision.total_load_7d ?? 0,
      total_load_28d_km: decision.total_load_28d_km ?? decision.total_load_28d ?? 0,
      acwr: decision.acwr ?? 0
    };
  }

  private normalizeAiPrediction(prediction: any): any {
    if (!prediction) return prediction;
    const predictedTime = prediction.predicted_time ?? prediction.predicted_time_sec ?? null;
    if (predictedTime == null) return null;
    return { ...prediction, predicted_time: predictedTime };
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

  private severityRank(level: string): number {
    switch (level) {
      case 'CRITICAL': return 3;
      case 'HIGH': return 2;
      case 'MEDIUM': return 1;
      default: return 0;
    }
  }

  getSwimmerAdvice(level: string | undefined): string {
    switch (level) {
      case 'CRITICAL':
        return 'Repos total 48h. Prioriser le sommeil, hydratation et recuperation active douce.';
      case 'HIGH':
        return 'Reduire l intensite aujourd hui. Dormir 8h+, bien s hydrater, et etirer 10-15 min.';
      case 'MEDIUM':
        return 'Stabiliser la charge. Dors mieux, hydratation reguliere, et nutrition complete.';
      case 'LOW':
        return 'Bonne forme. Maintiens sommeil, hydratation, et une recuperation legere.';
      default:
        return 'Suivi en cours. Concentre toi sur le sommeil, hydratation et recuperation.';
    }
  }

  getAiEstimatePercent(n: any): number | null {
    const swimmerId = String(n?._id || n?.id || n?.utilisateur?._id || n?.utilisateur?.id || '');
    if (!swimmerId) return null;
    const aiSwimmer = this.aiBrainSwimmers.find(s => String(s?.swimmer_id || s?.swimmerId || '') === swimmerId);
    if (!aiSwimmer) return null;
    const fatigue = Number(aiSwimmer.fatigue_score || 0);
    const estimate = Math.round(Math.max(0, Math.min(100, 100 - fatigue)));
    return Number.isFinite(estimate) ? estimate : null;
  }

  getAiEstimateLabel(n: any): string {
    const value = this.getAiEstimatePercent(n);
    return value === null ? 'N/A' : `${value}%`;
  }

  getAiEstimateClass(value: number | null): string {
    if (value === null) return 'amber';
    if (value >= 75) return 'green';
    if (value >= 45) return 'amber';
    return 'red';
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

  get coachSwimmerRatioLabel(): string {
    if (!this.entraineurs.length) return '—';
    return Math.round(this.nageurs.length / this.entraineurs.length).toString();
  }

  get teamStatusLabel(): string {
    return this.stats?.teamStatus?.label || '—';
  }

  get teamStatusClass(): string {
    return this.stats?.teamStatus?.level || 'neutral';
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