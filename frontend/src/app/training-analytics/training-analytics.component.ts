import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { TrainingResult, TrainingType, CoachFeedback, AttendanceStatus } from '../models/training-result.model';

@Component({
  selector: 'app-training-analytics',
  templateUrl: './training-analytics.component.html',
  styleUrls: ['./training-analytics.component.css']
})
export class TrainingAnalyticsComponent implements OnInit {
  swimmers: any[] = [];
  results: TrainingResult[] = [];
  filtered: TrainingResult[] = [];

  filterStart = '';
  filterEnd = '';
  selectedSwimmerId = '';

  totalDistance = 0;
  avgIntensity = 0;
  attendanceRate = 0;
  aiLoading = false;
  aiError = '';
  aiFatigueSummary: { total: number; atRisk: number; avgAcwr: number } | null = null;
  aiRecommendation: any = null;
  aiPrediction: any = null;
  aiExplanation: any = null;
  rankingSnapshot: any = null;
  rankingEntries: any[] = [];

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.api.getAllNageurs().subscribe({
      next: data => {
        const raw = Array.isArray(data) ? data : [];
        this.swimmers = this.filterCoachSwimmers(raw);
      },
      error: () => { this.swimmers = []; }
    });

    this.loadResults();
    this.loadAiInsights();
  }

  loadAiInsights(): void {
    this.aiLoading = true;
    this.aiError = '';
    this.loadRankingCascade(['weekly', 'monthly', 'yearly']);
  }

  /** Try each period type in order until one returns entries */
  private loadRankingCascade(periods: string[]): void {
    if (!periods.length) {
      this.rankingSnapshot = null;
      this.rankingEntries = [];
      this.aiLoading = false;
      return;
    }

    const [current, ...remaining] = periods;
    this.api.getLatestRanking(current).subscribe({
      next: (snapshot: any) => {
        const entries = Array.isArray(snapshot?.entries) ? snapshot.entries : [];
        if (entries.length > 0) {
          this.rankingSnapshot = snapshot;
          this.rankingEntries = entries.slice(0, 10);
          this.aiLoading = false;
        } else {
          // No entries for this period, try the next one
          this.loadRankingCascade(remaining);
        }
      },
      error: () => {
        // If this period failed, try the next one before giving up
        if (remaining.length > 0) {
          this.loadRankingCascade(remaining);
        } else {
          this.aiError = 'Impossible de charger le classement IDSS.';
          this.aiLoading = false;
        }
      }
    });
  }

  loadResults(): void {
    this.api.getAllPerformances({ type: 'Entrainement' }).subscribe({
      next: data => {
        const items = Array.isArray(data) ? data : [];
        const mapped = items.map(item => this.mapPerformance(item));
        this.results = this.filterCoachResults(mapped);
        this.applyFilters();
      },
      error: () => {
        this.results = [];
        this.applyFilters();
      }
    });
  }

  applyFilters(): void {
    this.filtered = this.results.filter(r => {
      if (this.selectedSwimmerId && r.swimmerId !== this.selectedSwimmerId) return false;
      if (this.filterStart && r.date < this.filterStart) return false;
      if (this.filterEnd && r.date > this.filterEnd) return false;
      return true;
    });
    this.computeStats();
  }

  clearFilters(): void {
    this.filterStart = '';
    this.filterEnd = '';
    this.selectedSwimmerId = '';
    this.applyFilters();
  }

  private computeStats(): void {
    if (!this.filtered.length) {
      this.totalDistance = 0;
      this.avgIntensity = 0;
      this.attendanceRate = 0;
      return;
    }

    const totalDistance = this.filtered.reduce((sum, r) => sum + (r.distance || 0), 0);
    const totalIntensity = this.filtered.reduce((sum, r) => sum + (r.intensity || 0), 0);
    const attendance = this.filtered.filter(r => r.attendance === 'present').length;

    this.totalDistance = totalDistance;
    this.avgIntensity = +(totalIntensity / this.filtered.length).toFixed(1);
    this.attendanceRate = Math.round((attendance / this.filtered.length) * 100);
  }

  getSwimmerName(swimmerId: string): string {
    const swimmer = this.swimmers.find(s => this.resolveNageurId(s) === swimmerId);
    const user = swimmer?.utilisateur || swimmer;
    return `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Nageur';
  }

  resolveNageurId(swimmer: any): string {
    return swimmer?._id || swimmer?.id || '';
  }

  private mapPerformance(item: any): TrainingResult {
    const nageurId = item?.nageur?._id || item?.nageur || '';
    const name = item?.nageur?.utilisateur ? `${item.nageur.utilisateur?.prenom || ''} ${item.nageur.utilisateur?.nom || ''}`.trim() : '';
    const date = item?.date ? new Date(item.date).toISOString().substring(0, 10) : '';
    const trainingType = this.mapTrainingType(item?.trainingType || item?.epreuve || item?.style);
    return {
      id: item?._id,
      sessionId: item?.entrainement?._id || item?.entrainement,
      swimmerId: nageurId,
      swimmerName: name || this.getSwimmerName(nageurId),
      date,
      type: trainingType,
      duration: Number(item?.duration || 0),
      distance: Number(item?.distance || 0),
      intensity: Number(item?.intensity || item?.fatigueLevel || 0),
      performanceTime: item?.temps || '',
      note: item?.notes || '',
      feedback: (item?.feedback as CoachFeedback) || this.parseFeedback(item?.coachComment) || 'average',
      attendance: (item?.attendance as AttendanceStatus) || this.parseAttendance(item?.coachComment) || 'present',
      coachId: item?.addedBy?._id || item?.addedBy,
      createdAt: item?.createdAt
    };
  }

  private mapTrainingType(value: string | undefined): TrainingType {
    const raw = (value || '').toLowerCase();
    if (raw.includes('sprint') || raw.includes('vitesse')) return 'sprint';
    if (raw.includes('technique')) return 'technique';
    return 'endurance';
  }

  private parseFeedback(value: string | undefined): CoachFeedback | null {
    if (!value) return null;
    const match = value.match(/feedback\s*[:=]\s*(good|average|poor)/i);
    return match ? (match[1].toLowerCase() as CoachFeedback) : null;
  }

  private parseAttendance(value: string | undefined): AttendanceStatus | null {
    if (!value) return null;
    const match = value.match(/attendance\s*[:=]\s*(present|absent)/i);
    return match ? (match[1].toLowerCase() as AttendanceStatus) : null;
  }

  private normalizeAiPrediction(prediction: any): any {
    if (!prediction) return null;
    const predictedTime = prediction.predicted_time ?? prediction.predicted_time_sec ?? null;
    if (predictedTime == null) return null;
    return { ...prediction, predicted_time: predictedTime };
  }

  private filterCoachSwimmers(list: any[]): any[] {
    if (!this.auth.isCoach) return list;
    const allowed = new Set(this.auth.getCoachSwimmerIds());
    if (!allowed.size) return list;
    return list.filter((n: any) => allowed.has(String(this.resolveNageurId(n))));
  }

  private filterCoachResults(list: TrainingResult[]): TrainingResult[] {
    if (!this.auth.isCoach) return list;
    const allowed = new Set(this.auth.getCoachSwimmerIds());
    if (!allowed.size) return list;
    return list.filter((r) => allowed.has(String(r.swimmerId)));
  }
}
