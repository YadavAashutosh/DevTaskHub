import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks';

interface ProtectedRouteProps {
  requiredRole?: 'Admin' | 'Developer' | 'ProjectManager';
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredRole,
  redirectTo = '/login',
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 1. Session restore in flight -> show clean loader
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        Restoring secure session...
      </div>
    );
  }

  // 2. Not authenticated -> Redirect to /login with target location preserved in state
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 3. Role-Based Access Control (RBAC) check
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // 4. Authorized -> Render nested route
  return <Outlet />;
};