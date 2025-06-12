-- Add priority column to trucks table
ALTER TABLE public.trucks 
ADD COLUMN priority text NOT NULL DEFAULT 'NORMAL';

-- Add check constraint for priority values
ALTER TABLE public.trucks 
ADD CONSTRAINT trucks_priority_check 
CHECK (priority IN ('URGENT', 'HIGH', 'NORMAL', 'LOW'));

-- Create index for better performance on priority queries
CREATE INDEX idx_trucks_priority ON public.trucks(priority);

-- Update existing trucks to have NORMAL priority
UPDATE public.trucks SET priority = 'NORMAL' WHERE priority IS NULL;