import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { AlertCircle, Check } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle, loginWithFacebook, isAuthenticated, isLoading, error, clearError } = useAuth();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // Password validation
  const passwordRequirements = [
    { test: password.length >= 8, label: 'At least 8 characters' },
    { test: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { test: /[a-z]/.test(password), label: 'One lowercase letter' },
    { test: /[0-9]/.test(password), label: 'One number' },
  ];

  const isPasswordValid = passwordRequirements.every((req) => req.test);
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: string[] = [];
    
    if (!username.trim()) {
      errors.push('Username is required');
    } else if (username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }
    
    if (!email.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (!isPasswordValid) {
      errors.push('Password does not meet requirements');
    }
    
    if (!doPasswordsMatch) {
      errors.push('Passwords do not match');
    }
    
    if (!agreedToTerms) {
      errors.push('You must agree to the Terms of Service');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors([]);
    setIsSubmitting(true);
    
    const success = await register(email, password, username);
    
    if (success) {
      navigate('/home', { replace: true });
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header showBack title="Create Account" />
      <div className="p-6 pt-20 animate-fade-slide-up">
        {/* Error display */}
        {(error || validationErrors.length > 0) && (
          <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 text-red-700 rounded-xl animate-fade-slide-up">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              {error && <p>{error}</p>}
              {validationErrors.map((err, index) => (
                <p key={index}>{err}</p>
              ))}
            </div>
          </div>
        )}

        <form className="flex flex-col gap-5 animate-fade-slide-up motion-delay-200" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              minLength={3}
              className="w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 outline-none focus:ring-2 focus:ring-sky-500"
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
              placeholder="Create a password"
              required
              className="w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 outline-none focus:ring-2 focus:ring-sky-500"
            />
            {/* Password requirements */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 text-xs ${req.test ? 'text-green-600' : 'text-slate-400'}`}
                  >
                    <Check className={`w-3 h-3 ${req.test ? 'opacity-100' : 'opacity-30'}`} />
                    <span>{req.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              className={`w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 ${
                confirmPassword.length > 0 && !doPasswordsMatch ? 'ring-2 ring-red-300' : ''
              }`}
            />
            {confirmPassword.length > 0 && !doPasswordsMatch && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <div className="flex items-start gap-3 mt-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
            />
            <label htmlFor="terms" className="text-sm text-slate-500">
              I agree to the{' '}
              <button type="button" className="text-sky-600 hover:underline">
                Terms of Service
              </button>{' '}
              and{' '}
              <button type="button" className="text-sky-600 hover:underline">
                Privacy Policy
              </button>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full bg-sky-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-sky-700 transition-colors mt-4 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* OAuth Divider */}
        <div className="flex items-center gap-4 my-6 animate-fade-slide-up motion-delay-300">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-slate-400 text-sm">or sign up with</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* OAuth Buttons */}
        <div className="flex gap-4 animate-fade-slide-up motion-delay-300">
          <button
            type="button"
            onClick={loginWithGoogle}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            aria-label="Sign up with Google"
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
            aria-label="Sign up with Facebook"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span className="text-slate-700 font-medium">Facebook</span>
          </button>
        </div>

        <div className="mt-8 text-center pb-8 animate-fade-slide-up motion-delay-400">
          <span className="text-slate-500">Already have an account? </span>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sky-600 font-bold hover:underline"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;