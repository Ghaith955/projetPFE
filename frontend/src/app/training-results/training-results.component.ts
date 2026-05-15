import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TrainingType, CoachFeedback, AttendanceStatus } from '../models/training-result.model';

interface TrainingResultRow {
  swimmerId: string;
  swimmerName: string;
  date: string;
  type: TrainingType;
  duration: number | null;
  distance: number | null;
  intensity: number | null;
  performanceTime: string;
  note: string;
  feedback: CoachFeedback;
  attendance: AttendanceStatus;
}

@Component({
  selector: 'app-training-results',
  templateUrl: './training-results.component.html',
  styleUrls: ['./training-results.component.css']
})
export class TrainingResultsComponent implements OnInit {
  swimmers: any[] = [];
  sessions: any[] = [];
  selectedSessionId = '';
  selectedSession: any = null;
  sessionDate = '';
  viewMode: 'single' | 'multi' = 'multi';

  successMessage = '';
  errorMessage = '';
  isSubmitting = false;
  aiLoading = false;
  aiError = '';
  aiFatigueSummary: { total: number; atRisk: number; avgAcwr: number } | null = null;
  aiRecommendation: any = null;
  aiPrediction: any = null;
  aiExplanation: any = null;

  trainingTypes = [
    { value: 'endurance' as TrainingType, label: 'Endurance' },
    { value: 'sprint' as TrainingType, label: 'Sprint' },
    { value: 'technique' as TrainingType, label: 'Technique' }
  ];

  feedbackOptions = [
    { value: 'good' as CoachFeedback, label: 'Bon' },
    { value: 'average' as CoachFeedback, label: 'Moyen' },
    { value: 'poor' as CoachFeedback, label: 'Faible' }
  ];

  attendanceOptions = [
    { value: 'present' as AttendanceStatus, label: 'Present' },
    { value: 'absent' as AttendanceStatus, label: 'Absent' }
  ];

  singleForm = {
    swimmerId: '',
    date: this.todayIso(),
    type: 'endurance' as TrainingType,
    duration: 60,
    distance: 2000,
    intensity: 6,
    performanceTime: '',
    note: '',
    feedback: 'good' as CoachFeedback,
    attendance: 'present' as AttendanceStatus
  };

