import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider, Spinner } from './components/ui';
import FloatingInstall from './components/FloatingInstall';
import ErrorBoundary from './components/ErrorBoundary';
import Landing from './pages/Landing';
const Exam = lazy(() => import('./pages/Exam'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Checkin = lazy(() => import('./pages/Checkin'));
const StudentEnroll = lazy(() => import('./pages/StudentEnroll'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const CreateExam = lazy(() => import('./pages/admin/CreateExam'));
const Results = lazy(() => import('./pages/admin/Results'));
const Answers = lazy(() => import('./pages/admin/Answers'));
const Preview = lazy(() => import('./pages/admin/Preview'));
const Regrade = lazy(() => import('./pages/admin/Regrade'));
const QuestionBank = lazy(() => import('./pages/admin/QuestionBank'));
const ActivityLog = lazy(() => import('./pages/admin/ActivityLog'));
const Proctor = lazy(() => import('./pages/admin/Proctor'));
const Classes = lazy(() => import('./pages/admin/Classes'));
const StudentRecords = lazy(() => import('./pages/StudentRecords'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));
const Templates = lazy(() => import('./pages/admin/Templates'));

export default function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner /></div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/enroll" element={<StudentEnroll />} />
          <Route path="/records" element={<StudentRecords />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/create" element={<CreateExam />} />
          <Route path="/admin/results" element={<Results />} />
          <Route path="/admin/answers" element={<Answers />} />
          <Route path="/admin/preview" element={<Preview />} />
          <Route path="/admin/regrade" element={<Regrade />} />
          <Route path="/admin/bank" element={<QuestionBank />} />
          <Route path="/admin/logs" element={<ActivityLog />} />
          <Route path="/admin/proctor" element={<Proctor />} />
          <Route path="/admin/classes" element={<Classes />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/templates" element={<Templates />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
      <FloatingInstall />
    </ToastProvider>
  );
}
