import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  currentUser: any = null;
  currentDate: string = '';

  stats = { nageurs: 42, entraineurs: 7, competitions: 3, alertes: 3 };

  alertes = [
    { nom: 'Ahmed B.', type: 'Fatigue élevée', detail: 'Repos recommandé · Score 82%', level: 'danger' },
    { nom: 'Sara M.', type: 'Baisse de niveau', detail: '-12% vs mois dernier', level: 'warning' },
    { nom: 'Karim T.', type: 'Charge excessive', detail: 'Réviser le planning', level: 'warning' },
    { nom: 'Ines L.', type: 'Prête compétition', detail: 'Recommandée par IDSS ✓', level: 'success' },
  ];

  topNageurs = [
    { nom: 'Ahmed B.', score: 92 },
    { nom: 'Ines L.', score: 87 },
    { nom: 'Youssef K.', score: 81 },
    { nom: 'Sara M.', score: 74 },
    { nom: 'Karim T.', score: 68 },
  ];

  barData = [
    { mois: 'Oct', val: 55 }, { mois: 'Nov', val: 70 },
    { mois: 'Déc', val: 60 }, { mois: 'Jan', val: 80 },
    { mois: 'Fév', val: 68 }, { mois: 'Mar', val: 88 },
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    const user = localStorage.getItem('user');
    if (user) this.currentUser = JSON.parse(user);

    const now = new Date();
    this.currentDate = now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    this.loadStats();
  }

  async loadStats() {
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Authorization': `Bearer ${token}` };

      const [n, e] = await Promise.all([
        fetch('http://localhost:3300/nageurs', { headers }).then(r => r.json()),
        fetch('http://localhost:3300/entraineurs', { headers }).then(r => r.json()),
      ]);

      this.stats.nageurs = Array.isArray(n) ? n.length : 42;
      this.stats.entraineurs = Array.isArray(e) ? e.length : 7;

    } catch {
      this.stats = { nageurs: 42, entraineurs: 7, competitions: 3, alertes: 3 };
    }
  }

  getMenuItems(type: string) {
  if (type === 'menu') {
    return [
      { label: 'Dashboard', route: '/dashboard', icon: '🏠', active: true },
      { label: 'Nageurs', route: '/nageurs', icon: '🏊', active: false }
    ];
  }

  if (type === 'idss') {
    return [
      { label: 'Analyse', route: '/analyse', icon: '📊', active: false }
    ];
  }

  if (type === 'admin') {
    return [
      { label: 'Admin', route: '/admin', icon: '⚙️', active: false }
    ];
  }

  return [];
}

 
  getBarOpacity(val: number): number {
    return val / 100; // باش يعطي opacity بين 0 و 1
  }

  getBarColor(mois: string): string {
    return mois === 'Mar' ? '#c8102e' : '#0d4228';
  }

  getScoreColor(score: number): string {
    if (score >= 85) return '#c8102e';
    if (score >= 75) return '#0d4228';
    return '#9fd4b8';
  }

  getUserInitials(): string {
    if (!this.currentUser) return 'AD';
    return ((this.currentUser.nom?.[0] || '') + (this.currentUser.prenom?.[0] || '')).toUpperCase();
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}