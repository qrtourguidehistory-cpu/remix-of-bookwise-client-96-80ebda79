-- Add more permissive RLS policies for appointments to allow cancellation

-- Allow anyone to update an appointment by its ID (for client app cancellation)
CREATE POLICY "Anyone can update appointments by id" 
ON public.appointments 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Also add policy to allow reading appointments for anonymous users
CREATE POLICY "Anyone can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (true);