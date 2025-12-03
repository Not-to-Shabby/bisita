
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { ArrowLeft } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-white p-6 pt-20">
      <div className="absolute top-6 left-6">
        <button onClick={() => navigate('/')}>
            <ArrowLeft size={24} />
        </button>
      </div>

      <div className="flex flex-col items-center mb-10 mt-4">
        <h2 className="text-2xl font-bold text-slate-900">Bisita Iligan</h2>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back!</h1>
      <p className="text-slate-500 mb-8">Log in to continue your journey in Iligan.</p>

      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); navigate('/home'); }}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Email or Username</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>

        <div className="flex justify-end">
          <button 
            type="button" 
            onClick={() => alert("Password reset link has been sent to your email!")}
            className="text-sky-600 font-medium text-sm hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-sky-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-sky-700 transition-colors mt-2"
        >
          Log In
        </button>
      </form>

      <div className="mt-auto pt-10 text-center">
        <span className="text-slate-500">Don't have an account? </span>
        <button onClick={() => navigate('/register')} className="text-sky-600 font-bold">Sign Up</button>
      </div>
    </div>
  );
};

export default Login;
