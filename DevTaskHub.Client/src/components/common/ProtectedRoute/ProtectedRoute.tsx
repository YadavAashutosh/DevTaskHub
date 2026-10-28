import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  requiredRole?: 'Admin' | 'Developer' | 'ProjectManager';
  userRole?: string;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isAuthenticated,
  requiredRole,
  userRole,
  redirectTo = '/login',
}) => {
  const location = useLocation();

  // 1. Agar user logged in nahi hai, toh login page par bhejein
  // saath me current location save kar rahe hain taaki login ke baad wapas yahi redirect ho sake
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 2. Agar specific role required hai aur user ka role match nahi karta
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // 3. User authenticated aur authorized hai
  return <Outlet />;
};