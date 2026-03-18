import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const query = (text: string, params?: unknown[]) => pool.query(text, params);

export default pool;
