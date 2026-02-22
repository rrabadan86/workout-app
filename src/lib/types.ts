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

export interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  reps: number;
}

export interface Workout {
  id: string;
  name: string;
  ownerId: string;
  exercises: WorkoutExercise[];
  endDate: string; // ISO date string
  sharedWith: string[]; // userIds
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

export interface AppStore {
  users: User[];
  exercises: Exercise[];
  workouts: Workout[];
  logs: WorkoutLog[];
}
