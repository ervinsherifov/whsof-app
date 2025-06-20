-- First, let's see what users we have
INSERT INTO user_roles (user_id, role) 
SELECT id, 'SUPER_ADMIN'::app_role 
FROM auth.users 
WHERE email = 'ervin.sherifov@dhl.com'
ON CONFLICT (user_id, role) DO NOTHING;