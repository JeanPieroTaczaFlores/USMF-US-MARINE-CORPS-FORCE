-- Command accounts are exempt from recruit training, so their accidental
-- assignments must not appear even as completed records in the UI.
delete from public.training_assignments ta
using public.profiles p
where p.id = ta.user_id
  and p.rol in ('staff', 'admin', 'super_admin');
