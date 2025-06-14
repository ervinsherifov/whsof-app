-- Test direct update to see if it works
UPDATE public.time_entries 
SET approval_status = 'approved',
    approved_by_user_id = '7c278802-372e-49c1-97dc-cb7e66e63912',
    updated_at = now()
WHERE id = '87b52df0-5c10-46b7-be10-22190d511b89'
RETURNING id, approval_status, approved_by_user_id;