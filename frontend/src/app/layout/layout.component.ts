import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { filter } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type?: 'competition' | 'planning' | 'cotisation' | 'general';
  resourceType?: string;
  resourceId?: string | null;
  createdAt?: string;
  isRead?: boolean;
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  sidebarCollapsed = false;
  pendingDemandes = 0;
  notifications: NotificationItem[] = [];
  unreadCount = 0;
  showNotifications = false;
  notificationsLoading = false;
  private notificationsIntervalId: number | null = null;
  currentRoute = '';
  currentLang = 'fr';
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);
  readonly languages = [
    { code: 'fr', label: 'FR' },
    { code: 'en', label: 'EN' },
    { code: 'ar', label: 'AR' }
  ];

  // SVG icon templates
  icons: { [key: string]: SafeHtml } = {};

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {
    const svg = (markup: string) => this.sanitizer.bypassSecurityTrustHtml(markup);
    this.icons = {
      dashboard: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'),
      users: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'),
      swimmer: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="3"/><path d="M5 20c2-1 4-2 7-2s5 1 7 2"/><path d="M5 17c2-1 4-2 7-2s5 1 7 2"/><line x1="12" y1="9" x2="12" y2="15"/></svg>'),
      clipboard: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>'),
      trophy: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>'),
      calendar: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'),
      wallet: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>'),
      training: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="m9 13 2 2 4-4"/></svg>'),
      analytics: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/><circle cx="7" cy="15" r="1"/><circle cx="11" cy="11" r="1"/><circle cx="14" cy="14" r="1"/><circle cx="19" cy="8" r="1"/></svg>'),
      performance: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h5l2-4 3 8 3-6 2 2h5"/></svg>'),
      settings: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'),
      bell: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'),
      simulation: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>')
    };
  }

  ngOnInit() {
    this.currentUser = this.auth.currentUser;
    this.auth.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (u) {
        this.loadNotifications();
        this.startNotificationPolling();
      } else {
        this.stopNotificationPolling();
      }
    });

    this.translate.addLangs(this.languages.map(l => l.code));
    this.translate.setDefaultLang('fr');
    const savedLang = localStorage.getItem('idss-lang') || 'fr';
    this.setLanguage(savedLang);

    // Track current route
    this.currentRoute = this.router.url;
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.currentRoute = e.urlAfterRedirects || e.url;
    });

    // Load pending demandes count
    this.api.getPendingDemandesCount().subscribe({
      next: (data) => { this.pendingDemandes = data.count; },
      error: () => {}
    });

    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('idss-theme', 'dark');
  }

  ngOnDestroy() {
    this.stopNotificationPolling();
  }

  get isAdmin() { return this.currentUser?.role === 'RESPONSABLE'; }
  get isEntraineur() { return this.currentUser?.role === 'ENTRAINEUR'; }
  get isNageur() { return this.currentUser?.role === 'NAGEUR'; }

  get menuItems() {
    const items: any[] = [
      { labelKey: 'sidebar.dashboard', route: '/dashboard', icon: this.icons['dashboard'], badge: this.pendingDemandes }
    ];

    if (this.isAdmin) {
      items.push(
        { labelKey: 'sidebar.users', route: '/utilisateurs', icon: this.icons['users'] },
        { labelKey: 'sidebar.swimmers', route: '/nageurs', icon: this.icons['swimmer'] },
        { labelKey: 'sidebar.coaches', route: '/entraineurs', icon: this.icons['clipboard'] },
        { labelKey: 'sidebar.competitions', route: '/competitions', icon: this.icons['trophy'] },
        { labelKey: 'sidebar.planning', route: '/planning', icon: this.icons['calendar'] },
        { labelKey: 'sidebar.trainingAnalytics', route: '/training-analytics', icon: this.icons['analytics'] },
        { labelKey: 'sidebar.cotisations', route: '/cotisations', icon: this.icons['wallet'] }
      );
    } else if (this.isEntraineur) {
      items.push(
        { labelKey: 'sidebar.mySwimmers', route: '/nageurs', icon: this.icons['swimmer'] },
        { labelKey: 'sidebar.competitions', route: '/competitions', icon: this.icons['trophy'] },
        { labelKey: 'sidebar.planning', route: '/planning', icon: this.icons['calendar'] },
        { labelKey: 'sidebar.trainingResults', route: '/training-results', icon: this.icons['training'] },
        { labelKey: 'sidebar.trainingAnalytics', route: '/training-analytics', icon: this.icons['analytics'] },
        { labelKey: 'sidebar.simulation', route: '/simulation', icon: this.icons['simulation'] }
      );
    } else {
      items.push(
        { labelKey: 'sidebar.competitions', route: '/competitions', icon: this.icons['trophy'] },
        { labelKey: 'sidebar.planning', route: '/planning', icon: this.icons['calendar'] },
        { labelKey: 'sidebar.cotisations', route: '/cotisations', icon: this.icons['wallet'] },
        { labelKey: 'sidebar.myPerformance', route: '/my-performance', icon: this.icons['performance'] }
      );
    }

    // Settings for all roles
    items.push({ labelKey: 'sidebar.settings', route: '/settings', icon: this.icons['settings'] });

    return items;
  }

  isActive(route: string): boolean {
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }

  getUserInitials(): string {
    if (!this.currentUser) return 'U';
    return ((this.currentUser.nom?.[0] || '') + (this.currentUser.prenom?.[0] || '')).toUpperCase();
  }

  getRoleBadge(): string {
    switch (this.currentUser?.role) {
      case 'RESPONSABLE': return 'Admin';
      case 'ENTRAINEUR': return 'Entraîneur';
      case 'NAGEUR': return 'Nageur';
      default: return '';
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  setLanguage(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('idss-lang', lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  logout() {
    this.auth.logout();
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  loadNotifications(limit = 30) {
    if (!this.currentUser || this.notificationsLoading) {
      return;
    }
    this.notificationsLoading = true;
    this.api.getMyNotifications(limit).subscribe({
      next: (data) => {
        this.notifications = data?.notifications || [];
        this.unreadCount = data?.unreadCount || 0;
      },
      error: () => {
        this.notificationsLoading = false;
      },
      complete: () => {
        this.notificationsLoading = false;
      }
    });
  }

  openNotification(notification: NotificationItem) {
    this.markNotificationAsRead(notification);
    this.showNotifications = false;
    const route = this.getNotificationRoute(notification);
    if (route) {
      this.router.navigate([route]);
    }
  }

  markNotificationAsRead(notification: NotificationItem) {
    if (!notification?._id || notification.isRead) {
      return;
    }
    this.api.markNotificationAsRead(notification._id).subscribe({
      next: () => {
        notification.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      },
      error: () => {}
    });
  }

  markAllNotificationsAsRead() {
    if (this.unreadCount === 0) {
      this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
      return;
    }
    this.api.markAllNotificationsAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
        this.unreadCount = 0;
      },
      error: () => {}
    });
  }

  formatNotificationDate(value?: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private getNotificationRoute(notification: NotificationItem): string | null {
    switch (notification.type) {
      case 'planning':
        return '/planning';
      case 'competition':
        return '/competitions';
      case 'cotisation':
        return '/cotisations';
      default:
        return null;
    }
  }

  private startNotificationPolling() {
    if (this.notificationsIntervalId !== null) {
      return;
    }
    this.notificationsIntervalId = window.setInterval(() => {
      this.loadNotifications();
    }, 30000);
  }

  private stopNotificationPolling() {
    if (this.notificationsIntervalId === null) {
      return;
    }
    window.clearInterval(this.notificationsIntervalId);
    this.notificationsIntervalId = null;
  }
}
