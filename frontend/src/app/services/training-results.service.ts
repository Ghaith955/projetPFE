import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TrainingResult } from '../models/training-result.model';

@Injectable({ providedIn: 'root' })
export class TrainingResultsService {
  private storageKey = 'idss-training-results';
  private results$ = new BehaviorSubject<TrainingResult[]>(this.load());

  getResults(): Observable<TrainingResult[]> {
    return this.results$.asObservable();
  }

  getSnapshot(): TrainingResult[] {
    return this.results$.value;
  }

  addResults(results: TrainingResult[]): void {
    const next = [...this.results$.value, ...results.map(r => this.normalize(r))];
    this.persist(next);
  }

  updateResult(id: string, patch: Partial<TrainingResult>): void {
    const next = this.results$.value.map(item => item.id === id ? { ...item, ...patch } : item);
    this.persist(next);
  }

  removeResult(id: string): void {
    const next = this.results$.value.filter(item => item.id !== id);
    this.persist(next);
  }

  clearAll(): void {
    this.persist([]);
  }

  private persist(results: TrainingResult[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(results));
    this.results$.next(results);
  }

  private load(): TrainingResult[] {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private normalize(result: TrainingResult): TrainingResult {
    return {
      ...result,
      id: result.id || this.makeId(),
      createdAt: result.createdAt || new Date().toISOString()
    };
  }

  private makeId(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}
