import { Navigate } from 'react-router';
import { useAuth } from './AuthContext';
import LoadingSpinner from './LoadingSpinner';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!usuario) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
