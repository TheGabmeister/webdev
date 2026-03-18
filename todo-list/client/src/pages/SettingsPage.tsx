import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { changePassword, deleteAccount } from '../api/auth';
import { ApiError } from '../api/client';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/app" className={styles.backLink}>&larr; Back to todos</Link>
        <h1 className={styles.title}>Settings</h1>
        <span className={styles.email}>{user?.email}</span>
      </header>

      <ChangePasswordSection showToast={showToast} />
      <DeleteAccountSection
        showToast={showToast}
        onDeleted={() => { setUser(null); navigate('/'); }}
      />
    </div>
  );
}

function ChangePasswordSection({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters', 'error');
      return;
    }
    if (newPassword !== confirm) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast('Password changed!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Change Password</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          required
        />
        <input
          className={styles.input}
          type="password"
          placeholder="New password (min 8 characters)"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
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
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </section>
  );
}

function DeleteAccountSection({ showToast, onDeleted }: {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onDeleted: () => void;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await deleteAccount(password);
      showToast('Account deleted', 'success');
      onDeleted();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete account', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={`${styles.sectionTitle} ${styles.danger}`}>Delete Account</h2>
      {!confirming ? (
        <button className={styles.dangerBtn} onClick={() => setConfirming(true)}>
          Delete my account
        </button>
      ) : (
        <form className={styles.form} onSubmit={handleDelete}>
          <p className={styles.warning}>This action is permanent and cannot be undone.</p>
          <input
            className={styles.input}
            type="password"
            placeholder="Enter your password to confirm"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <div className={styles.deleteActions}>
            <button className={styles.dangerBtn} type="submit" disabled={loading}>
              {loading ? 'Deleting...' : 'Confirm Delete'}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={() => { setConfirming(false); setPassword(''); }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
