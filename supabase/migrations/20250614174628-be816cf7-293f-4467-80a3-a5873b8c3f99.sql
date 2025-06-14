-- Enhanced Row-Level Security Policies
-- Add comprehensive RLS policies for all major tables

-- Enable RLS on tables that don't have it yet
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_completion_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Trucks RLS policies
CREATE POLICY "Users can view trucks based on role" 
ON public.trucks FOR SELECT 
USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    WHEN public.get_current_user_role() = 'WAREHOUSE_STAFF' THEN status != 'DONE'
    ELSE false
  END
);

CREATE POLICY "Authorized users can create trucks" 
ON public.trucks FOR INSERT 
WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
);

CREATE POLICY "Authorized users can update trucks" 
ON public.trucks FOR UPDATE 
USING (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
);

-- Tasks RLS policies
CREATE POLICY "Users can view their assigned tasks or all if admin" 
ON public.tasks FOR SELECT 
USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    ELSE assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid()
  END
);

CREATE POLICY "Authorized users can create tasks" 
ON public.tasks FOR INSERT 
WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
);

CREATE POLICY "Users can update their tasks or admins can update all" 
ON public.tasks FOR UPDATE 
USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    ELSE assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid()
  END
);

-- Truck exceptions RLS policies
CREATE POLICY "Users can view exceptions they reported or are assigned to resolve" 
ON public.truck_exceptions FOR SELECT 
USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    ELSE reported_by_user_id = auth.uid() OR resolved_by_user_id = auth.uid()
  END
);

CREATE POLICY "Warehouse staff can report exceptions" 
ON public.truck_exceptions FOR INSERT 
WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
  AND reported_by_user_id = auth.uid()
);

CREATE POLICY "Users can update exceptions they are involved with" 
ON public.truck_exceptions FOR UPDATE 
USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    ELSE reported_by_user_id = auth.uid() OR resolved_by_user_id = auth.uid()
  END
);

-- Truck completion photos RLS policies
CREATE POLICY "Users can view truck photos based on role" 
ON public.truck_completion_photos FOR SELECT 
USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    ELSE uploaded_by_user_id = auth.uid()
  END
);

CREATE POLICY "Warehouse staff can upload truck photos" 
ON public.truck_completion_photos FOR INSERT 
WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'WAREHOUSE_STAFF')
  AND uploaded_by_user_id = auth.uid()
);

-- Profiles RLS policies
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Only admins can create profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (
  public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN')
);

-- User roles RLS policies
CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT 
USING (
  CASE 
    WHEN public.get_current_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN') THEN true
    ELSE user_id = auth.uid()
  END
);

CREATE POLICY "Only super admins can manage roles" 
ON public.user_roles FOR ALL 
USING (public.get_current_user_role() = 'SUPER_ADMIN');