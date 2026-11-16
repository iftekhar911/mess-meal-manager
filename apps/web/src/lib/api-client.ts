import { ApiErrorResponse } from '@mess/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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
 * Universal API fetch wrapper with token injection and standard error parsing.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
  messId?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

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
      errorData.statusCode,
      errorData.errorCode,
      errorData.message,
      errorData.details
    );
  }

  const json = await response.json();
  // Unwrap standard response data payload if present
  return json.data !== undefined ? json.data : json;
}
