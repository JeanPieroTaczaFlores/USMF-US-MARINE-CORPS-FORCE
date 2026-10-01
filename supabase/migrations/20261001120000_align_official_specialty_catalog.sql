-- Keep the training request, approval, and Discord synchronization catalogs in
-- lockstep. The retired generic keys are intentionally excluded; the vehicle
-- courses remain distinct in the platform while mapping to the current shared
-- ARTILLERO and CONDUCTOR Discord roles until the server creates specific ones.

alter table public.specialty_training_requests
drop constraint if exists specialty_training_requests_specialty_key_check;

alter table public.specialty_training_requests
add constraint specialty_training_requests_specialty_key_check
check (specialty_key in (
  'raider','radio','medico','tirador_ligero','tirador_pesado',
  'machine_gunner','combat_engineer',
  'artillero_vehiculo_aereo','artillero_vehiculo_terrestre',
  'licencia_vehiculo_pesado','licencia_vehiculo_ligero'
));

alter table public.specialty_applications
drop constraint if exists specialty_applications_role_key_check;

alter table public.specialty_applications
add constraint specialty_applications_role_key_check
check (role_key in (
  'raider','radio','medico','tirador_ligero','tirador_pesado',
  'machine_gunner','combat_engineer',
  'artillero_vehiculo_aereo','artillero_vehiculo_terrestre',
  'licencia_vehiculo_pesado','licencia_vehiculo_ligero'
));
