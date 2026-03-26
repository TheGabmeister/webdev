import request from 'supertest';
import app from '../../src/server/app';

export interface TestUser {
  email: string;
  password: string;
}

let counter = 0;

export function uniqueEmail(): string {
  counter++;
  return `test-${counter}-${Date.now()}@example.com`;
}

export async function registerUser(overrides: Partial<TestUser> = {}) {
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? 'password123';

  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password });

  return { res, email, password };
}

export function extractCookies(res: request.Response): Record<string, string> {
  const cookies: Record<string, string> = {};
  const setCookieHeader = res.headers['set-cookie'];
  if (!setCookieHeader) return cookies;

  const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const cookie of cookieArray) {
    const [nameValue] = cookie.split(';');
    const [name, value] = nameValue.split('=');
    cookies[name.trim()] = value?.trim() ?? '';
  }
  return cookies;
}

export function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}
