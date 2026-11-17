const SESSION_TOKEN_KEY = 'pa_session_token';

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : '';
}

export function setSessionFallbackToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // ignore storage restriction
  }
}

export function getSessionFallbackToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const fallbackToken = getSessionFallbackToken();
  if (fallbackToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${fallbackToken}`);
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    let csrf = getCookie('pa_csrf');
    if (!csrf) {
      try {
        const res = await fetch('/api/auth/csrf', { credentials: 'include' });
        if (res.ok) {
          const data = (await res.json()) as { csrfToken?: string };
          csrf = data.csrfToken || getCookie('pa_csrf');
        }
      } catch {
        // continue
      }
    }
    if (csrf) {
      headers.set('X-CSRF-Token', csrf);
    }
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await response.text();
  let json: Record<string, unknown> = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      setSessionFallbackToken(null);
    }
    throw new ApiError(
      (json.error as string) || `Request failed (${response.status})`,
      response.status,
      json.details
    );
  }

  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
