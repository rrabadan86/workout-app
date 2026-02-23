export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  friendIds: string[];
}

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  description: string;
  createdBy: string; // userId
}

export interface WorkoutSet {
  reps: number;
  label?: string; // optional custom name, e.g. "Aquecimento", "Falha"
  notes?: string; // optional observations per set
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[]; // each element = one set, with its own reps
}

// ─── Project (top-level container) ─────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  ownerId: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  sharedWith: string[]; // userIds
}

// ─── Workout (belongs to a Project) ────────────────────────────────────────
export interface Workout {
  id: string;
  name: string;
  ownerId: string;
  projectId: string; // parent project
  exercises: WorkoutExercise[];
  order?: number;    // display order within the project
}

export interface SetLog {
  weight: number;
  reps: number;
}

export interface WorkoutLog {
  id: string;
  workoutId: string;
  userId: string;
  exerciseId: string;
  date: string; // ISO date string
  sets: SetLog[];
}

export interface FeedEvent {
  id: string;
  userId: string;
  eventType: string;  // e.g. "WO_COMPLETED"
  referenceId: string; // e.g. workoutId
  createdAt: string;   // ISO date
}

export interface Kudo {
  id: string;
  feedEventId: string;
  userId: string;
  createdAt: string;
}

export interface AppStore {
  users: User[];
  exercises: Exercise[];
  projects: Project[];
  workouts: Workout[];
  logs: WorkoutLog[];
  feedEvents: FeedEvent[];
  kudos: Kudo[];
}
