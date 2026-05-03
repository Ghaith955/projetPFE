import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-simulation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './simulation.component.html',
  styleUrls: ['./simulation.component.css']
})
export class SimulationComponent implements OnInit {
  nageurs: any[] = [];
  selectedSwimmerId = '';
  selectedSwimmer: any = null;

  /* ── Simulation Config ── */
  simWeeks = 4;
  simSessions = 4;
  simIntensity = 5;
  simLoadPerSession = 3;

  /* ── Results ── */
  simResult: any = null;
  simExplanation: any = null;
  simLoading = false;
  simError = '';

  /* ── Explainability ── */
  showExplanation = false;
  explainLoading = false;

  /* ── Current swimmer analysis ── */
  swimmerAnalysis: any = null;
  swimmerFatigue: any = null;
  analysisLoading = false;

  /* ── History ── */
  simHistory: any[] = [];

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.api.getAllNageurs().subscribe({
      next: (d: any) => { this.nageurs = Array.isArray(d) ? d : []; },
      error: () => {}
    });
  }

  /* ── Select Swimmer ── */
  onSwimmerSelect() {
    if (!this.selectedSwimmerId) {
      this.selectedSwimmer = null;
      this.swimmerAnalysis = null;
      this.swimmerFatigue = null;
      this.simResult = null;
      return;
    }
    this.selectedSwimmer = this.nageurs.find(n => n._id === this.selectedSwimmerId);
    this.loadSwimmerState();
  }

  loadSwimmerState() {
    this.analysisLoading = true;
    this.simResult = null;
    this.simExplanation = null;

    // Load current analysis + fatigue in parallel
    this.api.aiAnalyzePerformance(this.selectedSwimmerId).subscribe({
      next: (d: any) => {
        this.swimmerAnalysis = d;
        // Pre-fill sliders from current data
        if (d?.metrics) {
          this.simSessions = d.metrics.sessions_last7d || 4;
          this.simIntensity = Math.round(d.metrics.avg_training_intensity || 5);
        }
        this.analysisLoading = false;
      },
      error: () => { this.analysisLoading = false; }
    });

    this.api.aiFatigueDetection([this.selectedSwimmerId]).subscribe({
      next: (d: any) => {
        const results = d?.results || d?.swimmers || [];
        this.swimmerFatigue = results[0] || null;
      },
      error: () => {}
    });
  }

  /* ── Run Simulation ── */
  runSimulation() {
    if (!this.selectedSwimmerId) return;
    this.simLoading = true;
    this.simError = '';
    this.showExplanation = false;
    this.simExplanation = null;

    const changes = {
      sessions_per_week: this.simSessions,
      avg_intensity: this.simIntensity,
      avg_load_km_per_session: this.simLoadPerSession
    };

    this.api.aiSimulateScenario(this.selectedSwimmerId, this.simWeeks, changes).subscribe({
      next: (d: any) => {
        this.simResult = d;
        this.simLoading = false;
        // Add to history
        this.simHistory.unshift({
          timestamp: new Date(),
          swimmer: this.getSwimmerName(this.selectedSwimmer),
          weeks: this.simWeeks,
          changes,
          result: d
        });
        if (this.simHistory.length > 5) this.simHistory.pop();
      },
      error: (err: any) => {
        this.simError = err?.error?.detail || 'Erreur lors de la simulation';
        this.simLoading = false;
      }
    });
  }

  /* ── Get Explanation ── */
  loadExplanation() {
    if (!this.selectedSwimmerId) return;
    this.explainLoading = true;
    this.showExplanation = true;

    this.api.aiExplain('simulation', this.selectedSwimmerId, {
      simulation_weeks: this.simWeeks,
      changes: {
        sessions_per_week: this.simSessions,
        avg_intensity: this.simIntensity,
        avg_load_km_per_session: this.simLoadPerSession
      }
    }).subscribe({
      next: (d: any) => {
        this.simExplanation = d;
        this.explainLoading = false;
      },
      error: () => {
        this.explainLoading = false;
        this.showExplanation = false;
      }
    });
  }

  /* ── Helpers ── */
  getSwimmerName(n: any): string {
    if (!n) return 'Inconnu';
    const u = n?.utilisateur || n;
    return `${u?.prenom || ''} ${u?.nom || ''}`.trim() || 'Nageur';
  }

  getInitials(n: any): string {
    const u = n?.utilisateur || n;
    return ((u?.prenom?.[0] || '') + (u?.nom?.[0] || '')).toUpperCase();
  }

  avatarUrl(n: any): string {
    const img = n?.utilisateur?.imageprofile || n?.imageprofile;
    return img ? 'http://localhost:3300' + img : '';
  }

  getAcwrColor(acwr: number): string {
    if (acwr <= 0) return '#86a6c4';
    if (acwr < 0.8) return '#3b82f6';
    if (acwr <= 1.3) return '#22c55e';
    if (acwr <= 1.5) return '#f59e0b';
    return '#ef4444';
  }

  getAcwrLabel(acwr: number): string {
    if (acwr <= 0) return 'N/A';
    if (acwr < 0.8) return 'Sous-entraîné';
    if (acwr <= 1.3) return 'Zone Optimale';
    if (acwr <= 1.5) return 'Attention';
    return 'Zone Danger';
  }

  getFatigueColor(level: string): string {
    switch (level) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#f59e0b';
      default: return '#22c55e';
    }
  }

  getDeltaClass(delta: number): string {
    if (delta < 0) return 'improvement';
    if (delta > 0) return 'degradation';
    return 'neutral';
  }

  getAcwrArcPath(acwr: number): string {
    // Map ACWR (0-2) to 0-180 degrees for a semicircle gauge
    const pct = Math.min(acwr / 2, 1);
    const angle = pct * 180;
    const rad = (angle * Math.PI) / 180;
    const cx = 50, cy = 50, r = 40;
    const x = cx - r * Math.cos(rad);
    const y = cy - r * Math.sin(rad);
    const largeArc = angle > 180 ? 1 : 0;
    return `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${cy - (y - cy)}`;
  }

  getIntensityLabel(val: number): string {
    if (val <= 3) return 'Faible';
    if (val <= 5) return 'Modérée';
    if (val <= 7) return 'Élevée';
    return 'Maximale';
  }

  getIntensityColor(val: number): string {
    if (val <= 3) return '#22c55e';
    if (val <= 5) return '#3b82f6';
    if (val <= 7) return '#f59e0b';
    return '#ef4444';
  }

  resetSimulation() {
    this.simResult = null;
    this.simExplanation = null;
    this.showExplanation = false;
    this.simError = '';
  }
}
