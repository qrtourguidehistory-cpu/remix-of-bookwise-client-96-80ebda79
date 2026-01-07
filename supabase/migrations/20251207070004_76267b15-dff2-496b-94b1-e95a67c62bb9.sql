-- Add lunch break columns to business_working_hours table
ALTER TABLE public.business_working_hours 
ADD COLUMN IF NOT EXISTS lunch_start time without time zone,
ADD COLUMN IF NOT EXISTS lunch_end time without time zone;

-- Add comment to explain the columns
COMMENT ON COLUMN public.business_working_hours.lunch_start IS 'Start time of lunch break';
COMMENT ON COLUMN public.business_working_hours.lunch_end IS 'End time of lunch break';