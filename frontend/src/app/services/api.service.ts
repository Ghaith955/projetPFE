import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:3300';

  constructor(private http: HttpClient) {}

  // Admin
  getStats(): Observable<any> { return this.http.get(`${this.baseUrl}/admin/stats`); }
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
  createPerformance(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/performances`, data); }
  updatePerformance(id: string, data: any): Observable<any> { return this.http.put(`${this.baseUrl}/performances/${id}`, data); }
  deletePerformance(id: string): Observable<any> { return this.http.delete(`${this.baseUrl}/performances/${id}`); }

  // Password
  requestPasswordReset(email: string): Observable<any> { return this.http.post(`${this.baseUrl}/password/request-reset`, { email }); }
  resetPassword(token: string, data: any): Observable<any> { return this.http.post(`${this.baseUrl}/password/reset/${token}`, data); }
}
