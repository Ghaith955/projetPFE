import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { TrainingResult, TrainingType, CoachFeedback, AttendanceStatus } from '../models/training-result.model';

@Component({
  selector: 'app-my-performance',
  templateUrl: './my-performance.component.html',
  styleUrls: ['./my-performance.component.css']
})
export class MyPerformanceComponent implements OnInit {
  results: TrainingResult[] = [];
  totalDistance = 0;
  avgIntensity = 0;
  attendanceRate = 0;

  constructor(
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.loadResults();
  }

  loadResults(): void {
    this.api.getAllPerformances({ type: 'Entrainement' }).subscribe({
      next: data => {
        const items = Array.isArray(data) ? data : [];
        this.results = items.map(item => this.mapPerformance(item))
          .sort((a, b) => b.date.localeCompare(a.date));
        this.computeStats();
      },
      error: () => {
        this.results = [];
        this.computeStats();
      }
    });
  }

  private computeStats(): void {
    if (!this.results.length) {
      this.totalDistance = 0;
      this.avgIntensity = 0;
      this.attendanceRate = 0;
      return;
    }

    const totalDistance = this.results.reduce((sum, r) => sum + (r.distance || 0), 0);
    const totalIntensity = this.results.reduce((sum, r) => sum + (r.intensity || 0), 0);
    const attendance = this.results.filter(r => r.attendance === 'present').length;

    this.totalDistance = totalDistance;
    this.avgIntensity = +(totalIntensity / this.results.length).toFixed(1);
    this.attendanceRate = Math.round((attendance / this.results.length) * 100);
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
      swimmerName: name,
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
}
