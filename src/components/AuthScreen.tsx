'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Key,
  User,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  KeyRound,
  Wifi,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import {
  loginWithCredentials,
  loginWithPin,
  unlockApp,
  registerUser,
  checkBruteForceLockout,
} from '../lib/auth';
import { AppUser, AuthSession } from '../lib/types';

interface AuthScreenProps {
  onSuccess: (session: AuthSession) => void;
  isLockedMode?: boolean;
  currentUser?: AppUser | null;
  onFullLogout?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  isLockedMode = false,
  currentUser = null,
  onFullLogout,
}) => {
  const [mode, setMode] = useState<'PASSWORD' | 'PIN' | 'REGISTER'>(
    isLockedMode ? (currentUser?.pin ? 'PIN' : 'PASSWORD') : 'PASSWORD'
  );

  // Form states
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [pin, setPin] = useState(isLockedMode && currentUser?.pin ? currentUser.pin : '1234');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form states
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPin, setRegPin] = useState('');

  // Status & Lockout states
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);

  // Online / Offline listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Check brute-force lockout
  useEffect(() => {
    const checkLock = () => {
      const lock = checkBruteForceLockout();
      if (lock.locked) {
        setLockoutCountdown(lock.remainingSeconds);
      } else {
        setLockoutCountdown(0);
      }
    };

    checkLock();
    const interval = setInterval(checkLock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Standard Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginWithCredentials(identifier, password, rememberMe);
      if (res.success && res.session) {
        onSuccess(res.session);
      } else {
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Login error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Quick PIN Login
  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginWithPin(pin, rememberMe);
      if (res.success && res.session) {
        onSuccess(res.session);
      } else {
        setError(res.error || 'Invalid Security PIN.');
      }
    } catch (err: any) {
      setError(err?.message || 'PIN login error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Screen Unlock (Lock mode)
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const credential = mode === 'PIN' ? pin : password;
      const res = await unlockApp(credential);
      if (res.success) {
        if (currentUser) {
          onSuccess({
            token: `token-${Date.now()}`,
            user: currentUser,
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
            isLocked: false,
          });
        }
      } else {
        setError(res.error || 'Incorrect security unlock key.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unlock error.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle New Account Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (!regUsername || !regEmail || !regPassword) {
        setError('Please fill in all required fields.');
        setIsLoading(false);
        return;
      }

      const res = await registerUser({
        username: regUsername,
        name: regName || regUsername,
        email: regEmail,
        password: regPassword,
        pin: regPin || undefined,
        role: 'ADMIN',
      });

      if (res.success && res.user) {
        setSuccessMsg('Account created successfully! You can now log in.');
        setIdentifier(regUsername);
        setPassword(regPassword);
        setMode('PASSWORD');
      } else {
        setError(res.error || 'Registration failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const autoFillDemo = () => {
    setIdentifier('admin');
    setPassword('admin');
    setPin('1234');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl overflow-y-auto">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 shadow-xl shadow-emerald-500/30 text-white mb-3 ring-4 ring-emerald-500/20">
            {isLockedMode ? <Lock className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isLockedMode ? 'App Screen Locked' : 'Velora CashBook Pro'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isLockedMode
              ? `Welcome back, ${currentUser?.name || 'Owner'}. Enter PIN or password to unlock.`
              : 'Enter your credentials to access business accounts & ledgers'}
          </p>

          {/* Connection Status Pill */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                isOnline
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" /> Cloud Sync Active
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-rose-400" /> Offline Local Vault (Secured)
                </>
              )}
            </span>
          </div>
        </div>

        {/* Lockout Warning */}
        {lockoutCountdown > 0 && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center gap-3 text-rose-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold">Security Protection Active</p>
              <p>Too many failed attempts. Cooldown: {lockoutCountdown} seconds remaining.</p>
            </div>
          </div>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Switch Mode Tabs (if not locked) */}
        {!isLockedMode && (
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-2xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('PASSWORD');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'PASSWORD'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('PIN');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'PIN'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Quick PIN</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'REGISTER'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        )}

        {/* MODE 1: PASSWORD LOGIN */}
        {mode === 'PASSWORD' && (
          <form onSubmit={isLockedMode ? handleUnlock : handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin or admin@velora.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white text-sm outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white text-sm outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>Remember this session</span>
              </label>
              <button
                type="button"
                onClick={autoFillDemo}
                className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Sparkles className="w-3 h-3" /> Auto-fill Demo
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || lockoutCountdown > 0}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Verifying Security...</span>
              ) : isLockedMode ? (
                <>
                  <Unlock className="w-4 h-4" /> Unlock Dashboard
                </>
              ) : (
                <>
                  <span>Sign In Securely</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE 2: QUICK PIN LOGIN */}
        {mode === 'PIN' && (
          <form onSubmit={isLockedMode ? handleUnlock : handlePinLogin} className="space-y-5">
            <div className="text-center">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Enter 4-Digit Security PIN
              </label>
              <input
                type="password"
                maxLength={6}
                autoFocus
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-44 mx-auto text-center tracking-[0.5em] text-2xl font-black py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 text-emerald-400 outline-none transition"
              />
              <p className="text-[11px] text-slate-500 mt-2">Default PIN: 1234 (Fast counter switch)</p>
            </div>

            {/* Quick Numpad / Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => pin.length < 6 && setPin((prev) => prev + num)}
                  className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-base border border-slate-800 active:scale-95 transition cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-rose-400 font-bold text-xs border border-slate-800 transition cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => pin.length < 6 && setPin((prev) => prev + '0')}
                className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-base border border-slate-800 active:scale-95 transition cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setPin((prev) => prev.slice(0, -1))}
                className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 font-bold text-xs border border-slate-800 transition cursor-pointer"
              >
                ⌫
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || lockoutCountdown > 0 || !pin}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Validating PIN...</span>
              ) : isLockedMode ? (
                <>
                  <Unlock className="w-4 h-4" /> Unlock Dashboard
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Login with PIN
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE 3: REGISTER NEW ADMIN / USER */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name / Business Title
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Factory Manager"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Username (Single Word)
              </label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="e.g. manager"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="manager@velora.com"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 4 chars"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Quick PIN (Optional)</label>
                <input
                  type="password"
                  maxLength={6}
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value)}
                  placeholder="e.g. 5566"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition cursor-pointer"
            >
              {isLoading ? 'Creating Account...' : 'Create & Register Account'}
            </button>
          </form>
        )}

        {/* Locked Mode Logout Option */}
        {isLockedMode && onFullLogout && (
          <div className="mt-4 pt-4 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onFullLogout}
              className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" /> Switch User / Log Out Completely
            </button>
          </div>
        )}

        {/* Footer Security Badges */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit SHA Encrypted Vault</span>
          </div>
          <div>v1.0 Pro</div>
        </div>
      </div>
    </div>
  );
};
