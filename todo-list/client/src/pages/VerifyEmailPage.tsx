import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { resendVerification } from '../api/auth';
import styles from './VerifyEmailPage.module.css';

export default function VerifyEmailPage() {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || '';
  const [resendEmail, setResendEmail] = useState(email);
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();

  const handleResend = async () => {
    if (!resendEmail) {
      showToast('Please enter your email', 'error');
      return;
    }
    setSending(true);
    try {
      await resendVerification(resendEmail);
      showToast('Verification email sent!', 'success');
    } catch {
      showToast('Failed to resend', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Check Your Email</h1>
        <p className={styles.text}>
          We've sent a verification link to <strong>{email || 'your email'}</strong>.
          Click the link to verify your account.
        </p>
        <p className={styles.subtext}>Didn't receive the email?</p>
        {!email && (
          <input
            className={styles.input}
            type="email"
            placeholder="Enter your email"
            value={resendEmail}
            onChange={e => setResendEmail(e.target.value)}
          />
        )}
        <button className={styles.button} onClick={handleResend} disabled={sending}>
          {sending ? 'Sending...' : 'Resend verification email'}
        </button>
      </div>
    </div>
  );
}
