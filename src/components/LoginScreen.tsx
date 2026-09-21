import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { UserRole } from '../types';
import { 
  verifyAdminPin, 
  verifyUserPin, 
  getStoredOperatorName,
  DEFAULT_ADMIN_PIN,
  DEFAULT_USER_PIN,
  ALT_ADMIN_PIN
} from '../utils/authRoles';

interface LoginScreenProps {
  onLogin: (role: UserRole, operatorName?: string) => void;
  logoutReason?: 'idle' | 'manual' | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  logoutReason,
}) => {
  const [username, setUsername] = useState(() => getStoredOperatorName() || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setError('Please enter user name.');
      return;
    }

    if (!cleanPass) {
      setError('Please enter password.');
      return;
    }

    setIsSubmitting(true);

    // Verify Admin credentials
    if (
      verifyAdminPin(cleanPass) || 
      cleanPass === DEFAULT_ADMIN_PIN || 
      cleanPass === ALT_ADMIN_PIN
    ) {
      onLogin('admin', cleanUser || 'Admin');
      return;
    }

    // Verify User credentials
    if (
      verifyUserPin(cleanPass) || 
      cleanPass === DEFAULT_USER_PIN
    ) {
      onLogin('user', cleanUser || 'User');
      return;
    }

    setIsSubmitting(false);
    setError('Incorrect user name or password.');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800 font-sans">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 mb-3">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Stock & Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to continue
          </p>
        </div>

        {/* Status notice if timed out or logged out */}
        {logoutReason === 'idle' && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs text-center">
            Session timed out due to inactivity. Please sign in again.
          </div>
        )}
        {logoutReason === 'manual' && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs text-center">
            You have logged out successfully.
          </div>
        )}

        {/* Simple Login Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="input-username">
                User Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="input-username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter User Name"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                  autoFocus
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="input-password">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="input-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter Password"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-submit-login"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition cursor-pointer mt-2"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
