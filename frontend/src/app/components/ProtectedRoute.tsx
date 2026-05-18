import { Navigate } from 'react-router';
import { getCurrentUser } from '../services/apiClient';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const usuario = getCurrentUser();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
