import pool from '../pool';

export async function getTodosByUserId(userId: number) {
  const { rows } = await pool.query(
    'SELECT id, user_id, title, completed, position, created_at, updated_at FROM todos WHERE user_id = $1 ORDER BY position ASC',
    [userId]
  );
  return rows;
}

export async function createTodo(userId: number, title: string) {
  const { rows: [{ max }] } = await pool.query(
    'SELECT COALESCE(MAX(position), 0) AS max FROM todos WHERE user_id = $1',
    [userId]
  );
  const position = max + 1;
  const { rows } = await pool.query(
    'INSERT INTO todos (user_id, title, position) VALUES ($1, $2, $3) RETURNING id, user_id, title, completed, position, created_at, updated_at',
    [userId, title, position]
  );
  return rows[0];
}

export async function updateTodo(id: number, userId: number, fields: { title?: string; completed?: boolean }) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (fields.title !== undefined) {
    setClauses.push(`title = $${paramIndex++}`);
    values.push(fields.title);
  }
  if (fields.completed !== undefined) {
    setClauses.push(`completed = $${paramIndex++}`);
    values.push(fields.completed);
  }

  if (setClauses.length === 0) return null;

  setClauses.push(`updated_at = now()`);
  values.push(id, userId);

  const { rows } = await pool.query(
    `UPDATE todos SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING id, user_id, title, completed, position, created_at, updated_at`,
    values
  );
  return rows[0] || null;
}

export async function deleteTodo(id: number, userId: number) {
  const { rowCount } = await pool.query(
    'DELETE FROM todos WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteCompletedTodos(userId: number) {
  await pool.query('DELETE FROM todos WHERE user_id = $1 AND completed = true', [userId]);
}

export async function reorderTodos(userId: number, ids: number[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < ids.length; i++) {
      await client.query(
        'UPDATE todos SET position = $1, updated_at = now() WHERE id = $2 AND user_id = $3',
        [i + 1, ids[i], userId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
