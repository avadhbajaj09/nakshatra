drop policy "members can manage contacts" on public.contacts;

create policy "members can create contacts" on public.contacts for insert to authenticated
with check (private.is_organization_member(organization_id));

create policy "members can update contacts" on public.contacts for update to authenticated
using (private.is_organization_member(organization_id))
with check (private.is_organization_member(organization_id));

drop policy "admins can manage workflows" on public.workflows;

create policy "admins can create workflows" on public.workflows for insert to authenticated
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = workflows.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'manager')
  )
);

create policy "admins can update workflows" on public.workflows for update to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = workflows.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'manager')
  )
)
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = workflows.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'manager')
  )
);
