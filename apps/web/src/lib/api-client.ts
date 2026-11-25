import { ApiErrorResponse } from '@mess/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const DEFAULT_TIMEOUT_MS = 10000;

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

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Universal API fetch wrapper with timeout protection, Bearer token injection,
 * httpOnly cookie credentials, and structured error handling.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
  token?: string,
  messId?: string
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (messId) {
    headers.set('x-mess-id', messId);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: controller.signal
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    throw new ApiClientError(
      503,
      'NETWORK_ERROR',
      isTimeout ? 'Request timed out' : 'Network request failed'
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let errorData: ApiErrorResponse;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        statusCode: response.status,
        errorCode: 'FETCH_ERROR',
        message: response.statusText || 'Request failed',
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
