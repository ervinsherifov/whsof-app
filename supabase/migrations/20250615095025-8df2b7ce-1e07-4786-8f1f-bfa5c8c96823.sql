-- Add foreign key constraints for tasks and trucks to profiles table
-- First, let's check what we have and add the missing constraints

-- Add foreign key constraint for tasks -> profiles
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_created_by_user_id_fkey 
FOREIGN KEY (created_by_user_id) 
REFERENCES public.profiles(user_id);

-- Add foreign key constraint for trucks -> profiles  
ALTER TABLE public.trucks 
ADD CONSTRAINT trucks_created_by_user_id_fkey 
FOREIGN KEY (created_by_user_id) 
REFERENCES public.profiles(user_id);