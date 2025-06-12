-- Add processing time tracking fields to trucks table
ALTER TABLE public.trucks 
ADD COLUMN started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;