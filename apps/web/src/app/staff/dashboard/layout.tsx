import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/staff/login');

  const { data: staffRow } = await supabase.from('staff').select('id, name').eq('id', user.id).maybeSingle();
  if (!staffRow) redirect('/staff/login');

  return <>{children}</>;
}