  tableRows: TrainingResultRow[] = [];

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadSwimmers();
    this.loadSessions();
    this.loadAiInsights();
  }

  loadAiInsights(): void {
    this.aiLoading = true;
    this.aiError = '';

    const dashboard$ = this.api.aiDashboard().pipe(
      catchError((err) => {
        this.aiError = this.aiError || this.buildAiError(err);
        return of(null);
      })
    );
    const recommendation$ = this.api.aiRecommendSwimmers(undefined, undefined, undefined, undefined, 3).pipe(
      catchError((err) => {
        this.aiError = this.aiError || this.buildAiError(err);
        return of(null);
      })
    );
    const explanation$ = this.api.aiExplain('recommendation', undefined, { top_n: 3 }).pipe(
      catchError((err) => {
        this.aiError = this.aiError || this.buildAiError(err);
        return of(null);
      })
    );

    forkJoin({ dashboard: dashboard$, recommendation: recommendation$, explanation: explanation$ }).subscribe({
      next: ({ dashboard, recommendation, explanation }) => {
        const decisions = dashboard?.decisions || dashboard?.results || [];
        const atRisk = decisions.filter((s: any) => s.fatigue_level === 'HIGH' || s.fatigue_level === 'CRITICAL').length;
        const acwrVals = decisions.map((s: any) => Number(s.acwr || 0)).filter((v: number) => v > 0);
        const avgAcwr = acwrVals.length ? +(acwrVals.reduce((a: number, b: number) => a + b, 0) / acwrVals.length).toFixed(2) : 0;
        this.aiFatigueSummary = { total: decisions.length, atRisk, avgAcwr };
        this.aiRecommendation = recommendation || null;
        this.aiExplanation = explanation || null;

        const ranked = Array.isArray(recommendation?.ranked_swimmers) ? recommendation.ranked_swimmers : [];
        const topSwimmerId = ranked[0]?.swimmer_id;
        if (!topSwimmerId) {
          this.aiPrediction = null;
          this.aiLoading = false;
          return;
        }

        this.api.aiPredictTime(topSwimmerId).pipe(
          catchError((err) => {
            this.aiError = this.aiError || this.buildAiError(err);
            return of(null);
          })
        ).subscribe((prediction) => {
          this.aiPrediction = prediction ? this.normalizeAiPrediction(prediction) : null;
          this.aiLoading = false;
        });
      },
      error: (err) => {
        this.aiError = this.buildAiError(err);
        this.aiLoading = false;
      }
    });
  }

  private buildAiError(err: any): string {
    const status = err?.status;
    const message = err?.error?.detail || err?.error?.message || err?.message || '';
    if (status === 502 || status === 503 || status === 504) {
      return 'Service IA indisponible. Verifiez que le service Python tourne.';
    }
    if (message?.includes('timeout')) {
      return 'Timeout IA — requete trop lente. Reessayez dans quelques secondes.';
    }
    return message ? `Erreur IA: ${message}` : 'Impossible de charger les insights IA.';
  }

  setView(mode: 'single' | 'multi'): void {
    this.viewMode = mode;
  }

  loadSwimmers(): void {
    this.api.getAllNageurs().subscribe({
      next: data => {
        const raw = Array.isArray(data) ? data : [];
        this.swimmers = this.filterCoachSwimmers(raw);
        this.buildRows();
      },
      error: () => {
        this.swimmers = [];
        this.buildRows();
      }
    });
  }

  loadSessions(): void {
    this.api.getAllEntrainements().subscribe({
      next: data => { this.sessions = Array.isArray(data) ? data : []; },
      error: () => { this.sessions = []; }
    });
  }

  onSessionChange(): void {
    const match = this.sessions.find(s => (s._id || s.id) === this.selectedSessionId);
    this.selectedSession = match || null;
    if (!match) return;
    this.sessionDate = this.extractDate(match?.date);
    const mappedType = this.mapSessionType(match?.type || match?.titre);
    if (this.sessionDate) this.singleForm.date = this.sessionDate;
    if (mappedType) this.singleForm.type = mappedType;
    this.applySessionToRows();
  }

  applySessionToRows(): void {
    if (!this.sessionDate && !this.selectedSession) return;
    const mappedType = this.mapSessionType(this.selectedSession?.type || this.selectedSession?.titre);
    this.tableRows = this.tableRows.map(row => ({
      ...row,
      date: this.sessionDate || row.date,
      type: mappedType || row.type
    }));
  }

  submitSingle(formRef: any): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (formRef.invalid || !this.isSingleValid()) {
      this.errorMessage = 'Veuillez remplir les champs obligatoires.';
      return;
    }

    this.isSubmitting = true;
    const payload = this.buildPayload(this.singleForm);
    this.api.createTrainingResult(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Resultat enregistre avec succes.';
        this.resetSingleForm();
        this.clearMessages();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || 'Erreur lors de l enregistrement.';
        this.clearMessages();
      }
    });
  }

  submitBatch(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const invalidRows = this.tableRows.filter(row => !this.isRowValid(row));
    if (invalidRows.length > 0) {
      this.errorMessage = 'Chaque ligne doit etre completee avant envoi.';
      return;
    }

    this.isSubmitting = true;
    const payloads = this.tableRows.map(row => this.buildPayload(row));
    forkJoin(payloads.map(payload => this.api.createTrainingResult(payload))).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Resultats enregistres avec succes.';
        this.clearMessages();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || 'Erreur lors de l enregistrement.';
        this.clearMessages();
      }
    });
  }

  trackRow(index: number, row: TrainingResultRow): string {
    return row.swimmerId || `${index}`;
  }

  private buildRows(): void {
    const date = this.singleForm.date || this.todayIso();
    this.tableRows = this.swimmers.map(swimmer => ({
      swimmerId: this.resolveNageurId(swimmer),
      swimmerName: this.fullName(swimmer),
      date,
      type: this.singleForm.type,
      duration: 60,
      distance: 2000,
      intensity: 6,
      performanceTime: '',
      note: '',
      feedback: 'good',
      attendance: 'present'
    }));
  }

  private buildPayload(payload: any): any {
    const attendance = payload.attendance as AttendanceStatus;
    const isAbsent = attendance === 'absent';
    const duration = isAbsent ? 0 : Number(payload.duration) || 0;
    const distance = isAbsent ? 0 : Number(payload.distance) || 0;
    const intensity = isAbsent ? 0 : Number(payload.intensity) || 0;
    const performanceTime = isAbsent ? '0:00' : this.resolveTime(payload.performanceTime, duration);

    return {
      nageur: payload.swimmerId,
      entrainement: this.selectedSession?._id || this.selectedSession?.id || undefined,
      epreuve: payload.type,
      temps: performanceTime,
      distance,
      notes: payload.note || '',
      coachComment: `feedback=${payload.feedback}; attendance=${attendance}`,
      trainingType: payload.type,
      duration,
      intensity,
      attendance,
      feedback: payload.feedback,
      sessionLoad: duration * intensity,
      fatigueLevel: intensity,
      date: payload.date
    };
  }

  private isSingleValid(): boolean {
    if (!this.singleForm.swimmerId || !this.singleForm.date || !this.singleForm.type) return false;
    if (!this.singleForm.feedback || !this.singleForm.attendance) return false;
    if (this.singleForm.attendance === 'absent') return true;
    return Number(this.singleForm.duration) > 0
      && Number(this.singleForm.distance) > 0
      && Number(this.singleForm.intensity) > 0;
  }

  private isRowValid(row: TrainingResultRow): boolean {
    if (!row.swimmerId || !row.date || !row.type) return false;
    if (!row.feedback || !row.attendance) return false;
    if (row.attendance === 'absent') return true;
    return Number(row.duration) > 0
      && Number(row.distance) > 0
      && Number(row.intensity) > 0;
  }

  private resetSingleForm(): void {
    this.singleForm = {
      swimmerId: '',
      date: this.todayIso(),
      type: this.singleForm.type,
      duration: 60,
      distance: 2000,
      intensity: 6,
      performanceTime: '',
      note: '',
      feedback: 'good',
      attendance: 'present'
    };
  }

  private clearMessages(): void {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 3000);
  }

  private todayIso(): string {
    return new Date().toISOString().substring(0, 10);
  }

  private extractDate(raw: string | undefined): string {
    if (!raw) return '';
    const date = new Date(raw);
    return isNaN(date.getTime()) ? '' : date.toISOString().substring(0, 10);
  }

  private mapSessionType(raw: string | undefined): TrainingType | null {
    if (!raw) return null;
    const value = raw.toLowerCase();
    if (value.includes('endurance')) return 'endurance';
    if (value.includes('vitesse') || value.includes('sprint')) return 'sprint';
    if (value.includes('technique')) return 'technique';
    return null;
  }

  private fullName(swimmer: any): string {
    const user = swimmer?.utilisateur || swimmer;
    return `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Nageur';
  }

  resolveNageurId(swimmer: any): string {
    return swimmer?._id || swimmer?.id || '';
  }

  private getSwimmerName(swimmerId: string): string {
    const swimmer = this.swimmers.find(s => this.resolveNageurId(s) === swimmerId);
    return swimmer ? this.fullName(swimmer) : 'Nageur';
  }

  private resolveTime(value: string, duration: number): string {
    const trimmed = (value || '').trim();
    if (trimmed) {
      const cleaned = trimmed.replace(/[^0-9:.,]/g, '');
      return cleaned || trimmed;
    }
    if (!duration) return '0:00';
    const minutes = Math.floor(duration);
    const seconds = '00';
    return `${minutes}:${seconds}`;
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
}
