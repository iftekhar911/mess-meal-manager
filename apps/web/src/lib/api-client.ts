import { ApiErrorResponse } from '@mess/shared';
import { handleLocalApiRequest } from './local-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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
 * Universal API fetch wrapper with token injection, standard error parsing,
 * and automatic browser persistence fallback when running standalone on Vercel.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
  messId?: string
): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (!API_BASE_URL) {
    return handleLocalApiRequest<T>(normalizedEndpoint, options);
  }

  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (messId) {
    headers.set('x-mess-id', messId);
  }

  try {
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
    return json.data !== undefined ? json.data : json;
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    return handleLocalApiRequest<T>(normalizedEndpoint, options);
  }
}
