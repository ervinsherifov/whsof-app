-- Force update with specific values
UPDATE public.time_entries 
SET 
  approval_status = 'approved',
  approved_by_user_id = '7c278802-372e-49c1-97dc-cb7e66e63912',
  updated_at = '2025-06-14T13:25:00.000Z'
WHERE id = '1f07bf05-65d8-4309-b63a-dc08ebec3c91'

RETURNING id, approval_status, approved_by_user_id, updated_at;