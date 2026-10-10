import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RecruiterRoute({ children }) {
  const { user } = useAuth();

  if (user && user.role !== 'recruiter') {
    // Candidates visiting recruiter-only routes stay on candidate execution hub
    return <Navigate to="/candidates" replace />;
  }

  return children;
}
