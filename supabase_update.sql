-- ========================================================================================
-- ACTUALIZACIÓN SUPABASE - STRAJE.APP
-- ========================================================================================

-- 1. Tabla: VISITAS_APP
CREATE TABLE IF NOT EXISTS public.visitas_app (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha TIMESTAMPTZ DEFAULT NOW(),
    origen TEXT DEFAULT 'app'
);

ALTER TABLE public.visitas_app ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden insertar visitas" ON public.visitas_app; 
CREATE POLICY "Todos pueden insertar visitas" ON public.visitas_app FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Programador puede ver visitas" ON public.visitas_app; 
CREATE POLICY "Programador puede ver visitas" ON public.visitas_app FOR SELECT USING (true);

-- 2. Tabla: GASTOS_PROGRAMADOR
CREATE TABLE IF NOT EXISTS public.gastos_programador (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concepto TEXT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    usuario_id UUID
);

ALTER TABLE public.gastos_programador ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Programador gestiona gastos" ON public.gastos_programador; 
CREATE POLICY "Programador gestiona gastos" ON public.gastos_programador FOR ALL USING (true);

-- 3. Políticas para que el programador pueda ver TODAS las empresas y usuarios (Necesario para las métricas)
DROP POLICY IF EXISTS "Programador ve todas las empresas" ON public.empresas;
CREATE POLICY "Programador ve todas las empresas" ON public.empresas FOR SELECT USING (
  (auth.jwt() ->> 'email') = 'prueba_tiendaropa2026@hotmail.com'
);

DROP POLICY IF EXISTS "Programador ve todos los usuarios" ON public.usuarios;
CREATE POLICY "Programador ve todos los usuarios" ON public.usuarios FOR SELECT USING (
  (auth.jwt() ->> 'email') = 'prueba_tiendaropa2026@hotmail.com'
);

-- 4. Columnas adicionales en EMPRESAS para tracking directo de accesos
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cantidad_logins INTEGER DEFAULT 1;

-- 5. Tabla: ACTIVIDAD_LOGINS (Registro geográfico y de inicios de sesión para mapa y propaganda)
CREATE TABLE IF NOT EXISTS public.actividad_logins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID,
    empresa_id UUID,
    email TEXT,
    nombre TEXT,
    ciudad TEXT,
    provincia TEXT,
    pais TEXT DEFAULT 'Argentina',
    ip TEXT,
    tipo TEXT DEFAULT 'login', -- 'login' o 'registro'
    fecha TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.actividad_logins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden registrar login" ON public.actividad_logins;
CREATE POLICY "Todos pueden registrar login" ON public.actividad_logins FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Programador ve actividad logins" ON public.actividad_logins;
CREATE POLICY "Programador ve actividad logins" ON public.actividad_logins FOR SELECT USING (
  (auth.jwt() ->> 'email') = 'prueba_tiendaropa2026@hotmail.com'
);
