-- Create table for tracking truck delays and exceptions
CREATE TABLE public.truck_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('DELAY', 'MECHANICAL_ISSUE', 'LOADING_PROBLEM', 'DOCUMENTATION_ISSUE', 'STAFF_SHORTAGE', 'OTHER')),
  reason TEXT NOT NULL,
  estimated_resolution_time TIMESTAMP WITH TIME ZONE,
  actual_resolution_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  reported_by_user_id UUID NOT NULL,
  resolved_by_user_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.truck_exceptions ENABLE ROW LEVEL SECURITY;

-- Create policies for truck_exceptions
CREATE POLICY "Users can view truck exceptions" 
ON public.truck_exceptions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create truck exceptions" 
ON public.truck_exceptions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update truck exceptions" 
ON public.truck_exceptions 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete truck exceptions" 
ON public.truck_exceptions 
FOR DELETE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_truck_exceptions_truck_id ON public.truck_exceptions(truck_id);
CREATE INDEX idx_truck_exceptions_status ON public.truck_exceptions(status);
CREATE INDEX idx_truck_exceptions_created_at ON public.truck_exceptions(created_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_truck_exceptions_updated_at
BEFORE UPDATE ON public.truck_exceptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view for KPI metrics
CREATE OR REPLACE VIEW public.kpi_metrics AS
SELECT 
  -- Truck metrics
  COUNT(*) as total_trucks,
  COUNT(*) FILTER (WHERE status = 'DONE') as completed_trucks,
  COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_trucks,
  COUNT(*) FILTER (WHERE status = 'ARRIVED') as arrived_trucks,
  COUNT(*) FILTER (WHERE status = 'SCHEDULED') as scheduled_trucks,
  
  -- Priority distribution
  COUNT(*) FILTER (WHERE priority = 'URGENT') as urgent_trucks,
  COUNT(*) FILTER (WHERE priority = 'HIGH') as high_priority_trucks,
  COUNT(*) FILTER (WHERE priority = 'NORMAL') as normal_priority_trucks,
  COUNT(*) FILTER (WHERE priority = 'LOW') as low_priority_trucks,
  
  -- Time metrics
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/3600) FILTER (WHERE completed_at IS NOT NULL AND started_at IS NOT NULL) as avg_processing_hours,
  
  -- Exception metrics
  (SELECT COUNT(*) FROM public.truck_exceptions WHERE status = 'PENDING') as pending_exceptions,
  (SELECT COUNT(*) FROM public.truck_exceptions WHERE status = 'RESOLVED') as resolved_exceptions,
  
  -- Current date for filtering
  CURRENT_DATE as metric_date
FROM public.trucks
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Grant permissions on the view
GRANT SELECT ON public.kpi_metrics TO authenticated;