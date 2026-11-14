-- Aseguramos los permisos para que la API de Supabase pueda ver la tabla
GRANT ALL ON TABLE public.videos_tutoriales TO anon, authenticated, service_role;

-- Forzamos la recarga de caché
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
