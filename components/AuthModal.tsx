import React, { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const { login, signup } = useAuth();

  // Calculate password strength
  useEffect(() => {
    if (password.length === 0) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    setPasswordStrength(Math.min(strength, 4));
  }, [password]);

  // Validate form fields
  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    if (username.trim().length > 20) {
      errors.username = 'Username must be less than 20 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (mode === 'signup') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
      
      if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      if (password.length > 100) {
        errors.password = 'Password is too long';
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    } else {
      if (password.length === 0) {
        errors.password = 'Password is required';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0: return 'bg-zinc-700';
      case 1: return 'bg-red-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-emerald-500';
      default: return 'bg-zinc-700';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0: return '';
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      default: return '';
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(username, password, rememberMe);
        // Reset form on success
        setUsername('');
        setPassword('');
        onClose();
      } else {
        await signup(username, email, password, rememberMe);
        // Reset form on success
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        onClose();
      }
    } catch (err: any) {
      // Display user-friendly error messages
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setValidationErrors({});
    // Clear form fields when switching modes
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordStrength(0);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-zinc-900/90 backdrop-blur-md rounded-2xl w-full max-w-md border border-zinc-800 shadow-2xl overflow-hidden transform transition-all scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Username */}
          <div className="space-y-1">
            <label htmlFor="username" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Username
            </label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={`w-full bg-zinc-950/50 border rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all ${
                  validationErrors.username ? 'border-red-500/50' : 'border-zinc-800'
                }`}
                placeholder="Enter your username"
              />
            </div>
            {validationErrors.username && (
              <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle size={12} />
                {validationErrors.username}
              </p>
            )}
          </div>

          {/* Email (signup only) */}
          {mode === 'signup' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <label htmlFor="email" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full bg-zinc-950/50 border rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all ${
                    validationErrors.email ? 'border-red-500/50' : 'border-zinc-800'
                  }`}
                  placeholder="name@example.com"
                />
              </div>
              {validationErrors.email && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                  <AlertCircle size={12} />
                  {validationErrors.email}
                </p>
              )}
            </div>
          )}

          {/* Password */}
          <div className="space-y-1">
            <label htmlFor="password" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={`w-full bg-zinc-950/50 border rounded-lg pl-10 pr-10 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all ${
                  validationErrors.password ? 'border-red-500/50' : 'border-zinc-800'
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle size={12} />
                {validationErrors.password}
              </p>
            )}
            {mode === 'signup' && password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordStrength >= level ? getPasswordStrengthColor() : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs flex items-center gap-1 ${
                  passwordStrength >= 3 ? 'text-emerald-400' : 'text-zinc-500'
                }`}>
                  {passwordStrength >= 3 ? <CheckCircle2 size={12} /> : <Shield size={12} />}
                  {getPasswordStrengthText() && `Strength: ${getPasswordStrengthText()}`}
                  {!getPasswordStrengthText() && 'Enter a password'}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password (signup only) */}
          {mode === 'signup' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`w-full bg-zinc-950/50 border rounded-lg pl-10 pr-10 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all ${
                    validationErrors.confirmPassword ? 'border-red-500/50' : 'border-zinc-800'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                  <AlertCircle size={12} />
                  {validationErrors.confirmPassword}
                </p>
              )}
              {confirmPassword.length > 0 && password === confirmPassword && (
                <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                  <CheckCircle2 size={12} />
                  Passwords match
                </p>
              )}
            </div>
          )}

          {/* Remember Me (login only) */}
          {mode === 'login' && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors select-none">
                  Remember me for 30 days
                </span>
              </label>
              <button
                type="button"
                className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                onClick={() => {
                  alert('Password reset feature coming soon! Please contact support if you need assistance.');
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Processing...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Log In' : 'Create Account'}</span>
            )}
          </button>

          {/* Switch Mode */}
          <div className="text-center pt-2">
            <p className="text-zinc-400 text-sm">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={switchMode}
                className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline transition-colors"
              >
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
