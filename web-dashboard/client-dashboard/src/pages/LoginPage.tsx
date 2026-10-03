import React, { useState } from 'react';
import { Mail, Key, LogIn, UserPlus, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const endpoint = isSignUp ? '/api/v1/auth/register' : '/api/v1/auth/login';
      const body = isSignUp ? { email, password, name: name || 'Parent Account' } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const token = data.token || data.user?.token;
        if (token) {
          localStorage.setItem('childcare_auth_token', token);
        }
        onLoginSuccess({ ...(data.user || { email, name: name || 'Parent User' }), token });
      } else {
        setErrorMessage(data.message || 'Invalid credentials. Please check your email and password.');
      }
    } catch (err) {
      setErrorMessage('Failed to connect to authentication server. Please check your network.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 bg-slate-950 overflow-hidden font-sans">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center scale-105 filter blur-xs brightness-50 opacity-60"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1920&q=80')`
        }}
      />
      
      {/* Sleek Dark Indigo Background Tint Mask (App Design System Theme) */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-indigo-950/80 to-slate-950/95 backdrop-blur-xs" />

      {/* Main Center Auth Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-100/30 space-y-6">
        
        {/* Logo & Brand Header (ChildCare Theme) */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {/* ChildCare Brand Logo Shield */}
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="text-left leading-tight">
              <span className="block font-black text-2xl text-slate-900 tracking-tight">ChildCare</span>
              <span className="block text-[10px] font-bold text-indigo-600 tracking-widest uppercase">PARENTAL SAFETY & PROTECTION</span>
            </div>
          </div>

          <div className="pt-2">
            <h2 className="text-lg font-bold text-slate-800">
              {isSignUp ? 'Create ChildCare Account' : 'Welcome to ChildCare'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isSignUp ? 'Sign up to pair and protect your child’s device' : 'Login to access your dashboard'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required={isSignUp}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Remember Me Checkbox */}
          {!isSignUp && (
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600 font-medium">Remember me?</span>
              </label>
            </div>
          )}

          {/* Primary Action Button (Indigo Theme) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-full shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-70"
          >
            {isLoading ? (
              <span className="inline-block animate-spin text-white">⏳</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{isSignUp ? 'Create Account' : 'Login'}</span>
              </>
            )}
          </button>
        </form>

        {/* Secondary Links & Sign Up Trigger */}
        <div className="text-center space-y-4 pt-2 border-t border-slate-100">
          
          {!isSignUp && (
            <div className="text-xs text-indigo-600 font-semibold space-x-1">
              <button type="button" className="hover:underline">Need help in Sign-In?</button>
              <span>|</span>
              <button type="button" className="hover:underline">Resend Verification Link</button>
            </div>
          )}

          {/* Switch to Sign Up / Sign In Toggle Button */}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-full shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <span>{isSignUp ? 'Already have an account? Sign In ➔' : 'Sign Up ➔'}</span>
          </button>

          {/* Bottom Footer Links */}
          <div className="pt-2 text-[11px] text-slate-500 font-medium space-x-2">
            <a href="#" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 font-semibold">
              Visit Website <ExternalLink className="w-3 h-3" />
            </a>
            <span>|</span>
            <button type="button" className="text-indigo-600 hover:underline font-semibold">Forget Password ?</button>
          </div>

          <div className="text-[10px] text-slate-400 pt-1">
            2026 © <strong className="text-slate-700">ChildCare</strong>. All rights reserved.
          </div>

        </div>

      </div>
    </div>
  );
};
