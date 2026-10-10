import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Screening from './pages/Screening';
import Candidates from './pages/Candidates';
import Compare from './pages/Compare';
import Insights from './pages/Insights';
import FindJobs from './pages/FindJobs';
import JobRequisitions from './pages/JobRequisitions';
import ProctoredExam from './pages/ProctoredExam';
import SwarmDashboard from './pages/SwarmDashboard';
import Settings from './pages/Settings';
import AuthPage from './pages/AuthPage';
import ProtectedRoute from './components/ProtectedRoute';
import RecruiterRoute from './components/RecruiterRoute';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Login & Register Route */}
        <Route path="/login" element={<AuthPage />} />

        {/* Protected Console Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Screening />} />
          
          {/* Candidate & Recruiter Execution Hub */}
          <Route path="candidates" element={<Candidates />} />
          
          {/* Recruiter Only Console Features */}
          <Route path="compare" element={<RecruiterRoute><Compare /></RecruiterRoute>} />
          <Route path="insights" element={<RecruiterRoute><Insights /></RecruiterRoute>} />
          <Route path="job-requisitions" element={<RecruiterRoute><JobRequisitions /></RecruiterRoute>} />
          
          {/* Features Accessible to Candidates */}
          <Route path="find-jobs" element={<FindJobs />} />
          <Route path="exam" element={<ProctoredExam />} />
          <Route path="swarm" element={<SwarmDashboard />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}





