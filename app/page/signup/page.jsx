"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import './signup.css';
// import Navbar from '../navbar/page';
import Dash from '../dash-nav/page';
import { auth } from '../../../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

// ── Icons ─────────────────────────────────────────────────────────────────

// ── Firebase error → friendly message ─────────────────────────────────────

function friendlyError(code) {
  const map = {
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password. Try again or reset it.',
    'auth/invalid-credential':   'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/invalid-email':        'Please enter a valid email address.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/popup-blocked':        'Pop-up blocked. Please allow pop-ups and try again.',
    'auth/too-many-requests':    'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Contact support.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// ── Client-side validation ────────────────────────────────────────────────

function validateSignup({ name, email, password }) {
  const errors = {};
  if (!name || name.trim().length < 2)
    errors.name = 'Name must be at least 2 characters.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = 'Enter a valid email address.';
  if (!password || password.length < 6)
    errors.password = 'Password must be at least 6 characters.';
  else if (!/[A-Z]/.test(password) && !/[0-9]/.test(password))
    errors.password = 'Password should include a number or capital letter.';
  return errors;
}

function validateLogin({ email, password }) {
  const errors = {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = 'Enter a valid email address.';
  if (!password)
    errors.password = 'Please enter your password.';
  return errors;
}

// ── Reusable field component ──────────────────────────────────────────────

function Field({ id, label, name, type = 'text', placeholder, value, onChange, error, extra, autoComplete }) {
  const [showPw, setShowPw] = useState(false);
  const isPw = type === 'password';
  const inputType = isPw ? (showPw ? 'text' : 'password') : type;

  return (
    <div className={`er-form-group ${error ? 'er-has-error' : ''}`}>
      <div className="er-label-row">
        <label htmlFor={id}>{label}</label>
        {extra}
      </div>
      <div className="er-input-wrapper">
        <input
          id={id}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={error ? 'er-input-error' : ''}
        />
        {isPw && (
          <button type="button" className="er-eye-btn" onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <span className="er-field-error">
          <AlertCircle size={16} /> {error}
        </span>
      )}
    </div>
  );
}

// ── Password strength bar ─────────────────────────────────────────────────

function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 6)  score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const label = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][score];
  const color = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'][score];
  const pct   = `${(score / 5) * 100}%`;

  return (
    <div className="er-pw-strength">
      <div className="er-pw-strength-bar">
        <div className="er-pw-strength-fill" style={{ width: pct, background: color }} />
      </div>
      <span className="er-pw-strength-label" style={{ color }}>{label}</span>
    </div>
  );
}

// ── Main auth inner ───────────────────────────────────────────────────────

function AuthPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [isLogin,        setIsLogin]        = useState(false);
  const [showForgot,     setShowForgot]     = useState(false);
  const [forgotEmail,    setForgotEmail]    = useState('');
  const [forgotSent,     setForgotSent]     = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [googleLoading,  setGoogleLoading]  = useState(false);
  const [globalError,    setGlobalError]    = useState('');
  const [fieldErrors,    setFieldErrors]    = useState({});
  const [successMsg,     setSuccessMsg]     = useState('');

  // form values — controlled
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (searchParams.get('tab') === 'login') setIsLogin(true);
  }, [searchParams]);

  // clear errors when switching tabs
  useEffect(() => {
    setGlobalError('');
    setFieldErrors({});
    setSuccessMsg('');
    setName(''); setEmail(''); setPassword('');
  }, [isLogin, showForgot]);

  // ── Email / password submit ────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setSuccessMsg('');

    // Client-side validation
    const errs = isLogin
      ? validateLogin({ email, password })
      : validateSignup({ name, email, password });

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const redirectTarget = searchParams.get('redirect') || '/page/dashboard/dash-home';

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      }
      router.push(redirectTarget);
    } catch (err) {
      console.error('Auth error:', err.code, err.message);
      setGlobalError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ── Google ─────────────────────────────────────────────────────────────

  const handleGoogle = async () => {
    setGlobalError('');
    setGoogleLoading(true);
    try {
      const redirectTarget = searchParams.get('redirect') || '/page/dashboard/dash-home';
      await signInWithPopup(auth, googleProvider);
      router.push(redirectTarget);
    } catch (err) {
      console.error('Google auth error:', err.code, err.message);
      setGlobalError(friendlyError(err.code));
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Forgot password ────────────────────────────────────────────────────

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setGlobalError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotSent(true);
    } catch (err) {
      setGlobalError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot screen ──────────────────────────────────────────────────────

  if (showForgot) {
    return (
      <div className="er-auth-page">
        <div className="er-auth-card">
          <div className="er-auth-tabs">
            <button className="er-tab er-tab--active" type="button">Reset Password</button>
          </div>
          <div className="er-auth-content">
            {forgotSent ? (
              <div className="er-forgot-success">
                <div className="er-success-burst">
                  <div className="er-success-ring" />
                  <div className="er-success-check"><Check size={20} /></div>
                </div>
                <h2>Check your inbox</h2>
                <p>We sent a reset link to <strong>{forgotEmail}</strong></p>
                <button type="button" className="er-btn er-btn--primary" style={{ marginTop: 20 }}
                  onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); setIsLogin(true); }}>
                  Back to Log In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="er-auth-form" noValidate>
                <h2>Forgot Password</h2>
                <p className="er-auth-subtitle">Enter your email and we'll send you a reset link.</p>

                {globalError && (
                  <div className="er-auth-error-box">
                    <AlertCircle size={16} /> {globalError}
                  </div>
                )}

                <div className="er-form-group">
                  <label htmlFor="forgot-email">Email</label>
                  <input id="forgot-email" type="email" placeholder="name@example.com"
                    value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                </div>

                <button type="submit" className="er-btn er-btn--primary" disabled={loading}>
                  {loading ? <><span className="er-btn-spinner" /> Sending…</> : 'Send Reset Link'}
                </button>
                <p className="er-toggle-text" style={{ marginTop: 14 }}>
                  <button type="button" className="er-text-link" onClick={() => { setShowForgot(false); setGlobalError(''); }}>
                    ← Back to Log In
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main screen ────────────────────────────────────────────────────────

  return (
    <>
      <Dash />
      <div className="er-auth-page">
        <div className="er-auth-card">

          {/* Tabs */}
          <div className="er-auth-tabs">
            <button className={`er-tab ${!isLogin ? 'er-tab--active' : ''}`} onClick={() => setIsLogin(false)} type="button">
              Sign Up
            </button>
            <button className={`er-tab ${isLogin ? 'er-tab--active' : ''}`} onClick={() => setIsLogin(true)} type="button">
              Log In
            </button>
          </div>

          <div className="er-auth-content">

            {/* Global error box */}
            {globalError && (
              <div className="er-auth-error-box" role="alert">
                <span className="er-auth-error-icon"><AlertCircle size={16} /></span>
                <span>{globalError}</span>
              </div>
            )}

            {/* Success message */}
            {successMsg && (
              <div className="er-auth-success-box" role="status">
                <span className="er-auth-success-icon"><Check size={16} /></span>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Google button — above form */}
            <button
              type="button"
              onClick={handleGoogle}
              className="er-btn er-btn--google"
              disabled={loading || googleLoading}
            >
              {googleLoading
                ? <><span className="er-btn-spinner er-btn-spinner--dark" /> Connecting…</>
                : <><svg viewBox="0 0 24 24" width="18" height="18" style={{display: 'inline-block', marginRight: '6px'}}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.51h5.84c-.25 1.31-.98 2.42-2.07 3.16v2.63h3.35c1.96-1.81 3.09-4.47 3.09-7.25z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.99 7.28-2.73l-3.35-2.63c-1.01.68-2.29 1.08-3.93 1.08-3.02 0-5.58-2.04-6.49-4.79H.96v2.67C2.75 20.19 6.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.51 14.21c-.23-.68-.36-1.41-.36-2.21s.13-1.53.36-2.21V7.34H.96C.35 8.85 0 10.39 0 12s.35 3.15.96 4.66l4.55-2.45z"/>
                    <path fill="#EA4335" d="M12 4.98c1.64 0 3.11.56 4.27 1.66l3.19-3.19C17.46 1.01 14.97 0 12 0 6.7 0 2.75 2.81.96 7.34l4.55 2.45C6.42 7.02 8.98 4.98 12 4.98z"/>
                  </svg> Continue with Google</>
              }
            </button>

            <div className="er-divider"><span>or continue with email</span></div>

            {isLogin ? (
              /* ── LOGIN ── */
              <form onSubmit={handleSubmit} className="er-auth-form" noValidate>
                <Field
                  id="login-email" name="email" type="email" label="Email"
                  placeholder="name@example.com" value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: '' })); }}
                  error={fieldErrors.email} autoComplete="email"
                />
                <Field
                  id="login-password" name="password" type="password" label="Password"
                  placeholder="••••••••" value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: '' })); }}
                  error={fieldErrors.password} autoComplete="current-password"
                  extra={
                    <button type="button" className="er-text-link er-forgot-inline"
                      onClick={() => { setShowForgot(true); setGlobalError(''); }}>
                      Forgot password?
                    </button>
                  }
                />

                <button type="submit" className="er-btn er-btn--primary" disabled={loading || googleLoading}>
                  {loading ? <><span className="er-btn-spinner" /> Logging in…</> : 'Log In'}
                </button>

                <p className="er-toggle-text">
                  No account?{' '}
                  <button type="button" className="er-text-link" onClick={() => setIsLogin(false)}>Sign up free</button>
                </p>
              </form>
            ) : (
              /* ── SIGN UP ── */
              <form onSubmit={handleSubmit} className="er-auth-form" noValidate>
                <Field
                  id="signup-name" name="name" type="text" label="Full Name"
                  placeholder="Your name" value={name}
                  onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: '' })); }}
                  error={fieldErrors.name} autoComplete="name"
                />
                <Field
                  id="signup-email" name="email" type="email" label="Email"
                  placeholder="name@example.com" value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: '' })); }}
                  error={fieldErrors.email} autoComplete="email"
                />
                <Field
                  id="signup-password" name="password" type="password" label="Password"
                  placeholder="••••••••" value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: '' })); }}
                  error={fieldErrors.password} autoComplete="new-password"
                />
                <PasswordStrength password={password} />

                <button type="submit" className="er-btn er-btn--primary" disabled={loading || googleLoading}>
                  {loading ? <><span className="er-btn-spinner" /> Creating account…</> : 'Create Account'}
                </button>

                <p className="er-toggle-text">
                  Already have an account?{' '}
                  <button type="button" className="er-text-link" onClick={() => setIsLogin(true)}>Log in</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  );
}