import pool from '../pool';

export async function createUser(email: string, passwordHash: string) {
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, email_verified, created_at',
    [email, passwordHash]
  );
  return rows[0];
}

export async function findUserByEmail(email: string) {
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, email_verified, created_at FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

export async function findUserById(id: number) {
  const { rows } = await pool.query(
    'SELECT id, email, email_verified, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function markEmailVerified(userId: number) {
  await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [userId]);
}

export async function updatePassword(userId: number, newHash: string) {
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
}

export async function deleteUser(userId: number) {
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}
