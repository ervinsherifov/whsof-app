-- First, update any existing photos to remove category references
UPDATE public.truck_completion_photos SET category_id = NULL;

-- Clear existing photo categories
DELETE FROM public.photo_categories;

-- Insert only the two required categories: documents (required) and damage (optional)
INSERT INTO public.photo_categories (name, description, is_required, is_active, sort_order, color_code) VALUES
('documents', 'Required documentation photos for truck completion', true, true, 1, '#3B82F6'),
('damage', 'Optional damage documentation photos', false, true, 2, '#EF4444');