import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import FloatingInstall from './components/FloatingInstall';
import Landing from './pages/Landing';
import Exam from './pages/Exam';
import Leaderboard from './pages/Leaderboard';
import Checkin from './pages/Checkin';
import StudentEnroll from './pages/StudentEnroll';
import Dashboard from './pages/admin/Dashboard';
import CreateExam from './pages/admin/CreateExam';
import Results from './pages/admin/Results';
import Answers from './pages/admin/Answers';
import Preview from './pages/admin/Preview';
import Regrade from './pages/admin/Regrade';
import QuestionBank from './pages/admin/QuestionBank';
import ActivityLog from './pages/admin/ActivityLog';
import Proctor from './pages/admin/Proctor';
import Classes from './pages/admin/Classes';
import StudentRecords from './pages/StudentRecords';
import Notifications from './pages/Notifications';
import AdminNotifications from './pages/admin/Notifications';

export default function App() {
  return (
    <ToastProvider>
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
      </Routes>
      <FloatingInstall />
    </ToastProvider>
  );
}
