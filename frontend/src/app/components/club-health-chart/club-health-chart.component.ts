import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export interface HealthDataPoint {
  label: string;
  healthScore: number;
  attendance: number;
  progression: number;
  fatigue: number;
  injuryRisk: number;
  discipline: number;
  event?: { type: 'warning' | 'critical' | 'positive' | 'info'; text: string };
}

@Component({
  selector: 'app-club-health-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './club-health-chart.component.html',
  styleUrls: ['./club-health-chart.component.css']
})
export class ClubHealthChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('healthCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() data: HealthDataPoint[] = [];
  @Input() title = 'Club Health Evolution';

  private chart: Chart | null = null;
  activeTooltip: HealthDataPoint | null = null;
  tooltipX = 0;
  tooltipY = 0;

  get currentScore(): number {
    return this.data.length ? this.data[this.data.length - 1].healthScore : 0;
  }

  get trend(): { label: string; icon: string; color: string } {
    if (this.data.length < 2) return { label: 'Stable', icon: '→', color: '#64748b' };
    const last = this.data[this.data.length - 1].healthScore;
    const prev = this.data[this.data.length - 2].healthScore;
    const diff = last - prev;
    if (diff > 3) return { label: 'Improving', icon: '↗', color: '#22c55e' };
    if (diff < -3) return { label: 'Declining', icon: '↘', color: '#ef4444' };
    return { label: 'Stable', icon: '→', color: '#f59e0b' };
  }

  get scoreStatus(): string {
    const s = this.currentScore;
    if (s >= 80) return 'Excellent';
    if (s >= 65) return 'Good';
    if (s >= 45) return 'Moderate';
    return 'Critical';
  }

  get scoreColor(): string {
    const s = this.currentScore;
    if (s >= 80) return '#22c55e';
    if (s >= 65) return '#3b82f6';
    if (s >= 45) return '#f59e0b';
    return '#ef4444';
  }

  get aiEvents(): Array<HealthDataPoint & { index: number }> {
    return this.data
      .map((d, i) => ({ ...d, index: i }))
      .filter(d => d.event);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.renderChart(), 50);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.canvasRef) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(): void {
    if (!this.canvasRef?.nativeElement || !this.data.length) return;
    this.chart?.destroy();

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.data.map(d => d.label);
    const healthScores = this.data.map(d => d.healthScore);
    const fatigueScores = this.data.map(d => 100 - d.fatigue);
    const injuryScores = this.data.map(d => 100 - d.injuryRisk);

    // Neon blue gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 163, 255, 0.35)');
    gradient.addColorStop(0.5, 'rgba(0, 163, 255, 0.08)');
    gradient.addColorStop(1, 'rgba(0, 163, 255, 0)');

    // Secondary gradient
    const gradient2 = ctx.createLinearGradient(0, 0, 0, 300);
    gradient2.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
    gradient2.addColorStop(1, 'rgba(139, 92, 246, 0)');

    // Tertiary gradient
    const gradient3 = ctx.createLinearGradient(0, 0, 0, 300);
    gradient3.addColorStop(0, 'rgba(34, 197, 94, 0.12)');
    gradient3.addColorStop(1, 'rgba(34, 197, 94, 0)');

    // Event marker points
    const eventPoints = this.data.map(d => d.event ? d.healthScore : null);

    const self = this;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Health Score',
            data: healthScores,
            borderColor: '#00a3ff',
            backgroundColor: gradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.45,
            pointRadius: healthScores.map((_, i) => this.data[i].event ? 7 : 3),
            pointBackgroundColor: healthScores.map((_, i) => {
              const ev = this.data[i].event;
              if (!ev) return '#00a3ff';
              if (ev.type === 'critical') return '#ef4444';
              if (ev.type === 'warning') return '#f59e0b';
              if (ev.type === 'positive') return '#22c55e';
              return '#8b5cf6';
            }),
            pointBorderColor: healthScores.map((_, i) => {
              const ev = this.data[i].event;
              if (!ev) return 'rgba(0,163,255,0.4)';
              if (ev.type === 'critical') return 'rgba(239,68,68,0.4)';
              if (ev.type === 'warning') return 'rgba(245,158,11,0.4)';
              if (ev.type === 'positive') return 'rgba(34,197,94,0.4)';
              return 'rgba(139,92,246,0.4)';
            }),
            pointBorderWidth: healthScores.map((_, i) => this.data[i].event ? 4 : 1),
            pointHoverRadius: 9,
            pointHoverBorderWidth: 3,
            pointHoverBorderColor: '#00a3ff',
            order: 1
          },
          {
            label: 'Recovery Index',
            data: fatigueScores,
            borderColor: 'rgba(139, 92, 246, 0.7)',
            backgroundColor: gradient2,
            borderWidth: 1.5,
            fill: true,
            tension: 0.45,
            pointRadius: 0,
            pointHoverRadius: 5,
            borderDash: [6, 3],
            order: 2
          },
          {
            label: 'Safety Score',
            data: injuryScores,
            borderColor: 'rgba(34, 197, 94, 0.6)',
            backgroundColor: gradient3,
            borderWidth: 1.5,
            fill: true,
            tension: 0.45,
            pointRadius: 0,
            pointHoverRadius: 5,
            borderDash: [3, 3],
            order: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1500,
          easing: 'easeOutQuart'
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: (context) => {
              const tooltipModel = context.tooltip;
              if (tooltipModel.opacity === 0) {
                self.activeTooltip = null;
                return;
              }
              const idx = tooltipModel.dataPoints?.[0]?.dataIndex;
              if (idx != null && self.data[idx]) {
                self.activeTooltip = self.data[idx];
                self.tooltipX = tooltipModel.caretX;
                self.tooltipY = tooltipModel.caretY;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255,255,255,0.04)',
              drawTicks: false
            },
            ticks: {
              color: 'rgba(255,255,255,0.35)',
              font: { size: 10, family: "'Inter', sans-serif" },
              maxRotation: 0,
              padding: 8
            },
            border: { display: false }
          },
          y: {
            min: 0,
            max: 100,
            grid: {
              color: 'rgba(255,255,255,0.04)',
              drawTicks: false
            },
            ticks: {
              color: 'rgba(255,255,255,0.3)',
              font: { size: 10, family: "'Inter', sans-serif" },
              stepSize: 25,
              callback: (value) => value + '%',
              padding: 8
            },
            border: { display: false }
          }
        }
      }
    });
  }

  hideTooltip(): void {
    this.activeTooltip = null;
  }

  getEventIcon(type: string): string {
    switch (type) {
      case 'critical': return '🔴';
      case 'warning': return '⚠️';
      case 'positive': return '✅';
      default: return 'ℹ️';
    }
  }

  getMetricBar(value: number): number {
    return Math.max(0, Math.min(100, value));
  }
}
