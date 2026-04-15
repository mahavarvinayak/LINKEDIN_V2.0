export type UserPlan = 'free' | 'starter' | 'pro';
export type PostType = 'analyzed' | 'generated' | 'draft';
export type UserRole = 'student' | 'founder' | 'freelancer' | 'job_seeker';
export type UserGoal = 'followers' | 'leads' | 'job' | 'brand';
export type UserTone = 'bold' | 'story' | 'educational' | 'casual';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  plan: UserPlan;
  credits_analyze: number;
  credits_generate: number;
  streak_count: number;
  last_posted_at: string | null;
  created_at: string;
}

export interface Persona {
  id: string;
  user_id: string;
  role: UserRole;
  topics: string[];
  goal: UserGoal;
  tone: UserTone;
  audience: string;
}

export interface Post {
  id: string;
  user_id: string;
  type: PostType;
  original_content: string | null;
  improved_content: string | null;
  topic: string | null;
  hook_score: number | null;
  readability_score: number | null;
  engagement_score: number | null;
  structure_score: number | null;
  overall_score: number | null;
  top_problems: string[];
  improvement_summary: string | null;
  is_saved: boolean;
  scheduled_at: string | null;
  created_at: string;
}

export interface AnalyzeResult {
  scores: {
    hook: { score: number; label: string; explanation: string };
    readability: { score: number; label: string; explanation: string };
    engagement: { score: number; label: string; explanation: string };
    structure: { score: number; label: string; explanation: string };
  };
  overall_score: number;
  top_problems: string[];
  improved_post: string;
  improvement_summary: string;
}

export interface GenerateResult {
  post: string;
  hook_type: string;
  estimated_scores: {
    hook: number;
    readability: number;
    engagement: number;
    structure: number;
  };
  best_time_to_post: string;
  suggested_hashtags: string[];
}
