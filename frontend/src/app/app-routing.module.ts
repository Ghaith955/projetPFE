import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LayoutComponent } from './layout/layout.component';

import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NageursComponent } from './nageurs/nageurs.component';
import { EntraineursComponent } from './entraineurs/entraineurs.component';
import { CompetitionsComponent } from './competitions/competitions.component';
import { PlanningComponent } from './planning/planning.component';
import { UtilisateursComponent } from './admin/utilisateurs/utilisateurs.component';
import { CotisationsComponent } from './cotisations/cotisations.component';
import { ProfileComponent } from './profile/profile.component';
import { LandingComponent } from './landing/landing.component';
import { TrainingResultsComponent } from './training-results/training-results.component';
import { MyPerformanceComponent } from './my-performance/my-performance.component';
import { TrainingAnalyticsComponent } from './training-analytics/training-analytics.component';
import { SimulationComponent } from './simulation/simulation.component';

const routes: Routes = [
  { path: '', component: LandingComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password/:token', component: ResetPasswordComponent },

  // All protected routes share the LayoutComponent (sidebar + topbar)
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'nageurs', component: NageursComponent, data: { roles: ['RESPONSABLE', 'ENTRAINEUR'] } },
      { path: 'entraineurs', component: EntraineursComponent, data: { roles: ['RESPONSABLE'] } },
      { path: 'competitions', component: CompetitionsComponent },
      { path: 'planning', component: PlanningComponent },
      { path: 'training-results', component: TrainingResultsComponent, data: { roles: ['ENTRAINEUR', 'RESPONSABLE'] } },
      { path: 'training-analytics', component: TrainingAnalyticsComponent, data: { roles: ['ENTRAINEUR', 'RESPONSABLE'] } },
      { path: 'simulation', component: SimulationComponent, data: { roles: ['ENTRAINEUR', 'RESPONSABLE'] } },
      { path: 'my-performance', component: MyPerformanceComponent, data: { roles: ['NAGEUR'] } },
      { path: 'utilisateurs', component: UtilisateursComponent, data: { roles: ['RESPONSABLE'] } },
      { path: 'cotisations', component: CotisationsComponent, data: { roles: ['RESPONSABLE', 'NAGEUR'] } },
      { path: 'settings', component: ProfileComponent },
    ]
  },

  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}