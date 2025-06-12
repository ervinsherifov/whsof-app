-- Update truck status to include IN_PROGRESS status
-- First, let's see what constraint exists on the status column
ALTER TABLE public.trucks 
DROP CONSTRAINT IF EXISTS trucks_status_check;

-- Add the new constraint with IN_PROGRESS status
ALTER TABLE public.trucks 
ADD CONSTRAINT trucks_status_check 
CHECK (status IN ('SCHEDULED', 'ARRIVED', 'IN_PROGRESS', 'DONE'));

-- Also make sure task status includes the current valid statuses
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED'));