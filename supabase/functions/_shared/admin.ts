import { createClient } from 'npm:@supabase/supabase-js@2';

export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function authenticatedClient(request: Request) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
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

export async function requireCompany(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const service = serviceClient();
  const token = authorization.slice(7);
  const { data: { user }, error } = await service.auth.getUser(token);
  if (error || !user) return null;
  const { data: company } = await service.from('companies')
    .select('id,name,email,auth_user_id,is_active,removed_at')
    .eq('auth_user_id', user.id).eq('is_active', true).is('removed_at', null).maybeSingle();
  return company ? { service, user, company } : null;
}
