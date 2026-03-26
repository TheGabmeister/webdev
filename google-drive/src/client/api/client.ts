function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export async function api<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (MUTATING_METHODS.has(method)) {
    headers['X-CSRF-Token'] = getCsrfToken();
  }

  const res = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));

    if (res.status === 401) {
      // Let the auth store / router handle this
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    throw Object.assign(new Error(body.error || 'Request failed'), {
      status: res.status,
      body,
    });
  }

  return res.json();
}
