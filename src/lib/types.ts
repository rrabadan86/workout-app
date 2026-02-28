export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'personal' | 'user';
  onboarding_done: boolean;
  friendIds?: string[];
  state?: string;
  city?: string;
  cref?: string;
  sex?: 'M' | 'F' | 'outro';
  birth_date?: string;
  photo_url?: string;
  created_at?: string;
}

export interface PersonalStudent {
  id: string;
  personal_id: string;
  student_id: string;
  status: 'active' | 'inactive';
  linked_at: string;
}

export interface PendingPrescription {
  id: string;
  personal_id: string;
  student_email: string;
  project_id: string;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  description: string;
  createdBy: string; // userId (profile.id)
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
  ownerId: string; // profile.id
  startDate: string; // ISO date
  endDate: string;   // ISO date
  sharedWith: string[]; // userIds
  prescribed_to?: string | null;
  prescribed_by?: string | null;
  status?: 'active' | 'inactive';
  is_evolution?: boolean;
}

// ─── Workout (belongs to a Project) ────────────────────────────────────────
export interface Workout {
  id: string;
  name: string;
  ownerId: string; // profile.id
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
  duration?: number;   // workout duration in seconds
}

export interface Kudo {
  id: string;
  feedEventId: string;
  userId: string;
  createdAt: string;
}

// ─── Challenges ────────────────────────────────────────────────────────────
export interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  start_date: string;       // ISO date
  end_date: string;         // ISO date
  weekly_frequency: number;  // 1-7
  checkin_type: 'any_workout' | 'specific_workout';
  specific_workout_id?: string | null;
  visibility: 'public' | 'private';
  join_rule: 'anyone' | 'followers_only' | 'invite_only';
  max_participants?: number | null;
  created_by: string;
  status: 'active' | 'ended';
  invite_token?: string | null;
  created_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'participant';
  joined_at: string;
}

export interface ChallengeInvite {
  id: string;
  challenge_id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
}

export interface ChallengeCheckin {
  id: string;
  challenge_id: string;
  user_id: string;
  checkin_date: string;
  checkin_type: 'auto' | 'manual';
  evidence_note?: string | null;
  workout_id?: string | null;
  feed_event_id?: string | null;
  created_at: string;
}

export interface ChallengeComment {
  id: string;
  challenge_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export type BadgeType = 'first_flame' | 'unstoppable_streak' | 'challenge_elite' | 'leading_pack' | 'living_proof' | 'challenge_completed' | 'top_1_challenge' | 'top_2_challenge' | 'top_3_challenge';

export interface ChallengeBadge {
  id: string;
  challenge_id: string;
  user_id: string;
  badge_type: BadgeType;
  earned_at: string;
}

export interface AppStore {
  profiles: Profile[];
  exercises: Exercise[];
  projects: Project[];
  workouts: Workout[];
  logs: WorkoutLog[];
  feedEvents: FeedEvent[];
  kudos: Kudo[];
  challenges: Challenge[];
  challengeParticipants: ChallengeParticipant[];
  challengeInvites: ChallengeInvite[];
  challengeCheckins: ChallengeCheckin[];
  challengeComments: ChallengeComment[];
  challengeBadges: ChallengeBadge[];
}
