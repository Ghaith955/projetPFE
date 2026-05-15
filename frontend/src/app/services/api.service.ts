import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:3300';

  constructor(private http: HttpClient) {}

  // Admin
  getStats(): Observable<any> { return this.http.get(`${this.baseUrl}/admin/stats`); }
  getLatestIdssEvaluation(): Observable<any> { return this.http.get(`${this.baseUrl}/admin/idss-evaluations/latest`); }
  getAllUsers(): Observable<any> { return this.http.get(`${this.baseUrl}/admin/users`); }
  getUserById(id: string): Observable<any> { return this.http.get(`${this.baseUrl}/admin/users/${id}`); }
  createUser(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/admin/users`, data); }
  updateUser(id: string, data: any): Observable<any> { return this.http.put(`${this.baseUrl}/admin/users/${id}`, data); }
  toggleUserActive(id: string): Observable<any> { return this.http.patch(`${this.baseUrl}/admin/users/${id}/toggle-active`, {}); }
  deleteUser(id: string): Observable<any> { return this.http.delete(`${this.baseUrl}/admin/users/${id}`); }
  assignNageurToEntraineur(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/admin/assign-entraineur`, data); }
  getPendingRegistrations(): Observable<any> { return this.http.get(`${this.baseUrl}/admin/pending-registrations`); }
  respondPendingRegistration(id: string, action: string): Observable<any> { return this.http.patch(`${this.baseUrl}/admin/pending-registrations/${id}`, { action }); }

  // Nageurs
  getAllNageurs(): Observable<any> { return this.http.get(`${this.baseUrl}/nageurs`); }
  getNageurById(id: string): Observable<any> { return this.http.get(`${this.baseUrl}/nageurs/${id}`); }
  registerNageur(data: FormData): Observable<any> { return this.http.post(`${this.baseUrl}/nageurs/register`, data); }
  updateNageur(id: string, data: any): Observable<any> { return this.http.put(`${this.baseUrl}/nageurs/${id}`, data); }
  deleteNageur(id: string): Observable<any> { return this.http.delete(`${this.baseUrl}/nageurs/${id}`); }

  // Entraineurs
  getAllEntraineurs(): Observable<any> { return this.http.get(`${this.baseUrl}/entraineurs`); }
  getEntraineurById(id: string): Observable<any> { return this.http.get(`${this.baseUrl}/entraineurs/${id}`); }
  registerEntraineur(data: FormData): Observable<any> { return this.http.post(`${this.baseUrl}/entraineurs/register`, data); }
  updateEntraineur(id: string, data: any): Observable<any> { return this.http.put(`${this.baseUrl}/entraineurs/${id}`, data); }
  deleteEntraineur(id: string): Observable<any> { return this.http.delete(`${this.baseUrl}/entraineurs/${id}`); }

  // Competitions
  getAllCompetitions(): Observable<any> { return this.http.get(`${this.baseUrl}/competitions`); }
  getCompetitionById(id: string): Observable<any> { return this.http.get(`${this.baseUrl}/competitions/${id}`); }
  createCompetition(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/competitions`, data); }
  updateCompetition(id: string, data: any): Observable<any> { return this.http.put(`${this.baseUrl}/competitions/${id}`, data); }
  deleteCompetition(id: string): Observable<any> { return this.http.delete(`${this.baseUrl}/competitions/${id}`); }

  // Competition Results
  addCompetitionResult(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/competition-results`, data); }
  getCompetitionResultsByUser(userId: string): Observable<any> { return this.http.get(`${this.baseUrl}/competition-results/user/${userId}`); }
  getCompetitionResultsByCompetition(competitionId: string): Observable<any> { return this.http.get(`${this.baseUrl}/competition-results/competition/${competitionId}`); }

  // Rankings
  getLatestRanking(type = 'weekly'): Observable<any> { return this.http.get(`${this.baseUrl}/rankings/latest`, { params: { type } }); }
  getRankingByPeriod(type: string, key: string): Observable<any> { return this.http.get(`${this.baseUrl}/rankings/by-period`, { params: { type, key } }); }
  getRankingHistory(userId: string, type = 'weekly', limit = 12): Observable<any> {
    return this.http.get(`${this.baseUrl}/rankings/history/${userId}`, { params: { type, limit } });
  }

  // Entrainements (Planning)
  getAllEntrainements(): Observable<any> { return this.http.get(`${this.baseUrl}/planning`); }
  getEntrainementById(id: string): Observable<any> { return this.http.get(`${this.baseUrl}/planning/${id}`); }
  createEntrainement(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/planning`, data); }
  updateEntrainement(id: string, data: any): Observable<any> { return this.http.put(`${this.baseUrl}/planning/${id}`, data); }
  deleteEntrainement(id: string): Observable<any> { return this.http.delete(`${this.baseUrl}/planning/${id}`); }

  // Cotisations
  getAllCotisations(): Observable<any> { return this.http.get(`${this.baseUrl}/cotisations`); }
  getCotisationStats(): Observable<any> { return this.http.get(`${this.baseUrl}/cotisations/stats`); }
  createCotisation(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/cotisations`, data); }
  updateCotisation(id: string, data: any): Observable<any> { return this.http.put(`${this.baseUrl}/cotisations/${id}`, data); }
  deleteCotisation(id: string): Observable<any> { return this.http.delete(`${this.baseUrl}/cotisations/${id}`); }
  downloadCotisationFacture(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/cotisations/${id}/facture`, {
      responseType: 'blob',
      observe: 'response'
    });
  }

  // Demandes
  getAllDemandes(): Observable<any> { return this.http.get(`${this.baseUrl}/demandes`); }
  getPendingDemandesCount(): Observable<any> { return this.http.get(`${this.baseUrl}/demandes/pending/count`); }
  createDemande(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/demandes`, data); }
  respondDemande(id: string, data: any): Observable<any> { return this.http.patch(`${this.baseUrl}/demandes/${id}/respond`, data); }

  // Performances
  getAllPerformances(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/performances`, { params: httpParams });
  }
  getPerformanceTrends(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(`${this.baseUrl}/performances/trends`, { params: httpParams });
  }
  getPerformanceInsights(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(`${this.baseUrl}/performances/insights`, { params: httpParams });
  }
  createTrainingResult(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/performances/training-result`, data);
  }
  createPerformance(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/performances`, data); }
  updatePerformance(id: string, data: any): Observable<any> { return this.http.put(`${this.baseUrl}/performances/${id}`, data); }
  deletePerformance(id: string): Observable<any> { return this.http.delete(`${this.baseUrl}/performances/${id}`); }

  // Password
  requestPasswordReset(email: string): Observable<any> { return this.http.post(`${this.baseUrl}/password/request-reset`, { email }); }
  verifyPasswordResetToken(token: string): Observable<any> { return this.http.get(`${this.baseUrl}/password/reset/${token}`); }
  resetPassword(token: string, data: any): Observable<any> { return this.http.post(`${this.baseUrl}/password/reset/${token}`, data); }

  // Chatbot
  sendChatMessage(messages: any[]): Observable<any> { return this.http.post(`${this.baseUrl}/chat`, { messages }); }

  // Notifications
  getMyNotifications(limit = 30): Observable<any> {
    return this.http.get(`${this.baseUrl}/notifications`, { params: { limit } });
  }

  markNotificationAsRead(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/notifications/${id}/read`, {});
  }

  markAllNotificationsAsRead(): Observable<any> {
    return this.http.patch(`${this.baseUrl}/notifications/read-all`, {});
  }

  // ── IDSS ────────────────────────────────────────────────────────────────
  getIdssSummary(): Observable<any>                       { return this.http.get(`${this.baseUrl}/idss/summary`); }
  getIdssDecisions(params?: any): Observable<any> {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => { if (params[k] != null) p = p.set(k, params[k]); });
    return this.http.get(`${this.baseUrl}/idss/decisions`, { params: p });
  }
  getIdssLatestDecision(nageurId: string): Observable<any> { return this.http.get(`${this.baseUrl}/idss/decisions/latest/${nageurId}`); }
  getIdssMyStatus(): Observable<any>                       { return this.http.get(`${this.baseUrl}/idss/my-status`); }
  getIdssHistory(nageurId: string, limit = 30): Observable<any> { return this.http.get(`${this.baseUrl}/idss/history/${nageurId}`, { params: { limit } }); }
  getIdssBaseline(nageurId: string): Observable<any>       { return this.http.get(`${this.baseUrl}/idss/baseline/${nageurId}`); }
  updateIdssBaseline(nageurId: string, data: any): Observable<any> { return this.http.patch(`${this.baseUrl}/idss/baseline/${nageurId}`, data); }
  acknowledgeIdssDecision(id: string, note = ''): Observable<any> { return this.http.patch(`${this.baseUrl}/idss/decisions/${id}/acknowledge`, { note }); }
  triggerIdssAnalysis(performanceId: string): Observable<any> { return this.http.post(`${this.baseUrl}/idss/analyze/${performanceId}`, {}); }

  // ── AI Engine (Python FastAPI) ──────────────────────────────────────
  aiHealthCheck(): Observable<any> { return this.http.get(`${this.baseUrl}/ai/health`); }

  aiAnalyzePerformance(swimmerId: string, periodDays = 90, stroke?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai/analyze`, { swimmer_id: swimmerId, period_days: periodDays, stroke });
  }

  aiPredictTime(swimmerId: string, competitionDate?: string, trainingPlan?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai/predict`, { swimmer_id: swimmerId, competition_date: competitionDate, training_plan: trainingPlan });
  }

  aiFatigueDetection(swimmerIds?: string[], useMl = false): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai/fatigue`, { swimmer_ids: swimmerIds, use_ml: useMl });
  }

  aiRecommendSwimmers(competitionId?: string, stroke?: string, distance?: number, category?: string, topN = 5): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai/recommend`, { competition_id: competitionId, stroke, distance, category, top_n: topN });
  }

  aiSimulateScenario(swimmerId: string, weeks = 4, changes?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai/simulate`, { swimmer_id: swimmerId, simulation_weeks: weeks, changes });
  }

  /** Returns fatigue status for ALL swimmers — used by Admin/Coach dashboard */
  aiDashboard(): Observable<any> {
    return this.http.get(`${this.baseUrl}/ai/dashboard`);
  }

  /** Run batch analysis on all swimmers and return full IDSS state */
  aiBatchAnalyze(): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai/batch-analyze`, {});
  }

  /** Explainability layer — transparent reasoning for any IDSS decision */
  aiExplain(decisionType: string, swimmerId?: string, params?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai/explain`, { decision_type: decisionType, swimmer_id: swimmerId, params });
  }

  /** Generate personalized training plan for a swimmer */
  aiPlan(swimmerId: string, targetWeeks = 4): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai/plan`, { swimmer_id: swimmerId, target_weeks: targetWeeks });
  }

  /** Team-wide training planning */
  aiTeamPlan(): Observable<any> {
    return this.http.get(`${this.baseUrl}/ai/team-plan`);
  }

  /** AI-weighted MVP ranking (weekly/monthly) */
  aiMvpRanking(period: string = 'weekly'): Observable<any> {
    return this.http.get(`${this.baseUrl}/ai/ranking/mvp`, { params: { period } });
  }
}
