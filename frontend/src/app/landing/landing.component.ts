import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  features: { title: string; desc: string; colorClass: string; iconPath: SafeHtml }[] = [];

  statsData = [
    { value: '—', label: 'Nageurs' },
    { value: '—', label: 'Entraîneurs' },
    { value: '—', label: 'Compétitions' },
    { value: '—', label: 'Entraînements' }
  ];

  constructor(
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) {
    this.features = [
      {
        title: 'Suivi de Performance',
        desc: 'Analysez les temps, la progression et les tendances de chaque nageur avec des tableaux de bord intelligents.',
        colorClass: 'teal',
        iconPath: this.sanitizer.bypassSecurityTrustHtml('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>')
      },
      {
        title: 'Gestion des Entraînements',
        desc: 'Planifiez, coordonnez et optimisez les séances d\'entraînement pour maximiser les résultats.',
        colorClass: 'blue',
        iconPath: this.sanitizer.bypassSecurityTrustHtml('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>')
      },
      {
        title: 'Aide à la Décision',
        desc: 'Des recommandations intelligentes basées sur les données pour la sélection et la stratégie de compétition.',
        colorClass: 'amber',
        iconPath: this.sanitizer.bypassSecurityTrustHtml('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>')
      },
      {
        title: 'Analyse Corporelle',
        desc: 'Suivez les métriques corporelles, l\'IMC et la condition physique pour une préparation optimale.',
        colorClass: 'purple',
        iconPath: this.sanitizer.bypassSecurityTrustHtml('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>')
      }
    ];
  }

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.http.get<any>('http://localhost:3300/api/stats').subscribe({
      next: (data) => {
        this.statsData = [
          { value: String(data.nageurs || 0), label: 'Nageurs' },
          { value: String(data.entraineurs || 0), label: 'Entraîneurs' },
          { value: String(data.competitions || 0), label: 'Compétitions' },
          { value: String(data.entrainements || 0), label: 'Entraînements' }
        ];
      },
      error: () => {
        // Keep default values on error
        this.statsData = [
          { value: '0', label: 'Nageurs' },
          { value: '0', label: 'Entraîneurs' },
          { value: '0', label: 'Compétitions' },
          { value: '0', label: 'Entraînements' }
        ];
      }
    });
  }

  onHeroVideoReady(video: HTMLVideoElement): void {
    this.configureHeroVideo(video);
  }

  startHeroVideo(video: HTMLVideoElement): void {
    this.configureHeroVideo(video);
    void video.play();
  }

  private configureHeroVideo(video: HTMLVideoElement): void {
    video.defaultPlaybackRate = 0.8;
    video.playbackRate = 0.8;
    video.muted = true;
    video.volume = 0;
  }
}
