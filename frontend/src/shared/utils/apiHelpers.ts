import type { AxiosError } from 'axios';
import type { UseFormSetError, FieldValues, Path } from 'react-hook-form';

/** Shape of the standard error envelope from docs/06 §2 */
interface ApiError {
  success: false;
  data: null;
  errors: {
    message: string;
    code: string;
    fields?: Record<string, string[]>;
  };
}

/**
 * Unwrap a paginated list response from the standard envelope or direct response.
 * Backend returns: { success, data: { count, next, previous, results } } or { count, results } or Array
 */
export function unwrapList<T = unknown>(response: any): {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
} {
  const root = response?.data?.data !== undefined ? response.data.data : response?.data;
  if (Array.isArray(root)) {
    return { count: root.length, next: null, previous: null, results: root as T[] };
  }
  if (root && Array.isArray(root.results)) {
    return {
      count: typeof root.count === 'number' ? root.count : root.results.length,
      next: root.next ?? null,
      previous: root.previous ?? null,
      results: root.results as T[],
    };
  }
  return { count: 0, next: null, previous: null, results: [] };
}

/**
 * Extract array data whether wrapped in paginated object { results: [] }, envelope { data: [] }, or flat array.
 */
export function unwrapArray<T = unknown>(response: any): T[] {
  const root = response?.data?.data !== undefined ? response.data.data : response?.data;
  if (Array.isArray(root)) return root as T[];
  if (root && Array.isArray(root.results)) return root.results as T[];
  return [];
}

/**
 * Unwrap a single-object response from the standard envelope.
 * Backend returns: { success, data: { ...object } }
 */
export function unwrap<T = any>(response: any): T {
  if (response?.data?.data !== undefined) {
    return response.data.data as T;
  }
  return response?.data as T;
}

/**
 * Map server field errors (from envelope) onto React Hook Form.
 * Falls back to a toast message for non-field errors.
 * Per docs/06 §6 — error handling in the hook layer.
 */
export function handleApiError<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  fallback: (msg: string) => void,
) {
  const axiosErr = err as AxiosError<ApiError>;
  const fields = axiosErr.response?.data?.errors?.fields;
  if (fields) {
    Object.entries(fields).forEach(([key, messages]) => {
      setError(key as Path<T>, { message: messages[0] });
    });
  } else {
    const msg = axiosErr.response?.data?.errors?.message ?? 'Something went wrong';
    fallback(msg);
  }
}

/** Extract a plain error message from any API error */
export function getApiErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<ApiError>;
  return axiosErr.response?.data?.errors?.message ?? 'Something went wrong. Please try again.';
}
