insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-assets',
  'store-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff upload store assets" on storage.objects;
create policy "staff upload store assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'store-assets' and (select private.is_staff()));

drop policy if exists "staff read store assets" on storage.objects;
create policy "staff read store assets"
on storage.objects for select
to authenticated
using (bucket_id = 'store-assets' and (select private.is_staff()));

drop policy if exists "staff update store assets" on storage.objects;
create policy "staff update store assets"
on storage.objects for update
to authenticated
using (bucket_id = 'store-assets' and (select private.is_staff()))
with check (bucket_id = 'store-assets' and (select private.is_staff()));

drop policy if exists "staff delete store assets" on storage.objects;
create policy "staff delete store assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'store-assets' and (select private.is_staff()));
