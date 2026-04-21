export type TrainingType = 'endurance' | 'sprint' | 'technique';
export type CoachFeedback = 'good' | 'average' | 'poor';
export type AttendanceStatus = 'present' | 'absent';

export interface TrainingResult {
  id?: string;
  sessionId?: string;
  swimmerId: string;
  swimmerName?: string;
  date: string;
  type: TrainingType;
  duration: number;
  distance: number;
  intensity: number;
  performanceTime?: string;
  note?: string;
  feedback: CoachFeedback;
  attendance: AttendanceStatus;
  coachId?: string;
  createdAt?: string;
}
