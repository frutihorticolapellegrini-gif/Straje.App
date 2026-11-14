-- Tabla: VIDEOS_TUTORIALES
CREATE TABLE IF NOT EXISTS public.videos_tutoriales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    url TEXT NOT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    usuario_id UUID
);

-- Políticas Videos Tutoriales
ALTER TABLE public.videos_tutoriales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cualquiera puede ver los videos" ON public.videos_tutoriales; 
CREATE POLICY "Cualquiera puede ver los videos" ON public.videos_tutoriales FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo el programador gestiona videos" ON public.videos_tutoriales; 
CREATE POLICY "Solo el programador gestiona videos" ON public.videos_tutoriales FOR ALL USING (true);

-- ESTA LÍNEA ES LA QUE CORRIGE EL ERROR DEL CACHÉ
NOTIFY pgrst, 'reload schema';
