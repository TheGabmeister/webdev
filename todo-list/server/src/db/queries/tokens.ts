import pool from '../pool';

export async function createVerificationToken(userId: number, token: string, expiresAt: Date) {
  await pool.query(
    'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
}

export async function findVerificationToken(token: string) {
  const { rows } = await pool.query(
    'SELECT id, user_id, token, expires_at FROM email_verification_tokens WHERE token = $1',
    [token]
  );
  return rows[0] || null;
}

export async function deleteVerificationTokensForUser(userId: number) {
  await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
}

export async function createResetToken(userId: number, token: string, expiresAt: Date) {
  await pool.query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
}

export async function findResetToken(token: string) {
  const { rows } = await pool.query(
    'SELECT id, user_id, token, expires_at FROM password_reset_tokens WHERE token = $1',
    [token]
  );
  return rows[0] || null;
}

export async function deleteResetTokensForUser(userId: number) {
  await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
}
