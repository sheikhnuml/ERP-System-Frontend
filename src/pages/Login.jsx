import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Toast Notification State
  const [toast, setToast] = useState({
    isOpen: false,
    type: 'error', // 'success' | 'error' | 'warning'
    title: '',
    message: ''
  });

  const navigate = useNavigate();

  // Live clock (shift check-in awareness)
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const triggerToast = (type, title, message) => {
    setToast({ isOpen: true, type, title, message });
  };

  // Auto-dismiss toast timer
  useEffect(() => {
    if (toast.isOpen) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, isOpen: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.isOpen]);

  // Detect Caps Lock on password input
  const handleKeyPressCheck = (e) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      triggerToast(
        'warning',
        'Missing Credentials',
        'Please provide both your account username and password.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        username: username.trim(),
        password: password.trim()
      });

      const loggedUser = res.data.user;
      const operatorName = loggedUser.full_name || loggedUser.username;

      triggerToast(
        'success',
        'Access Granted',
        `Welcome back, ${operatorName}! Loading your workspace...`
      );

      localStorage.setItem('erp_user', JSON.stringify(loggedUser));
      window.dispatchEvent(new Event('erp_user_updated'));

      // Smooth transition to user's authorized module
      setTimeout(() => {
        const perms = loggedUser.permissions || [];
        const role = loggedUser.role;

        if (role === 'admin' || perms.includes('dashboard')) {
          navigate('/');
        } else if (perms.includes('sales')) {
          navigate('/sales');
        } else if (perms.includes('ledger')) {
          navigate('/ledger');
        } else if (perms.includes('inventory')) {
          navigate('/inventory');
        } else if (perms.includes('purchases')) {
          navigate('/purchases');
        } else if (perms.includes('crm')) {
          navigate('/crm');
        } else {
          navigate('/profile');
        }
      }, 700);
    } catch (err) {
      const errorDetail =
        err.response?.data?.error ||
        'Invalid credentials. Please verify your login details.';
      triggerToast('error', 'Authentication Failed', errorDetail);
    } finally {
      setIsLoading(false);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formattedDate = currentTime.toLocaleDateString('en-PK', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const toastColor =
    toast.type === 'success'
      ? 'text-emerald-600'
      : toast.type === 'warning'
      ? 'text-amber-600'
      : 'text-red-600';

  const inputClass =
    'h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/20';

  return (
    <div className="min-h-screen w-full bg-white font-sans grid grid-cols-1 lg:grid-cols-[2fr_3fr]">

      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-5 right-5 z-50 transition-all duration-200 ${
          toast.isOpen
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-2 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-start gap-3 min-w-[290px] max-w-sm rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <span className={`mt-0.5 shrink-0 ${toastColor}`}>
            {toast.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(prev => ({ ...prev, isOpen: false }))}
            className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* LEFT: brand panel (desktop only) */}
      <aside className="hidden lg:flex flex-col justify-between bg-[#0F52BA] px-12 py-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-base font-bold text-[#0F52BA]">
            S
          </div>
          <span className="text-lg font-semibold tracking-tight">Sheikh&apos;s ERP</span>
        </div>

        <div className="max-w-sm">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Sales, stock and payroll in one place.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-blue-100">
            Sign in to open your workstation. You will see only the modules your role allows.
          </p>
        </div>

        <div>
          <p className="font-mono text-lg tabular-nums">{formattedTime}</p>
          <p className="mt-0.5 text-sm text-blue-200">{formattedDate}</p>
        </div>
      </aside>

      {/* RIGHT: sign-in form */}
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">

          {/* Mobile brand */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F52BA] text-base font-bold text-white">
              S
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Sheikh&apos;s ERP
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Use your operator username and password.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">

            {/* Username */}
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-700">
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  autoFocus
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or cashier_01"
                  className={`${inputClass} pr-10`}
                />
                {username && (
                  <button
                    type="button"
                    onClick={() => setUsername('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Clear username"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                {capsLockOn && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                    <AlertCircle size={12} />
                    Caps Lock is on
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={handleKeyPressCheck}
                  onKeyDown={handleKeyPressCheck}
                  placeholder="Enter your password"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0F52BA] text-sm font-semibold text-white transition-colors hover:bg-[#0c449c] focus:outline-none focus:ring-2 focus:ring-[#0F52BA]/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          <p className="mt-6 text-[13px] leading-relaxed text-slate-500">
            Signing in also starts or resumes today&apos;s shift attendance.
          </p>

          {/* Mobile clock */}
          <p className="mt-8 font-mono text-xs tabular-nums text-slate-400 lg:hidden">
            {formattedDate} &middot; {formattedTime}
          </p>
        </div>

        <p className="mx-auto mt-12 w-full max-w-sm text-xs text-slate-400">
          Authorized staff only &middot; v2.4
        </p>
      </main>
    </div>
  );
}