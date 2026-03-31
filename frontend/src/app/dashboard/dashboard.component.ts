import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  currentDate = '';
  pendingDemandes = 0;

  stats = {
    nageurs: 0, entraineurs: 0, competitions: 0,
    entrainements: 0, users: 0, demandesPending: 0
  };

  recentUsers: any[] = [];
  upcomingCompetitions: any[] = [];
  pendingRegistrations: any[] = [];
  actionLoading: { [key: string]: boolean } = {};

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.currentUser;

    const now = new Date();
    this.currentDate = now.toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    this.loadData();
  }

  loadData() {
    if (this.isAdmin) {
      this.api.getStats().subscribe({
        next: (data) => {
          this.stats = data;
          this.recentUsers = data.recentUsers || [];
          this.upcomingCompetitions = data.upcomingCompetitions || [];
        },
        error: () => {}
      });

      this.api.getPendingRegistrations().subscribe({
        next: (data) => { this.pendingRegistrations = Array.isArray(data) ? data : []; },
        error: () => {}
      });
    }

    this.api.getPendingDemandesCount().subscribe({
      next: (data) => { this.pendingDemandes = data.count; },
      error: () => {}
    });
  }

  approveRegistration(userId: string) {
    this.actionLoading[userId] = true;
    this.api.respondPendingRegistration(userId, 'approve').subscribe({
      next: () => {
        this.pendingRegistrations = this.pendingRegistrations.filter(u => u._id !== userId);
        this.actionLoading[userId] = false;
        this.loadData();
      },
      error: () => { this.actionLoading[userId] = false; }
    });
  }

  rejectRegistration(userId: string) {
    if (!confirm('Êtes-vous sûr de vouloir rejeter cette inscription ?')) return;
    this.actionLoading[userId] = true;
    this.api.respondPendingRegistration(userId, 'reject').subscribe({
      next: () => {
        this.pendingRegistrations = this.pendingRegistrations.filter(u => u._id !== userId);
        this.actionLoading[userId] = false;
        this.loadData();
      },
      error: () => { this.actionLoading[userId] = false; }
    });
  }

  get isAdmin() { return this.currentUser?.role === 'RESPONSABLE'; }
  get isEntraineur() { return this.currentUser?.role === 'ENTRAINEUR'; }
  get isNageur() { return this.currentUser?.role === 'NAGEUR'; }

  getRoleBadge(): string {
    switch (this.currentUser?.role) {
      case 'RESPONSABLE': return 'Administrateur';
      case 'ENTRAINEUR': return 'Entraîneur';
      case 'NAGEUR': return 'Nageur';
      default: return '';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'RESPONSABLE': return 'Admin';
      case 'ENTRAINEUR': return 'Entraîneur';
      case 'NAGEUR': return 'Nageur';
      default: return role;
    }
  }

  getTimeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }
}