import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasPersistedAuthSession } from '../../utils/authSession';

type ProtectedRouteProps = {
  children: ReactElement;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const isAuthenticated = hasPersistedAuthSession();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
