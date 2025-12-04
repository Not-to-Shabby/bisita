import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';

// ======================
// TYPES
// ======================

interface PrivateRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  requireEmailVerified?: boolean;
}

// ======================
// LOADING SPINNER
// ======================

const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
      <p className="text-slate-600 animate-pulse">Loading...</p>
    </div>
  </div>
);

// ======================
// PRIVATE ROUTE COMPONENT
// ======================

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  roles,
  requireEmailVerified = false,
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check email verification if required
  if (requireEmailVerified && !user.isEmailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Email Verification Required
          </h2>
          <p className="text-slate-600 mb-6">
            Please verify your email address to access this feature. Check your inbox for the verification link.
          </p>
          <button
            type="button"
            className="w-full py-3 px-4 bg-sky-600 text-white font-medium rounded-xl hover:bg-sky-700 transition-colors"
            onClick={() => window.location.reload()}
            aria-label="Check verification status"
          >
            I've verified my email
          </button>
        </div>
      </div>
    );
  }

  // Check role permissions
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Access Denied
          </h2>
          <p className="text-slate-600 mb-6">
            You don't have permission to access this page. This area is restricted to{' '}
            {roles.join(', ')} users.
          </p>
          <button
            type="button"
            className="w-full py-3 px-4 bg-sky-600 text-white font-medium rounded-xl hover:bg-sky-700 transition-colors"
            onClick={() => window.history.back()}
            aria-label="Go back to previous page"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PrivateRoute;
