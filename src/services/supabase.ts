import { createClient } from '@supabase/supabase-js';
import i18n from '../i18n';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase = createClient(url || 'https://invalid.supabase.co', anonKey || 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export class ApiError extends Error { constructor(message:string,public code?:string,public status?:number){super(message);this.name='ApiError'} }

export async function invoke<T>(name: string, options?: { body?: unknown; method?: string; query?: URLSearchParams }) {
  if (!url || !anonKey) throw new Error('Supabase ortam değişkenleri tanımlı değil.');
  const { data: { session } } = await supabase.auth.getSession();
  const endpoint = new URL(`${url}/functions/v1/${name}`);
  if (options?.query) endpoint.search = options.query.toString();
  const response = await fetch(endpoint, {
    method: options?.method ?? 'POST',
    headers: {
      apikey: anonKey,
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: options?.body instanceof FormData ? options.body : options?.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const codeKey = payload.code ? `errors.api.${payload.code}` : '';
    const statusKey = `errors.http.${response.status}`;
    const message = codeKey && i18n.exists(codeKey)
      ? String(i18n.t(codeKey))
      : i18n.exists(statusKey)
        ? String(i18n.t(statusKey))
        : String(i18n.t('errors.generic'));
    throw new ApiError(message, payload.code, response.status);
  }
  return payload as T;
}
