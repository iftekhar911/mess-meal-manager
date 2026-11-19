import { ApiErrorResponse } from '@mess/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Universal API fetch wrapper sending requests to the real PostgreSQL-backed API
 * with Bearer token, httpOnly cookie credentials, and structured error handling.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
  messId?: string
): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (messId) {
    headers.set('x-mess-id', messId);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        statusCode: response.status,
        errorCode: 'FETCH_ERROR',
        message: response.statusText || 'Network request failed',
        timestamp: new Date().toISOString(),
        path: endpoint
      };
    }
    throw new ApiClientError(
      errorData.statusCode || response.status,
      errorData.errorCode || 'REQUEST_FAILED',
      errorData.message || 'Request failed',
      errorData.details
    );
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}
