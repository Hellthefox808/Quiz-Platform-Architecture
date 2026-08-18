import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Navbar } from './components/common/Navbar';
import { SyncDebugPanel } from './components/common/SyncDebugPanel';
import { AuthPage } from './pages/auth/AuthPage';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { QuizCatalog } from './pages/student/QuizCatalog';
import { QuizDetail } from './pages/student/QuizDetail';
import { ActiveAssessment } from './pages/student/ActiveAssessment';
import { ResultView } from './pages/student/ResultView';
import { AttemptHistory } from './pages/student/AttemptHistory';
import { LeaderboardView } from './pages/student/LeaderboardView';
import { CertificatesView } from './pages/student/CertificatesView';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { QuizManager } from './pages/admin/QuizManager';
import { QuestionBank } from './pages/admin/QuestionBank';
import { CategoryManager } from './pages/admin/CategoryManager';
import { UserManager } from './pages/admin/UserManager';
import { AuditLogsView } from './pages/admin/AuditLogsView';
import { QuestionAnalyticsView } from './pages/admin/QuestionAnalyticsView';
import {
  isValidAttemptRoute,
  isValidQuizRoute,
  NavigateFunction,
  NavigationState,
  View,
  ViewParamsMap,
} from './types/navigation';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [navState, setNavState] = useState<NavigationState>({ view: 'dashboard' });

  const handleNavigate: NavigateFunction = <V extends View>(
    view: V,
    ...args: undefined extends ViewParamsMap[V]
      ? [params?: ViewParamsMap[V]]
      : [params: ViewParamsMap[V]]
  ) => {
    const params = args[0];

    // Route parameter guards
    if (view === 'quiz-detail' && !isValidQuizRoute(params as { quizId?: string } | undefined)) {
      console.warn('Navigation guard: Missing quizId for quiz-detail route, redirecting to catalog.');
      setNavState({ view: 'catalog' });
      window.scrollTo(0, 0);
      return;
    }
    if (view === 'assessment' && !isValidAttemptRoute(params as { attemptId?: string } | undefined)) {
      console.warn('Navigation guard: Missing attemptId for assessment route, redirecting to dashboard.');
      setNavState({ view: 'dashboard' });
      window.scrollTo(0, 0);
      return;
    }
    if (view === 'admin-questions' && !isValidQuizRoute(params as { quizId?: string } | undefined)) {
      console.warn('Navigation guard: Missing quizId for admin-questions route, redirecting to admin-quizzes.');
      setNavState({ view: 'admin-quizzes' });
      window.scrollTo(0, 0);
      return;
    }

    setNavState({ view, params } as NavigationState);
    window.scrollTo(0, 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-[#b46927] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-[#5c4738] tracking-wider uppercase">Loading ApexAssess Engine...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Active Assessment screen is full-screen without top nav
  if (navState.view === 'assessment' && navState.params && isValidAttemptRoute(navState.params)) {
    return (
      <>
        <ActiveAssessment
          attemptId={navState.params.attemptId}
          onNavigate={handleNavigate}
        />
        <SyncDebugPanel />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#1c130d] flex flex-col">
      <Navbar currentView={navState.view} onNavigate={handleNavigate} />

      <main className="flex-1 pb-16">
        {navState.view === 'dashboard' && <StudentDashboard onNavigate={handleNavigate} />}
        {navState.view === 'catalog' && <QuizCatalog onNavigate={handleNavigate} />}
        {navState.view === 'quiz-detail' && navState.params && isValidQuizRoute(navState.params) && (
          <QuizDetail quizId={navState.params.quizId} onNavigate={handleNavigate} />
        )}
        {navState.view === 'result' && navState.params && isValidAttemptRoute(navState.params) && (
          <ResultView
            attemptId={navState.params.attemptId}
            resultId={navState.params.resultId}
            onNavigate={handleNavigate}
          />
        )}
        {navState.view === 'history' && <AttemptHistory onNavigate={handleNavigate} />}
        {navState.view === 'leaderboard' && <LeaderboardView />}
        {navState.view === 'certificates' && <CertificatesView />}

        {/* Admin Views */}
        {navState.view === 'admin-dashboard' && <AdminDashboard onNavigate={handleNavigate} />}
        {navState.view === 'admin-quizzes' && <QuizManager onNavigate={handleNavigate} />}
        {navState.view === 'admin-questions' && navState.params && isValidQuizRoute(navState.params) && (
          <QuestionBank
            quizId={navState.params.quizId}
            quizTitle={navState.params.quizTitle}
            onNavigate={handleNavigate}
          />
        )}
        {navState.view === 'admin-categories' && <CategoryManager onNavigate={handleNavigate} />}
        {navState.view === 'admin-users' && <UserManager onNavigate={handleNavigate} />}
        {navState.view === 'admin-audit' && <AuditLogsView onNavigate={handleNavigate} />}
        {navState.view === 'admin-questions-analytics' && (
          <QuestionAnalyticsView onNavigate={handleNavigate} />
        )}
      </main>

      {/* Global Observability & Dev Debug Panel */}
      <SyncDebugPanel />

      {/* Global Footer */}
      <footer className="border-t border-[#e8dfd5] bg-white py-6 text-center text-xs text-[#8a7465] font-mono">
        ApexAssess Platform v2.0 • Enterprise Assessment Engine • Server-Authoritative Timing
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
