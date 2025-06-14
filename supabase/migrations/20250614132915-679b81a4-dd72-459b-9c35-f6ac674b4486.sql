-- Test updating the approval status manually
UPDATE public.time_entries 
SET approval_status = 'approved', 
    approved_by_user_id = '7c278802-372e-49c1-97dc-cb7e66e63912',
    updated_at = now()
WHERE id = '1f07bf05-65d8-4309-b63a-dc08ebec3c91';