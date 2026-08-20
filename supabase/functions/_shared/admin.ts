import { createClient } from 'npm:@supabase/supabase-js@2';

export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function requireAdmin(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const service = serviceClient();
  const token = authorization.slice(7);
  const { data: { user }, error } = await service.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await service.from('admin_users').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle();
  return data ? { service, user } : null;
}
