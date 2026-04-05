import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, User, UserPlus, AlertCircle } from 'lucide-react';
import { playSound } from '../utils/sounds';

export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const [mode, setMode] = useState<'loading' | 'setup' | 'login'>('loading');
  const [bootTime, setBootTime] = useState<string>('Calculating boot metrics...');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const initializeSystem = async () => {
      // 1. Fetch Boot Time
      try {
        const res = await fetch('/api/system/boot');
        const data = await res.json();
        setBootTime(data.bootTime || 'System Booted in: Unknown');
      } catch (e) {
        setBootTime('System Booted in: Unknown (Offline)');
      }

      // 2. Check Auth Status
      try {
        const res = await fetch('/api/system/auth/status');
        const data = await res.json();
        if (data.isSetup) {
          setUsername(data.username);
          setMode('login');
        } else {
          setMode('setup');
        }
      } catch (e) {
        setMode('setup');
      }
    };

    initializeSystem();
  }, []);

  const handleComplete = () => {
    playSound('startup');
    onComplete();
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) return setError('All fields are required');
    if (password !== confirmPassword) return setError('Passwords do not match');
    
    setIsAuthenticating(true);
    try {
      const res = await fetch('/api/system/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (res.ok) {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        setError(data.error || 'Setup failed');
      }
    } catch (e) {
      setError('Network error');
    }
    setIsAuthenticating(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) return;
    
    setIsAuthenticating(true);
    try {
      const res = await fetch('/api/system/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (res.ok) {
        handleComplete();
      } else {
        setError('Incorrect password');
        setPassword('');
      }
    } catch (e) {
      setError('Network error');
    }
    setIsAuthenticating(false);
  };

  if (mode === 'loading') {
    return <div className="fixed inset-0 z-[100] bg-gray-950" />;
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-blue-950 text-white overflow-hidden">
      {/* Glassmorphism background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center z-10 w-full max-w-sm px-4"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2 drop-shadow-2xl bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
          Arcadegamer254 os
        </h1>
        
        <div className="flex items-center space-x-3 mb-8">
          <div className="h-[1px] w-8 bg-white/30" />
          <p className="text-sm font-medium text-blue-200/80 uppercase tracking-widest">
            made by arcadegamer254
          </p>
          <div className="h-[1px] w-8 bg-white/30" />
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-black/20 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-xl mb-8 text-center w-full"
        >
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-semibold">System Metrics</p>
          <p className="text-sm font-mono text-green-400">{bootTime}</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'setup' ? (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-gradient-to-tr from-green-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg mb-4 border-4 border-white/10">
                <UserPlus className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-xl font-semibold mb-2">Create Account</h2>
              <p className="text-xs text-gray-400 mb-6 text-center">Set up your primary user account for Arcadegamer254 os.</p>

              {error && (
                <div className="w-full bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg mb-4 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSetup} className="w-full space-y-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  autoFocus
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mt-2"
                >
                  {isAuthenticating ? 'Creating...' : 'Create Account'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full flex flex-col items-center"
            >
              <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg mb-4 border-4 border-white/10">
                <User className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-2xl font-semibold mb-6">{username}</h2>

              {error && (
                <div className="w-full bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg mb-4 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="w-full relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoFocus
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!password || isAuthenticating}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isAuthenticating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
