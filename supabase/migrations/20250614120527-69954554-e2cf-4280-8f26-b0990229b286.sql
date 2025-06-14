-- Create photo categories table
CREATE TABLE public.photo_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color_code TEXT DEFAULT '#3B82F6',
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default photo categories
INSERT INTO public.photo_categories (name, description, color_code, is_required, sort_order) VALUES
('cargo_before', 'Photos of cargo before unloading', '#EF4444', true, 1),
('cargo_after', 'Photos after cargo unloading completion', '#10B981', true, 2),
('damage_report', 'Photos documenting any damage found', '#F59E0B', false, 3),
('loading_dock', 'Photos of loading dock area', '#6366F1', false, 4),
('equipment_used', 'Photos of equipment used during unloading', '#8B5CF6', false, 5),
('safety_compliance', 'Photos showing safety compliance', '#06B6D4', false, 6);

-- Create photo annotations table
CREATE TABLE public.photo_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES public.truck_completion_photos(id) ON DELETE CASCADE,
  x_coordinate NUMERIC(5,2) CHECK (x_coordinate >= 0 AND x_coordinate <= 100),
  y_coordinate NUMERIC(5,2) CHECK (y_coordinate >= 0 AND y_coordinate <= 100),
  annotation_text TEXT NOT NULL,
  annotation_type TEXT DEFAULT 'note' CHECK (annotation_type IN ('note', 'issue', 'measurement', 'highlight')),
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create photo quality metrics table
CREATE TABLE public.photo_quality_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES public.truck_completion_photos(id) ON DELETE CASCADE,
  file_size_kb INTEGER,
  resolution_width INTEGER,
  resolution_height INTEGER,
  quality_score NUMERIC(3,1) CHECK (quality_score >= 0 AND quality_score <= 10),
  blur_score NUMERIC(3,1),
  brightness_score NUMERIC(3,1),
  has_timestamp BOOLEAN DEFAULT false,
  has_geolocation BOOLEAN DEFAULT false,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create truck photo compliance table
CREATE TABLE public.truck_photo_compliance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  required_categories TEXT[] DEFAULT '{}',
  completed_categories TEXT[] DEFAULT '{}',
  compliance_score NUMERIC(3,1) CHECK (compliance_score >= 0 AND compliance_score <= 100),
  is_compliant BOOLEAN DEFAULT false,
  notes TEXT,
  reviewed_by_user_id UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to truck_completion_photos
ALTER TABLE public.truck_completion_photos 
ADD COLUMN category_id UUID REFERENCES public.photo_categories(id),
ADD COLUMN file_name TEXT,
ADD COLUMN file_size_kb INTEGER,
ADD COLUMN mime_type TEXT,
ADD COLUMN is_primary BOOLEAN DEFAULT false,
ADD COLUMN capture_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN geo_latitude NUMERIC(10,8),
ADD COLUMN geo_longitude NUMERIC(11,8),
ADD COLUMN device_info JSONB,
ADD COLUMN processing_status TEXT DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'processing', 'processed', 'failed')),
ADD COLUMN tags TEXT[],
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_by_user_id UUID;

-- Enable RLS on new tables
ALTER TABLE public.photo_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_photo_compliance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for photo_categories (read-only for most users)
CREATE POLICY "Anyone can view photo categories" 
ON public.photo_categories FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Admins can manage photo categories" 
ON public.photo_categories FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('OFFICE_ADMIN', 'SUPER_ADMIN'));

-- Create RLS policies for photo_annotations
CREATE POLICY "Users can view all photo annotations" 
ON public.photo_annotations FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Users can create photo annotations" 
ON public.photo_annotations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Users can update their own annotations" 
ON public.photo_annotations FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by_user_id);

CREATE POLICY "Admins can manage all annotations" 
ON public.photo_annotations FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('OFFICE_ADMIN', 'SUPER_ADMIN'));

-- Create RLS policies for photo_quality_metrics
CREATE POLICY "Users can view photo quality metrics" 
ON public.photo_quality_metrics FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "System can manage photo quality metrics" 
ON public.photo_quality_metrics FOR ALL 
TO authenticated USING (true);

-- Create RLS policies for truck_photo_compliance
CREATE POLICY "Users can view truck photo compliance" 
ON public.truck_photo_compliance FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Staff can manage truck photo compliance" 
ON public.truck_photo_compliance FOR ALL 
TO authenticated 
USING (public.get_current_user_role() IN ('WAREHOUSE_STAFF', 'OFFICE_ADMIN', 'SUPER_ADMIN'));

