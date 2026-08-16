export type UserRole = 'ADMIN' | 'STUDENT';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  last_login_at?: string;
}

export interface UserAdmin extends User {
  total_attempts: number;
  passed_attempts: number;
  average_score: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  quiz_count: number;
  created_at: string;
  updated_at: string;
}

export type QuizStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionType = 'MCQ_SINGLE';

export interface QuestionOptionAdmin {
  id: string;
  question_id?: string;
  option_text: string;
  position: number;
  is_correct: boolean;
}

export interface QuestionOptionStudent {
  id: string;
  option_text: string;
  position: number;
}

export interface QuestionAdmin {
  id: string;
  quiz_version_id: string;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  difficulty: DifficultyLevel;
  explanation?: string;
  position: number;
  options: QuestionOptionAdmin[];
  created_at: string;
  updated_at: string;
}

export interface QuizVersion {
  id: string;
  quiz_id: string;
  version_number: number;
  duration_seconds: number;
  passing_percentage: number;
  max_attempts: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  negative_marking_enabled: boolean;
  negative_mark_value: number;
  show_result_immediately: boolean;
  show_correct_answers: boolean;
  show_explanations: boolean;
  allow_review: boolean;
  allow_resume: boolean;
  available_from?: string;
  available_until?: string;
  published_at?: string;
  question_count: number;
  questions?: QuestionAdmin[];
  created_at: string;
}

export interface QuizAdmin {
  id: string;
  title: string;
  description?: string;
  category_id: string;
  category?: Category;
  status: QuizStatus;
  thumbnail_url?: string;
  created_by?: string;
  current_version?: QuizVersion;
  versions_count: number;
  total_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface QuizCheckItem {
  name: string;
  passed: boolean;
  details: string;
}

export interface QuizPublishChecklistResponse {
  is_publishable: boolean;
  quiz_id: string;
  quiz_title: string;
  checks: QuizCheckItem[];
  blocking_issues: string[];
}

export interface QuizStudentSummary {
  id: string;
  title: string;
  description?: string;
  category_name: string;
  category_slug: string;
  thumbnail_url?: string;
  duration_seconds: number;
  passing_percentage: number;
  max_attempts: number;
  question_count: number;
  total_marks: number;
  user_attempts_count: number;
  user_best_score?: number;
  user_has_passed: boolean;
  available_from?: string;
  available_until?: string;
}

export interface QuizStudentDetail extends QuizStudentSummary {
  negative_marking_enabled: boolean;
  negative_mark_value: number;
  allow_review: boolean;
  allow_resume: boolean;
  user_can_attempt: boolean;
  active_attempt_id?: string;
}

export type AttemptStatus = 'CREATED' | 'IN_PROGRESS' | 'SUBMITTING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface AttemptQuestionStudent {
  attempt_question_id: string;
  question_order: number;
  marks: number;
  question_text: string;
  options: QuestionOptionStudent[];
  selected_option_id?: string;
}

export interface AttemptStudentView {
  id: string;
  quiz_id: string;
  quiz_title: string;
  quiz_version_id: string;
  status: AttemptStatus;
  started_at: string;
  expires_at: string;
  server_time: string;
  duration_seconds: number;
  questions: AttemptQuestionStudent[];
  total_questions: number;
  answered_count: number;
}

export interface AttemptRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  quiz_id: string;
  quiz_title: string;
  quiz_version_id: string;
  status: AttemptStatus;
  started_at: string;
  expires_at: string;
  submitted_at?: string;
  score: number;
  percentage: number;
  passed: boolean;
  correct_answers: number;
  incorrect_answers: number;
  unanswered: number;
  total_marks: number;
  obtained_marks: number;
  time_taken_seconds: number;
  created_at: string;
}

export interface OptionReview {
  id: string;
  option_text: string;
  is_selected: boolean;
  is_correct?: boolean;
}

export interface QuestionReview {
  question_order: number;
  question_text: string;
  marks: number;
  marks_awarded: number;
  difficulty: string;
  options: OptionReview[];
  selected_option_id?: string;
  is_correct?: boolean;
  explanation?: string;
}

export interface ResultResponse {
  id: string;
  attempt_id: string;
  user_id: string;
  quiz_id: string;
  quiz_title: string;
  final_score: number;
  percentage: number;
  passed: boolean;
  passing_percentage: number;
  total_marks: number;
  obtained_marks: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  time_taken_seconds: number;
  submitted_at: string;
  allow_review: boolean;
  show_correct_answers: boolean;
  show_explanations: boolean;
  certificate_code?: string;
  questions_review?: QuestionReview[];
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  quizzes_taken: number;
  quizzes_passed: number;
  total_score: number;
  average_percentage: number;
  total_time_seconds: number;
}

export interface LeaderboardData {
  timeframe: string;
  category_id?: string;
  category_name?: string;
  total_participants: number;
  user_entry?: LeaderboardEntry;
  rankings: LeaderboardEntry[];
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
  passed_count: number;
  average_score: number;
}

export interface ScoreDistributionBucket {
  range_label: string;
  count: number;
  percentage: number;
}

export interface QuizPerformanceSummary {
  quiz_id: string;
  title: string;
  category_name: string;
  total_attempts: number;
  average_score: number;
  pass_rate: number;
}

export interface AdminAnalytics {
  total_users: number;
  active_users: number;
  total_quizzes: number;
  published_quizzes: number;
  total_questions: number;
  total_attempts: number;
  completed_attempts: number;
  average_score: number;
  overall_pass_rate: number;
  attempts_trend: TimeSeriesPoint[];
  score_distribution: ScoreDistributionBucket[];
  popular_quizzes: QuizPerformanceSummary[];
  recent_attempts_count: number;
}

export interface StudentAnalytics {
  total_attempts: number;
  passed_attempts: number;
  failed_attempts: number;
  pass_rate: number;
  average_score: number;
  highest_score: number;
  total_time_spent_seconds: number;
  category_breakdown: Array<{ category: string; attempts: number; passed: number; avg_percentage: number }>;
  recent_performance: TimeSeriesPoint[];
}

export interface QuestionAnalytics {
  question_id: string;
  question_text: string;
  quiz_title: string;
  difficulty: string;
  total_attempts: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  correct_percentage: number;
  difficulty_index: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface Certificate {
  id: string;
  certificate_code: string;
  user_id: string;
  user_name: string;
  quiz_id: string;
  quiz_title: string;
  score: number;
  percentage: number;
  issued_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
