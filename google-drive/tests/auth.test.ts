import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/server/app';
import { registerUser, extractCookies, cookieHeader, uniqueEmail } from './helpers/auth';

describe('Auth API', () => {
  // Register → sets auth + CSRF cookies, returns user summary
  describe('POST /api/auth/register', () => {
    it('sets auth + CSRF cookies and returns user summary', async () => {
      const { res } = await registerUser();

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email');
      expect(res.body).toHaveProperty('storageUsed');
      expect(res.body).toHaveProperty('storageLimit');

      const cookies = extractCookies(res);
      expect(cookies).toHaveProperty('drive_session');
      expect(cookies).toHaveProperty('csrf_token');
      expect(cookies.drive_session).toBeTruthy();
      expect(cookies.csrf_token).toBeTruthy();
    });

    // Register with duplicate email → 409
    it('returns 409 for duplicate email', async () => {
      const email = uniqueEmail();
      await registerUser({ email });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already registered/i);
    });

    // Register with short password (< 8 chars) → 400
    it('returns 400 for short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: uniqueEmail(), password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least 8/i);
    });
  });

  // Login → sets auth + CSRF cookies, returns user summary
  describe('POST /api/auth/login', () => {
    it('sets auth + CSRF cookies and returns user summary', async () => {
      const email = uniqueEmail();
      const password = 'password123';
      await registerUser({ email, password });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email');

      const cookies = extractCookies(res);
      expect(cookies.drive_session).toBeTruthy();
      expect(cookies.csrf_token).toBeTruthy();
    });

    // Login with wrong password → 401, no cookies set
    it('returns 401 with wrong password and no auth cookies', async () => {
      const email = uniqueEmail();
      await registerUser({ email, password: 'password123' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      const cookies = extractCookies(res);
      expect(cookies.drive_session).toBeUndefined();
    });
  });

  // GET /api/auth/session with valid cookie → returns user
  describe('GET /api/auth/session', () => {
    it('returns user with valid cookie', async () => {
      const { res: regRes, email } = await registerUser();
      const cookies = extractCookies(regRes);

      const res = await request(app)
        .get('/api/auth/session')
        .set('Cookie', cookieHeader(cookies));

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(email);
      expect(res.body).toHaveProperty('id');
    });

    // GET /api/auth/session with no cookie → 401
    it('returns 401 with no cookie', async () => {
      const res = await request(app).get('/api/auth/session');

      expect(res.status).toBe(401);
    });
  });

  // POST /api/auth/logout → clears both cookies
  describe('POST /api/auth/logout', () => {
    it('clears both cookies', async () => {
      const { res: regRes } = await registerUser();
      const cookies = extractCookies(regRes);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookieHeader(cookies))
        .set('X-CSRF-Token', cookies.csrf_token);

      expect(res.status).toBe(200);

      // Check that cookies are cleared (set with empty value or max-age=0)
      const setCookies = res.headers['set-cookie'];
      const cookieStr = Array.isArray(setCookies) ? setCookies.join('; ') : setCookies ?? '';
      expect(cookieStr).toContain('drive_session');
      expect(cookieStr).toContain('csrf_token');
    });
  });

  // Mutating request without CSRF token → 403
  describe('CSRF protection', () => {
    it('rejects mutating request without CSRF token with 403', async () => {
      const { res: regRes } = await registerUser();
      const cookies = extractCookies(regRes);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookieHeader(cookies));
      // No X-CSRF-Token header

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/csrf/i);
    });

    // Mutating request with mismatched CSRF token → 403
    it('rejects mutating request with mismatched CSRF token with 403', async () => {
      const { res: regRes } = await registerUser();
      const cookies = extractCookies(regRes);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookieHeader(cookies))
        .set('X-CSRF-Token', 'wrong-token');

      expect(res.status).toBe(403);
    });
  });

  // Auth-required endpoint without session cookie → 401
  describe('Auth middleware', () => {
    it('returns 401 for auth-required endpoint without session cookie', async () => {
      const res = await request(app).get('/api/storage');

      expect(res.status).toBe(401);
    });
  });

  // Rate limit: 11th login in 15 minutes → 429
  describe('Rate limiting', () => {
    it('returns 429 after 11th login attempt', async () => {
      const email = uniqueEmail();
      await registerUser({ email, password: 'password123' });

      const results: number[] = [];
      for (let i = 0; i < 11; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email, password: 'password123' });
        results.push(res.status);
      }

      // The first 10 should succeed, the 11th should be rate limited
      expect(results.slice(0, 10).every(s => s === 200)).toBe(true);
      expect(results[10]).toBe(429);
    });
  });
});
