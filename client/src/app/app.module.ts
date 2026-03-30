import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

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
import { InterfaceEntaineurComponent } from './interface-entaineur/interface-entaineur.component';
import { InterfaceNageurComponent } from './interface-nageur/interface-nageur.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    DashboardComponent,
    NageursComponent,
    EntraineursComponent,
    CompetitionsComponent,
    PlanningComponent,
    UtilisateursComponent,
    CotisationsComponent,
    InterfaceEntaineurComponent,
    InterfaceNageurComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}