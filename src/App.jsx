import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Exam from './pages/Exam';
import Leaderboard from './pages/Leaderboard';
import Dashboard from './pages/admin/Dashboard';
import CreateExam from './pages/admin/CreateExam';
import Results from './pages/admin/Results';
import Preview from './pages/admin/Preview';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/exam" element={<Exam />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/admin" element={<Dashboard />} />
      <Route path="/admin/create" element={<CreateExam />} />
      <Route path="/admin/results" element={<Results />} />
      <Route path="/admin/preview" element={<Preview />} />
    </Routes>
  );
}
