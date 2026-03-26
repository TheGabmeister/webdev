import { api } from './client';
import type { User } from '../types';

export function register(email: string, password: string): Promise<User> {
  return api<User>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string): Promise<User> {
  return api<User>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getSession(): Promise<User> {
  return api<User>('/api/auth/session');
}

export function logout(): Promise<void> {
  return api('/api/auth/logout', { method: 'POST' });
}
