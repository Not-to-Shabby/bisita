
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { ArrowLeft, Mail, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, loginWithFacebook, isAuthenticated, isLoading, error, clearError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get redirect destination
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/home';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Clear errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const success = await login(email, password);
    
    if (success) {
      navigate(from, { replace: true });
    }
    
    setIsSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setForgotMessage('');
    
    const response = await authApi.forgotPassword(forgotEmail);
    
    if (response.error) {
      setForgotMessage(response.error);
    } else {
      setForgotMessage('Password reset link has been sent to your email!');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotMessage('');
        setForgotEmail('');
      }, 3000);
    }
    
    setIsSubmitting(false);
  };

  const handleBackClick = () => {
    if (showForgotPassword) {
      setShowForgotPassword(false);
      setForgotMessage('');
    } else {
      navigate('/');
    }
  };

  const handleBackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBackClick();
    }
  };

  // Forgot Password Modal
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-white p-6 pt-20 animate-fade-slide-up">
        <div className="absolute top-6 left-6">
          <button
            type="button"
            onClick={handleBackClick}
            onKeyDown={handleBackKeyDown}
            tabIndex={0}
            aria-label="Go back to login"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="flex flex-col items-center mb-10 mt-4">
          <Mail className="w-16 h-16 text-sky-600 mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
          <p className="text-slate-500 text-center mt-2">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleForgotPassword} className="flex flex-col gap-5">
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              id="forgot-email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          {forgotMessage && (
            <div className={`p-4 rounded-xl ${forgotMessage.includes('sent') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {forgotMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-sky-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 pt-20 animate-fade-slide-up">
      <div className="absolute top-6 left-6">
        <button
          type="button"
          onClick={handleBackClick}
          onKeyDown={handleBackKeyDown}
          tabIndex={0}
          aria-label="Go back"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="flex flex-col items-center mb-10 mt-4 animate-fade-slide-up motion-delay-200">
        <h2 className="text-2xl font-bold text-slate-900">Bisita Iligan</h2>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 mb-2 animate-fade-slide-up motion-delay-300">Welcome Back!</h1>
      <p className="text-slate-500 mb-8 animate-fade-slide-up motion-delay-400">Log in to continue your journey in Iligan.</p>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 text-red-700 rounded-xl animate-fade-slide-up">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form className="flex flex-col gap-5 animate-fade-slide-up motion-delay-500" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
            Email or Username
          </label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            className="w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>

        <div className="flex justify-end">
          <button 
            type="button" 
            onClick={() => setShowForgotPassword(true)}
            className="text-sky-600 font-medium text-sm hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="w-full bg-sky-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-sky-700 transition-colors mt-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting || isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      {/* OAuth Divider */}
      <div className="flex items-center gap-4 my-6 animate-fade-slide-up motion-delay-600">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-slate-400 text-sm">or continue with</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* OAuth Buttons */}
      <div className="flex gap-4 animate-fade-slide-up motion-delay-600">
        <button
          type="button"
          onClick={loginWithGoogle}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          aria-label="Continue with Google"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-slate-700 font-medium">Google</span>
        </button>

        <button
          type="button"
          onClick={loginWithFacebook}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          aria-label="Continue with Facebook"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="text-slate-700 font-medium">Facebook</span>
        </button>
      </div>

      <div className="mt-auto pt-10 text-center animate-fade-slide-up motion-delay-700">
        <span className="text-slate-500">Don't have an account? </span>
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="text-sky-600 font-bold hover:underline"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default Login;
