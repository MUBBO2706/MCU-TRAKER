import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldAlert,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Database,
  ChevronDown,
  ChevronUp,
  Server,
  Zap,
} from 'lucide-react';

interface AuthGatewayProps {
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  telegramConfigured: boolean | null;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (fullName: string, username: string, password: string) => Promise<void>;
  onBypass: () => void;
}

export function AuthGateway({
  authMode,
  setAuthMode,
  authError,
  setAuthError,
  telegramConfigured,
  onLogin,
  onRegister,
  onBypass,
}: AuthGatewayProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'register' && !fullName.trim()) {
      setAuthError('Full name is required for registration.');
      return;
    }
    if (!username.trim() || !password) {
      setAuthError('Please fill out all credentials.');
      return;
    }
    setIsSubmitting(true);
    setAuthError(null);
    try {
      if (authMode === 'login') {
        await onLogin(username, password);
      } else {
        await onRegister(fullName, username, password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col items-center justify-center p-4 relative overflow-y-auto selection:bg-marvel selection:text-white" style={{ minHeight: '100dvh' }}>
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-black to-neutral-950 pointer-events-none" />
      <div className="absolute top-10 right-10 w-64 h-64 bg-marvel/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md bg-neutral-950 border border-neutral-850 rounded-2xl p-6 md:p-8 shadow-2xl relative z-10 space-y-6 text-left animate-scaleUp"
      >
        {/* Emblem Shield Banner */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-neutral-950 border border-neutral-850 flex items-center justify-center text-marvel shadow-inner">
            <Shield className="w-7 h-7 text-marvel animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
              Welcome to MCU Hub
            </h1>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence>
            {authMode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5 overflow-hidden"
              >
                <label className="text-[10px] uppercase font-mono font-bold text-neutral-400">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-neutral-900 text-white text-xs border border-neutral-850 rounded-xl pl-9 pr-3 py-3 focus:border-marvel focus:outline-none transition-colors"
                    disabled={isSubmitting}
                    required={authMode === 'register'}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono font-bold text-neutral-400">
              Username
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-neutral-900 text-white text-xs border border-neutral-850 rounded-xl pl-9 pr-3 py-3 focus:border-marvel focus:outline-none transition-colors"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono font-bold text-neutral-400">
              Password
            </label>
            <div className="relative flex items-center">
              <KeyRound className="absolute left-3 w-4 h-4 text-neutral-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 4 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-900 text-white text-xs border border-neutral-850 rounded-xl pl-9 pr-10 py-3 focus:border-marvel focus:outline-none transition-colors"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-neutral-500 hover:text-neutral-300 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error messages block */}
          <AnimatePresence mode="wait">
            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl flex items-start gap-2 text-xs text-red-300"
              >
                <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{authError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Action - Clean and shadow-free */}
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-500 disabled:bg-neutral-900 disabled:text-neutral-500 text-white font-semibold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{authMode === 'login' ? 'Login' : 'Register'}</span>
            )}
          </button>
        </form>

        {/* Toggler */}
        <div className="flex justify-center text-xs text-neutral-400 border-t border-neutral-900/60 pt-4">
          {authMode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setAuthMode('register');
                  setAuthError(null);
                }}
                className="text-marvel font-bold hover:underline focus:outline-none cursor-pointer"
              >
                Register
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
                className="text-marvel font-bold hover:underline focus:outline-none cursor-pointer"
              >
                Login
              </button>
            </span>
          )}
        </div>

        {/* Configuration Notice (If not configured) */}
        {telegramConfigured === false && (
          <div className="border border-amber-500/20 bg-amber-500/5 p-4 rounded-2xl flex flex-col gap-3.5 mt-4">
            <div className="flex gap-2 text-amber-400 text-xs font-semibold leading-normal">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span>Database Connection Required</span>
                <p className="text-[10px] text-neutral-400 mt-1 font-normal font-sans">
                  The Private Cloud Storage is not yet configured. Set up your private storage credentials to enable persistent cloud-hosted database operations.
                </p>
              </div>
            </div>

            {/* Toggle Configuration Steps */}
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center justify-between text-[10px] text-amber-400 font-bold tracking-wider uppercase hover:text-amber-300 focus:outline-none cursor-pointer"
            >
              <span>Setup Guide Steps</span>
              {showInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showInstructions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-[10px] text-neutral-300 space-y-2 border-t border-amber-500/10 pt-2.5 leading-relaxed font-sans"
              >
                <div className="flex gap-2">
                  <span className="font-bold text-amber-500 font-mono">1.</span>
                  <span>Create a private cloud storage channel/repository.</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-amber-500 font-mono">2.</span>
                  <span>Generate a secure storage access token to connect with your database client.</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-amber-500 font-mono">3.</span>
                  <span>Add authorization permissions for your secure database access client with read/write capability.</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-amber-500 font-mono">4.</span>
                  <span>Obtain your private secure database reference ID.</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-amber-500 font-mono">5.</span>
                  <span>Input <code>STORAGE_ACCESS_TOKEN</code> and <code>STORAGE_CHAT_ID</code> inside your environment configuration.</span>
                </div>
              </motion.div>
            )}

            {/* Offline Bypass Option */}
            <button
              onClick={onBypass}
              className="w-full bg-neutral-900 border border-neutral-850 hover:border-neutral-700 hover:bg-neutral-850 text-white text-[11px] font-semibold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Bypass & Enter Sandbox Mode</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
