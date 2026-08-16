import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
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

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [viewParams, setViewParams] = useState<any>({});

  const handleNavigate = (view: string, params: any = {}) => {
    setCurrentView(view);
    setViewParams(params);
    window.scrollTo(0, 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading ApexAssess Engine...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Active Assessment screen is full-screen without distracting top nav
  if (currentView === 'assessment' && viewParams.attemptId) {
    return (
      <ActiveAssessment
        attemptId={viewParams.attemptId}
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      <main className="flex-1 pb-16">
        {currentView === 'dashboard' && <StudentDashboard onNavigate={handleNavigate} />}
        {currentView === 'catalog' && <QuizCatalog onNavigate={handleNavigate} />}
        {currentView === 'quiz-detail' && (
          <QuizDetail quizId={viewParams.quizId} onNavigate={handleNavigate} />
        )}
        {currentView === 'result' && (
          <ResultView
            attemptId={viewParams.attemptId}
            resultId={viewParams.resultId}
            onNavigate={handleNavigate}
          />
        )}
        {currentView === 'history' && <AttemptHistory onNavigate={handleNavigate} />}
        {currentView === 'leaderboard' && <LeaderboardView />}
        {currentView === 'certificates' && <CertificatesView />}

        {/* Admin Views */}
        {currentView === 'admin-dashboard' && <AdminDashboard onNavigate={handleNavigate} />}
        {currentView === 'admin-quizzes' && <QuizManager onNavigate={handleNavigate} />}
        {currentView === 'admin-questions' && (
          <QuestionBank
            quizId={viewParams.quizId}
            quizTitle={viewParams.quizTitle}
            onNavigate={handleNavigate}
          />
        )}
        {currentView === 'admin-categories' && <CategoryManager onNavigate={handleNavigate} />}
        {currentView === 'admin-users' && <UserManager onNavigate={handleNavigate} />}
        {currentView === 'admin-audit' && <AuditLogsView onNavigate={handleNavigate} />}
        {currentView === 'admin-questions-analytics' && (
          <QuestionAnalyticsView onNavigate={handleNavigate} />
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600 font-mono">
        ApexAssess Platform v2.0 • Production Assessment Engine • Server-Authoritative Grading
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
