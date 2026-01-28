
export interface TrainingSession {
  date: string;
  startTime: string;
  endTime: string;
  module: string;
  trainer: string;
  hours: number;
}

export interface ProcessingResult {
  studentName: string;
  sessions: TrainingSession[];
}

export interface GroupedSession {
  date: string;
  horaires: string;
  module: string;
  intervenant: string;
  heures: number;
}
