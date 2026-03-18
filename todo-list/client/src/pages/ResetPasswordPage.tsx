import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { forgotPassword, resetPassword } from '../api/auth';
import { ApiError } from '../api/client';
import styles from './ResetPasswordPage.module.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showToast } = useToast();

  if (token) {
    return <ResetForm token={token} navigate={navigate} showToast={showToast} />;
  }
  return <RequestForm showToast={showToast} />;
}

function RequestForm({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Check Your Email</h1>
          <p className={styles.text}>If that email is registered, we've sent a password reset link.</p>
          <Link to="/login" className={styles.link}>Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Forgot Password</h1>
        <p className={styles.text}>Enter your email and we'll send you a reset link.</p>
        <input
          className={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
        <Link to="/login" className={styles.link}>Back to sign in</Link>
      </form>
    </div>
  );
}

function ResetForm({ token, navigate, showToast }: {
  token: string;
  navigate: (path: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    if (password !== confirm) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      showToast('Password reset successfully!', 'success');
      navigate('/login');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Reset failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Reset Password</h1>
        <input
          className={styles.input}
          type="password"
          placeholder="New password (min 8 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <input
          className={styles.input}
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
        />
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
