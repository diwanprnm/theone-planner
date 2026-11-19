import { supabase } from './supabase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Galat API dengan status HTTP, supaya UI bisa membedakan 401 vs 400. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Dilewati untuk panggilan dari antrean offline yang sudah punya token. */
  signal?: AbortSignal;
}

/**
 * Memanggil API NestJS dengan access token Supabase.
 * Melempar ApiError bila respons tidak 2xx.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload: unknown = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(payload, response.status), response.status);
  }

  return payload as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'string' && payload) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: string | string[] }).message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  if (status === 401) {
    return 'Sesi kamu sudah berakhir. Silakan masuk lagi.';
  }

  return 'Terjadi kesalahan. Coba lagi.';
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiFetch<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body }),
  delete: <T = void>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

/**
 * Mengunggah berkas (multipart/form-data). Dipakai untuk foto struk.
 *
 * `Content-Type` sengaja TIDAK disetel manual: browser harus menuliskannya
 * sendiri agar `boundary` multipart ikut disertakan. Menyetelnya sendiri
 * membuat server gagal mem-parse badan permintaan.
 */
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const form = new FormData();
  form.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: form,
  });

  const text = await response.text();
  const payload: unknown = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(payload, response.status), response.status);
  }

  return payload as T;
}
