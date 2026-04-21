import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';
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
import { InterfaceEntaineurComponent } from './interface-entaineur/interface-entaineur.component';
import { InterfaceNageurComponent } from './interface-nageur/interface-nageur.component';
import { ProfileComponent } from './profile/profile.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { LandingComponent } from './landing/landing.component';
import { FeatureCardComponent } from './landing/feature-card/feature-card.component';
import { FeatureModalComponent } from './landing/feature-modal/feature-modal.component';
import { TrainingResultsComponent } from './training-results/training-results.component';
import { MyPerformanceComponent } from './my-performance/my-performance.component';
import { TrainingAnalyticsComponent } from './training-analytics/training-analytics.component';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    LayoutComponent,
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    NageursComponent,
    EntraineursComponent,
    CompetitionsComponent,
    PlanningComponent,
    UtilisateursComponent,
    CotisationsComponent,
    InterfaceEntaineurComponent,
    InterfaceNageurComponent,
    ProfileComponent,
    ChatbotComponent,
    TrainingResultsComponent,
    MyPerformanceComponent,
    TrainingAnalyticsComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    TranslateModule.forRoot({
      defaultLanguage: 'fr',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    DashboardComponent,
    LandingComponent,
    FeatureCardComponent,
    FeatureModalComponent
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}