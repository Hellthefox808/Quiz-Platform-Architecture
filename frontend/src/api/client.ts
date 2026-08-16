const API_BASE = '/api/v1';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, any>;

  constructor(status: number, code: string, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Generate correlation ID
  if (!headers.has('X-Request-ID')) {
    headers.set('X-Request-ID', typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot connect to backend server. Please verify the FastAPI backend is running on http://localhost:8000.'
    );
  }

  if (!response.ok) {
    if (response.status === 502 || response.status === 504) {
      throw new ApiError(
        response.status,
        'BAD_GATEWAY',
        'Backend server is currently offline or unreachable. Please start the FastAPI backend on port 8000.'
      );
    }

    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { message: response.statusText, code: 'HTTP_ERROR' } };
    }

    const err = errorData.error || errorData;
    throw new ApiError(
      response.status,
      err.code || `STATUS_${response.status}`,
      err.message || 'An unexpected error occurred',
      err.details
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => apiRequest<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: any) => apiRequest<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body?: any) => apiRequest<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(url: string, body?: any) => apiRequest<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => apiRequest<T>(url, { method: 'DELETE' }),
  upload: <T>(url: string, formData: FormData) => apiRequest<T>(url, { method: 'POST', body: formData }),
};
