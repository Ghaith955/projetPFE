import { Component, OnInit, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { filter } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {
  currentUser: User | null = null;
  sidebarCollapsed = false;
  pendingDemandes = 0;
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
  private icons: { [key: string]: SafeHtml } = {};

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
      settings: svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>')
    };
  }

  ngOnInit() {
    this.currentUser = this.auth.currentUser;
    this.auth.currentUser$.subscribe(u => this.currentUser = u);

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
        { labelKey: 'sidebar.trainingAnalytics', route: '/training-analytics', icon: this.icons['analytics'] }
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
}