-- Create function to check photo compliance for a truck
CREATE OR REPLACE FUNCTION public.check_truck_photo_compliance(truck_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  required_cats TEXT[];
  completed_cats TEXT[];
  compliance_score NUMERIC;
  is_compliant BOOLEAN;
  photo_count INTEGER;
  result JSONB;
BEGIN
  -- Get required categories
  SELECT ARRAY_AGG(name) INTO required_cats
  FROM photo_categories 
  WHERE is_required = true AND is_active = true;
  
  -- Get completed categories for this truck
  SELECT ARRAY_AGG(DISTINCT pc.name) INTO completed_cats
  FROM truck_completion_photos tcp
  JOIN photo_categories pc ON tcp.category_id = pc.id
  WHERE tcp.truck_id = truck_id_param 
    AND tcp.is_deleted = false;
  
  -- Count total photos
  SELECT COUNT(*) INTO photo_count
  FROM truck_completion_photos
  WHERE truck_id = truck_id_param AND is_deleted = false;
  
  -- Calculate compliance score
  IF required_cats IS NULL OR array_length(required_cats, 1) = 0 THEN
    compliance_score := 100;
    is_compliant := true;
  ELSE
    compliance_score := (
      COALESCE(array_length(completed_cats, 1), 0)::NUMERIC / 
      array_length(required_cats, 1)::NUMERIC
    ) * 100;
    is_compliant := compliance_score >= 100;
  END IF;
  
  -- Update or insert compliance record
  INSERT INTO truck_photo_compliance (
    truck_id, required_categories, completed_categories, 
    compliance_score, is_compliant
  )
  VALUES (
    truck_id_param, required_cats, COALESCE(completed_cats, '{}'), 
    compliance_score, is_compliant
  )
  ON CONFLICT (truck_id) DO UPDATE SET
    required_categories = EXCLUDED.required_categories,
    completed_categories = EXCLUDED.completed_categories,
    compliance_score = EXCLUDED.compliance_score,
    is_compliant = EXCLUDED.is_compliant,
    updated_at = now();
  
  -- Return result
  result := jsonb_build_object(
    'truck_id', truck_id_param,
    'required_categories', required_cats,
    'completed_categories', COALESCE(completed_cats, '{}'),
    'compliance_score', compliance_score,
    'is_compliant', is_compliant,
    'photo_count', photo_count
  );
  
  RETURN result;
END;
$$;

-- Create function to generate photo summary for truck
CREATE OR REPLACE FUNCTION public.generate_truck_photo_summary(truck_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  summary JSONB;
  total_photos INTEGER;
  photos_by_category JSONB;
  avg_quality NUMERIC;
  compliance_info JSONB;
BEGIN
  -- Get total photo count
  SELECT COUNT(*) INTO total_photos
  FROM truck_completion_photos
  WHERE truck_id = truck_id_param AND is_deleted = false;
  
  -- Get photos by category
  SELECT jsonb_object_agg(
    COALESCE(pc.name, 'uncategorized'), 
    category_data.photo_count
  ) INTO photos_by_category
  FROM (
    SELECT 
      category_id,
      COUNT(*) as photo_count
    FROM truck_completion_photos
    WHERE truck_id = truck_id_param AND is_deleted = false
    GROUP BY category_id
  ) category_data
  LEFT JOIN photo_categories pc ON category_data.category_id = pc.id;
  
  -- Get average quality score
  SELECT AVG(pqm.quality_score) INTO avg_quality
  FROM truck_completion_photos tcp
  JOIN photo_quality_metrics pqm ON tcp.id = pqm.photo_id
  WHERE tcp.truck_id = truck_id_param AND tcp.is_deleted = false;
  
  -- Get compliance info
  SELECT public.check_truck_photo_compliance(truck_id_param) INTO compliance_info;
  
  -- Build summary
  summary := jsonb_build_object(
    'truck_id', truck_id_param,
    'total_photos', total_photos,
    'photos_by_category', COALESCE(photos_by_category, '{}'),
    'average_quality_score', avg_quality,
    'compliance', compliance_info,
    'generated_at', now()
  );
  
  RETURN summary;
END;
$$;

-- Create trigger to update photo compliance when photos are added/removed
CREATE OR REPLACE FUNCTION public.update_photo_compliance_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update compliance for the affected truck
  IF TG_OP = 'DELETE' THEN
    PERFORM public.check_truck_photo_compliance(OLD.truck_id);
    RETURN OLD;
  ELSE
    PERFORM public.check_truck_photo_compliance(NEW.truck_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER update_photo_compliance_on_photo_change
  AFTER INSERT OR UPDATE OR DELETE ON public.truck_completion_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_photo_compliance_trigger();

-- Create indexes for better performance
CREATE INDEX idx_truck_completion_photos_category_id ON public.truck_completion_photos(category_id);
CREATE INDEX idx_truck_completion_photos_truck_id_category ON public.truck_completion_photos(truck_id, category_id);
CREATE INDEX idx_truck_completion_photos_is_deleted ON public.truck_completion_photos(is_deleted);
CREATE INDEX idx_photo_annotations_photo_id ON public.photo_annotations(photo_id);
CREATE INDEX idx_photo_quality_metrics_photo_id ON public.photo_quality_metrics(photo_id);
CREATE INDEX idx_truck_photo_compliance_truck_id ON public.truck_photo_compliance(truck_id);

-- Add updated_at triggers
CREATE TRIGGER update_photo_categories_updated_at
  BEFORE UPDATE ON public.photo_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_photo_annotations_updated_at
  BEFORE UPDATE ON public.photo_annotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_photo_quality_metrics_updated_at
  BEFORE UPDATE ON public.photo_quality_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_truck_photo_compliance_updated_at
  BEFORE UPDATE ON public.truck_photo_compliance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();