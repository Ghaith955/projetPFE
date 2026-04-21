import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { forkJoin } from 'rxjs';
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
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.loadSwimmers();
    this.loadSessions();
  }

  setView(mode: 'single' | 'multi'): void {
    this.viewMode = mode;
  }

  loadSwimmers(): void {
    this.api.getAllNageurs().subscribe({
      next: data => {
        this.swimmers = Array.isArray(data) ? data : [];
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
}
