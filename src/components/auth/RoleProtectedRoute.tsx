import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  getDefaultHomeRouteForRole,
  hasPersistedAuthSession,
  resolvePersistedDefaultRole,
  type AppAccountRole,
} from '../../utils/authSession';

type RoleProtectedRouteProps = {
  children: ReactElement;
  allowedRoles: AppAccountRole[];
};

const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const location = useLocation();

  if (!hasPersistedAuthSession()) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  const currentRole = resolvePersistedDefaultRole();
  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to={getDefaultHomeRouteForRole(currentRole)} replace />;
  }

  return children;
};

export default RoleProtectedRoute;
