import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password/:token', component: ResetPasswordComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'nageurs', component: NageursComponent },
  { path: 'entraineurs', component: EntraineursComponent },
  { path: 'competitions', component: CompetitionsComponent },
  { path: 'planning', component: PlanningComponent },
  { path: 'utilisateurs', component: UtilisateursComponent },
  { path: 'cotisations', component: CotisationsComponent },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}