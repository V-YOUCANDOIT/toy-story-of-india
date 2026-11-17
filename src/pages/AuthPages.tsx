import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';

export function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStage, setResetStage] = useState<'request' | 'confirm'>('request');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      showToast(`Welcome back, ${loggedInUser.name}.`, 'success');
      if (loggedInUser.role === 'admin' && redirect === '/account') {
        navigate('/admin');
      } else {
        navigate(redirect);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string; dev_reset_token?: string }>(
        '/api/auth/forgot-password',
        { email: forgotEmail }
      );
      showToast(res.message, 'info');
      if (res.dev_reset_token) {
        setResetToken(res.dev_reset_token);
      }
      setResetStage('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process reset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>('/api/auth/reset-password', {
        token: resetToken,
        password: newPassword,
      });
      showToast(res.message, 'success');
      setForgotMode(false);
      setResetStage('request');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-[#FAF7F2] border border-[#30251F]/12 rounded-2xl p-8 sm:p-10 shadow-sm">
        <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
          Client Access
        </p>
        <h1 className="font-serif-editorial text-4xl font-semibold text-[#30251F] mb-2">
          {forgotMode ? 'Reset Password' : 'Sign In'}
        </h1>
        <p className="text-sm text-[#30251F]/70 mb-7">
          {forgotMode
            ? 'Recover access to your Petit Atelier account.'
            : 'Access your orders, saved addresses, and wishlist.'}
        </p>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-[#C58F91]/15 border border-[#C58F91] text-sm text-[#30251F]">
            {error}
          </div>
        )}

        {!forgotMode ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setError('');
                  }}
                  className="text-xs text-[#49372F] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : resetStage === 'request' ? (
          <form onSubmit={handleForgotRequest} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                Account Email
              </label>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] disabled:opacity-50"
            >
              {submitting ? 'Preparing…' : 'Request Reset Token'}
            </button>
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="w-full py-2 text-xs text-[#30251F]/70 hover:text-[#30251F]"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetConfirm} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                Reset Token
              </label>
              <input
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm font-mono-tabular focus:outline-none focus:border-[#49372F]"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                New Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] disabled:opacity-50"
            >
              {submitting ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}

        <div className="mt-7 pt-6 border-t border-[#30251F]/10 text-center text-sm text-[#30251F]/75">
          New to Petit Atelier?{' '}
          <Link
            to={`/register?redirect=${encodeURIComponent(redirect)}`}
            className="font-medium text-[#49372F] hover:underline"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await register(form);
      showToast(`Welcome to Petit Atelier, ${user.name}.`, 'success');
      navigate(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-[#FAF7F2] border border-[#30251F]/12 rounded-2xl p-8 sm:p-10 shadow-sm">
        <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
          Join the Atelier
        </p>
        <h1 className="font-serif-editorial text-4xl font-semibold text-[#30251F] mb-2">
          Create Account
        </h1>
        <p className="text-sm text-[#30251F]/70 mb-7">
          Save your wishlist, manage delivery addresses, and track every order.
        </p>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-[#C58F91]/15 border border-[#C58F91] text-sm text-[#30251F]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              required
              minLength={6}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
              Password (min. 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <div className="mt-7 pt-6 border-t border-[#30251F]/10 text-center text-sm text-[#30251F]/75">
          Already have an account?{' '}
          <Link
            to={`/login?redirect=${encodeURIComponent(redirect)}`}
            className="font-medium text-[#49372F] hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
