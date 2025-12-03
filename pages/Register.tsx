import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const Register: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Header showBack title="Create Account" />
      <div className="p-6 pt-20">
        <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); navigate('/home'); }}>
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
            <input
                type="text"
                placeholder="Choose a username"
                className="w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 outline-none"
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <input
                type="email"
                placeholder="Enter your email"
                className="w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 outline-none"
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input
                type="password"
                placeholder="Create a password"
                className="w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 outline-none"
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
            <input
                type="password"
                placeholder="Re-enter your password"
                className="w-full bg-gray-100 border-none rounded-xl p-4 text-slate-900 outline-none"
            />
            </div>

            <div className="flex items-start gap-3 mt-2">
                <input type="checkbox" id="terms" className="mt-1 w-5 h-5 text-sky-600 rounded focus:ring-sky-500" />
                <label htmlFor="terms" className="text-sm text-slate-500">
                    I agree to the <span className="text-sky-600">Terms of Service</span> and <span className="text-sky-600">Privacy Policy</span>
                </label>
            </div>

            <button
            type="submit"
            className="w-full bg-sky-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-sky-700 transition-colors mt-4"
            >
            Create Account
            </button>
        </form>

        <div className="mt-8 text-center pb-8">
            <span className="text-slate-500">Already have an account? </span>
            <button onClick={() => navigate('/login')} className="text-sky-600 font-bold">Sign In</button>
        </div>
      </div>
    </div>
  );
};

export default Register;