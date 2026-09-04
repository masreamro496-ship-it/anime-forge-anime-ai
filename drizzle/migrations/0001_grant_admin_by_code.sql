create or replace function public.grant_admin_by_code(_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;
  if btrim(_code) <> 'تمت' then
    return false;
  end if;
  insert into public.user_roles (user_id, role)
  values (uid, 'admin')
  on conflict (user_id, role) do nothing;
  return true;
end;
$$;

revoke all on function public.grant_admin_by_code(text) from public;
grant execute on function public.grant_admin_by_code(text) to authenticated;