-- Check if RLS is enabled on time_entries
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'time_entries' AND schemaname = 'public';

-- Check existing policies on time_entries
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'time_entries' AND schemaname = 'public';