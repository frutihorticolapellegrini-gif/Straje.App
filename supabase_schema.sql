-- ========================================================================================
-- DOCUMENTO MAESTRO SQL - STRAJE.APP
-- Este script genera la base de datos completa con tablas, roles, enums y políticas de RLS.
-- ========================================================================================

-- 1. LIMPIEZA PREVIA (Opcional, útil para reiniciar la DB en desarrollo)
-- DROP TABLE IF EXISTS public.caja CASCADE;
-- DROP TABLE IF EXISTS public.cierres_diarios CASCADE;
-- DROP TABLE IF EXISTS public.venta_detalles CASCADE;
-- DROP TABLE IF EXISTS public.ventas CASCADE;
-- DROP TABLE IF EXISTS public.alquiler_detalles CASCADE;
-- DROP TABLE IF EXISTS public.alquileres CASCADE;
-- DROP TABLE IF EXISTS public.stock CASCADE;
-- DROP TABLE IF EXISTS public.usuarios CASCADE;
-- DROP TABLE IF EXISTS public.empresas CASCADE;

-- DROP TYPE IF EXISTS plan_suscripcion CASCADE;
-- DROP TYPE IF EXISTS rol_usuario CASCADE;
-- DROP TYPE IF EXISTS estado_prenda CASCADE;
-- DROP TYPE IF EXISTS estado_alquiler CASCADE;
-- DROP TYPE IF EXISTS tipo_movimiento CASCADE;

-- 2. EXTENSIONES Y TIPOS DE DATOS (ENUMS)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
CREATE TYPE plan_suscripcion AS ENUM ('programador', 'premium', 'estandar');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE rol_usuario AS ENUM ('dueño', 'empleado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE estado_prenda AS ENUM ('disponible', 'alquilado', 'reservado', 'lavanderia', 'modista', 'baja');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE estado_alquiler AS ENUM ('reservado', 'entregado', 'devuelto', 'atrasado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE tipo_movimiento AS ENUM ('ingreso', 'egreso');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. CREACIÓN DE TABLAS

-- Tabla: EMPRESAS (Suscripciones y datos del negocio)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    email_contacto TEXT NOT NULL,
    telefono TEXT,
    direccion TEXT,
    localidad TEXT,
    plan plan_suscripcion NOT NULL DEFAULT 'estandar',
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    fecha_fin_prueba TIMESTAMPTZ,
    logo_url TEXT,
    aviso_legal TEXT DEFAULT 'GRACIAS POR TU COMPRA',
    activa BOOLEAN DEFAULT TRUE
);

-- Tabla: USUARIOS (Perfiles asociados a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    rol rol_usuario NOT NULL DEFAULT 'empleado',
    nombre TEXT NOT NULL,
    permisos JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: STOCK (Inventario de Trajes, Vestidos y Accesorios)
CREATE TABLE IF NOT EXISTS public.stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'General',
    marca TEXT,
    talle TEXT NOT NULL,
    color TEXT,
    costo DECIMAL(10,2) NOT NULL DEFAULT 0, -- Se filtrará en UI para empleados
    precio_alquiler DECIMAL(10,2) NOT NULL,
    precio_venta DECIMAL(10,2),
    unidades INTEGER NOT NULL DEFAULT 1,
    disponibles INTEGER NOT NULL DEFAULT 1,
    estado estado_prenda NOT NULL DEFAULT 'disponible',
    atributos_extra JSONB DEFAULT '{}'::jsonb,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que existan las columnas de inventario (por si la tabla ya existía)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock' AND column_name='unidades') THEN
        ALTER TABLE public.stock ADD COLUMN unidades INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock' AND column_name='disponibles') THEN
        ALTER TABLE public.stock ADD COLUMN disponibles INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- Tabla: ALQUILERES (Y Reservas - Núcleo operativo)
CREATE TABLE IF NOT EXISTS public.alquileres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT,
    cliente_dni TEXT,
    cliente_direccion TEXT,
    fecha_retiro TIMESTAMPTZ NOT NULL,
    fecha_devolucion TIMESTAMPTZ NOT NULL,
    estado estado_alquiler NOT NULL DEFAULT 'reservado',
    metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    descuento DECIMAL(10,2) NOT NULL DEFAULT 0,
    recargo DECIMAL(10,2) NOT NULL DEFAULT 0,
    monto_total DECIMAL(10,2) NOT NULL,
    sena_pagada DECIMAL(10,2) DEFAULT 0,
    cuotas INTEGER DEFAULT 1,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: ALQUILER_DETALLES (Prendas dentro del alquiler)
CREATE TABLE IF NOT EXISTS public.alquiler_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alquiler_id UUID NOT NULL REFERENCES public.alquileres(id) ON DELETE CASCADE,
    prenda_id UUID NOT NULL REFERENCES public.stock(id),
    precio_unitario DECIMAL(10,2) NOT NULL
);

-- Tabla: VENTAS (Venta directa de indumentaria)
CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_nombre TEXT,
    cliente_telefono TEXT,
    cliente_dni TEXT,
    cliente_direccion TEXT,
    metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    descuento DECIMAL(10,2) NOT NULL DEFAULT 0,
    recargo DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_total DECIMAL(10,2) NOT NULL,
    estado TEXT DEFAULT 'completada',
    motivo_cancelacion TEXT,
    cuotas INTEGER DEFAULT 1,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que existan las columnas de estado en ventas
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ventas' AND column_name='estado') THEN
        ALTER TABLE public.ventas ADD COLUMN estado TEXT DEFAULT 'completada';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ventas' AND column_name='motivo_cancelacion') THEN
        ALTER TABLE public.ventas ADD COLUMN motivo_cancelacion TEXT;
    END IF;
END $$;

-- Tabla: VENTA_DETALLES (Prendas dentro de la venta)
CREATE TABLE IF NOT EXISTS public.venta_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    prenda_id UUID NOT NULL REFERENCES public.stock(id),
    precio_unitario DECIMAL(10,2) NOT NULL
);

-- Tabla: CAJA (Registro de ingresos y egresos diarios)
CREATE TABLE IF NOT EXISTS public.caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id), -- Quién hizo el cobro/pago
    tipo tipo_movimiento NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    concepto TEXT NOT NULL,
    metodo_pago TEXT NOT NULL,
    fecha_movimiento TIMESTAMPTZ DEFAULT NOW()
);
-- Tabla: CIERRES_DIARIOS (Auditoría de fin de día)
CREATE TABLE IF NOT EXISTS public.cierres_diarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    fecha_cierre TIMESTAMPTZ DEFAULT NOW(),
    total_ingresos DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_egresos DECIMAL(10,2) NOT NULL DEFAULT 0,
    saldo_neto DECIMAL(10,2) NOT NULL DEFAULT 0,
    cantidad_ventas INTEGER NOT NULL DEFAULT 0,
    cantidad_alquileres INTEGER NOT NULL DEFAULT 0,
    prendas_movidas INTEGER NOT NULL DEFAULT 0,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id)
);


-- Tabla: CLIENTES (Centralización de datos de clientes)
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    dni TEXT,
    telefono TEXT,
    direccion TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: CUENTAS_CORRIENTES (Registro de deudas por alquiler o venta)
CREATE TABLE IF NOT EXISTS public.cuentas_corrientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    alquiler_id UUID REFERENCES public.alquileres(id) ON DELETE SET NULL,
    venta_id UUID REFERENCES public.ventas(id) ON DELETE SET NULL,
    monto_original DECIMAL(10,2) NOT NULL,
    monto_pendiente DECIMAL(10,2) NOT NULL,
    fecha_proximo_pago TIMESTAMPTZ,
    estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'parcial', 'saldado'
    es_condicional BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: PAGOS_CUENTA_CORRIENTE (Historial de abonos a una deuda)
CREATE TABLE IF NOT EXISTS public.pagos_cuenta_corriente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cuenta_corriente_id UUID NOT NULL REFERENCES public.cuentas_corrientes(id) ON DELETE CASCADE,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago TEXT NOT NULL,
    fecha_pago TIMESTAMPTZ DEFAULT NOW(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id)
);


-- 3. SEGURIDAD (ROW LEVEL SECURITY - RLS)

-- Habilitar RLS en todas las tablas para que por defecto nadie vea nada.
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alquileres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_corrientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_cuenta_corriente ENABLE ROW LEVEL SECURITY;

-- Función Helper para obtener el empresa_id del usuario actual
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT empresa_id FROM public.usuarios WHERE id = auth.uid();
$$;

-- Función Helper para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS rol_usuario
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$;

-- Políticas Empresas
DROP POLICY IF EXISTS "Empresas ven solo su perfil" ON public.empresas; CREATE POLICY "Empresas ven solo su perfil" ON public.empresas FOR SELECT USING (id = get_user_empresa_id());
DROP POLICY IF EXISTS "Permitir registro de empresas" ON public.empresas; CREATE POLICY "Permitir registro de empresas" ON public.empresas FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Dueños editan su empresa" ON public.empresas; CREATE POLICY "Dueños editan su empresa" ON public.empresas FOR UPDATE USING (id = get_user_empresa_id());

-- Función de Seguridad Segura para Inserciones de Empleados
CREATE OR REPLACE FUNCTION is_dueño_de_empresa(empresa_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() 
      AND rol = 'dueño' 
      AND empresa_id = empresa_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Políticas Usuarios (Separadas para evitar conflictos de recursión)
DROP POLICY IF EXISTS "Ver propio perfil" ON public.usuarios; CREATE POLICY "Ver propio perfil" ON public.usuarios FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "Ver usuarios de mi empresa" ON public.usuarios; CREATE POLICY "Ver usuarios de mi empresa" ON public.usuarios FOR SELECT USING (empresa_id = get_user_empresa_id());
DROP POLICY IF EXISTS "Registro propio" ON public.usuarios; CREATE POLICY "Registro propio" ON public.usuarios FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Dueño registra empleados" ON public.usuarios; CREATE POLICY "Dueño registra empleados" ON public.usuarios FOR INSERT WITH CHECK (is_dueño_de_empresa(empresa_id));
DROP POLICY IF EXISTS "Dueño edita empleados" ON public.usuarios; CREATE POLICY "Dueño edita empleados" ON public.usuarios FOR UPDATE USING (is_dueño_de_empresa(empresa_id));
DROP POLICY IF EXISTS "Dueño elimina empleados" ON public.usuarios; CREATE POLICY "Dueño elimina empleados" ON public.usuarios FOR DELETE USING (is_dueño_de_empresa(empresa_id));

-- Políticas Stock
DROP POLICY IF EXISTS "Ver stock de su empresa" ON public.stock; CREATE POLICY "Ver stock de su empresa" ON public.stock FOR SELECT USING (empresa_id = get_user_empresa_id());
DROP POLICY IF EXISTS "Dueño agrega stock" ON public.stock; CREATE POLICY "Dueño agrega stock" ON public.stock FOR INSERT WITH CHECK (get_user_rol() = 'dueño' AND empresa_id = get_user_empresa_id());
DROP POLICY IF EXISTS "Todos pueden editar stock" ON public.stock; CREATE POLICY "Todos pueden editar stock" ON public.stock FOR UPDATE USING (empresa_id = get_user_empresa_id());

-- Políticas Alquileres
DROP POLICY IF EXISTS "Ver y editar alquileres de su empresa" ON public.alquileres; CREATE POLICY "Ver y editar alquileres de su empresa" ON public.alquileres FOR ALL USING (empresa_id = get_user_empresa_id());
DROP POLICY IF EXISTS "Acceso a alquiler detalles" ON public.alquiler_detalles; CREATE POLICY "Acceso a alquiler detalles" ON public.alquiler_detalles FOR ALL USING (true);

-- Políticas Ventas
DROP POLICY IF EXISTS "Ver y registrar ventas de su empresa" ON public.ventas; CREATE POLICY "Ver y registrar ventas de su empresa" ON public.ventas FOR ALL USING (empresa_id = get_user_empresa_id());
DROP POLICY IF EXISTS "Acceso a venta detalles" ON public.venta_detalles; CREATE POLICY "Acceso a venta detalles" ON public.venta_detalles FOR ALL USING (true);

-- Políticas Caja
DROP POLICY IF EXISTS "Solo lectura para la propia empresa en caja" ON public.caja;
CREATE POLICY "Solo lectura para la propia empresa en caja"
    ON public.caja FOR SELECT
    USING (empresa_id = get_user_empresa_id());

DROP POLICY IF EXISTS "Inserción permitida en caja" ON public.caja;
CREATE POLICY "Inserción permitida en caja"
    ON public.caja FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id());

DROP POLICY IF EXISTS "Solo lectura para la propia empresa en cierres" ON public.cierres_diarios;
CREATE POLICY "Solo lectura para la propia empresa en cierres"
    ON public.cierres_diarios FOR SELECT
    USING (empresa_id = get_user_empresa_id());

DROP POLICY IF EXISTS "Inserción permitida en cierres" ON public.cierres_diarios;
CREATE POLICY "Inserción permitida en cierres"
    ON public.cierres_diarios FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id());


-- Políticas Clientes
DROP POLICY IF EXISTS "Todo sobre clientes empresa" ON public.clientes; CREATE POLICY "Todo sobre clientes empresa" ON public.clientes FOR ALL USING (empresa_id = get_user_empresa_id());

-- Políticas Cuenta Corriente
DROP POLICY IF EXISTS "Todo sobre cuentas corrientes empresa" ON public.cuentas_corrientes; CREATE POLICY "Todo sobre cuentas corrientes empresa" ON public.cuentas_corrientes FOR ALL USING (empresa_id = get_user_empresa_id());

-- Políticas Pagos Cuenta Corriente
DROP POLICY IF EXISTS "Todo sobre pagos cuenta corriente empresa" ON public.pagos_cuenta_corriente; CREATE POLICY "Todo sobre pagos cuenta corriente empresa" ON public.pagos_cuenta_corriente FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.cuentas_corrientes 
        WHERE id = pagos_cuenta_corriente.cuenta_corriente_id 
        AND empresa_id = get_user_empresa_id()
    )
);

-- NOTA: El campo "costo" de la tabla Stock se protegerá en el Frontend (React) o mediante vistas en etapas avanzadas 
-- para evitar que los Empleados lo observen al hacer peticiones GET a la API.

-- ========================================================================================
-- RE-HABILITACIÓN AUTOMÁTICA DE CUENTAS ESPECIALES (PROGRAMADOR Y PREMIUM)
-- ========================================================================================
DO $$
DECLARE
    prog_id UUID;
    prem_id UUID;
    emp_prog_id UUID;
    emp_prem_id UUID;
BEGIN
    -- 1. Buscar IDs en auth.users
    SELECT id INTO prog_id FROM auth.users WHERE email = 'prueba_tiendaropa2026@hotmail.com';
    SELECT id INTO prem_id FROM auth.users WHERE email = 'cache_tienda2026@hotmail.com';

    -- 2. Habilitar Programador
    IF prog_id IS NOT NULL THEN
        -- Crear/Asegurar Empresa si no existe
        IF NOT EXISTS (SELECT 1 FROM public.empresas WHERE email_contacto = 'prueba_tiendaropa2026@hotmail.com') THEN
            INSERT INTO public.empresas (nombre, email_contacto, plan, activa)
            VALUES ('STRAJE SISTEMAS', 'prueba_tiendaropa2026@hotmail.com', 'programador', true);
        END IF;
        
        SELECT id INTO emp_prog_id FROM public.empresas WHERE email_contacto = 'prueba_tiendaropa2026@hotmail.com' LIMIT 1;
        UPDATE public.empresas SET plan = 'programador', activa = true WHERE id = emp_prog_id;

        -- Crear/Asegurar Perfil de Usuario
        INSERT INTO public.usuarios (id, empresa_id, rol, nombre, activo)
        VALUES (prog_id, emp_prog_id, 'dueño', 'ADMIN PROGRAMADOR', true)
        ON CONFLICT (id) DO UPDATE SET empresa_id = EXCLUDED.empresa_id, rol = 'dueño', activo = true;
    END IF;

    -- 3. Habilitar Cliente Premium (Cache Tienda)
    IF prem_id IS NOT NULL THEN
        -- Crear/Asegurar Empresa si no existe
        IF NOT EXISTS (SELECT 1 FROM public.empresas WHERE email_contacto = 'cache_tienda2026@hotmail.com') THEN
            INSERT INTO public.empresas (nombre, email_contacto, plan, activa)
            VALUES ('CACHE TIENDA', 'cache_tienda2026@hotmail.com', 'premium', true);
        END IF;

        SELECT id INTO emp_prem_id FROM public.empresas WHERE email_contacto = 'cache_tienda2026@hotmail.com' LIMIT 1;
        UPDATE public.empresas SET plan = 'premium', activa = true WHERE id = emp_prem_id;

        INSERT INTO public.usuarios (id, empresa_id, rol, nombre, activo)
        VALUES (prem_id, emp_prem_id, 'dueño', 'CLIENTE PREMIUM', true)
        ON CONFLICT (id) DO UPDATE SET empresa_id = EXCLUDED.empresa_id, rol = 'dueño', activo = true;
    END IF;
END $$;

-- Tabla: HISTORIAL_STOCK (Auditoría de movimientos de inventario)
CREATE TABLE IF NOT EXISTS public.historial_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    prenda_id UUID NOT NULL REFERENCES public.stock(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    tipo_movimiento TEXT NOT NULL, -- 'entrada', 'salida', 'ajuste_positivo', 'ajuste_negativo'
    cantidad INTEGER NOT NULL,
    motivo TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas Historial Stock
ALTER TABLE public.historial_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver historial stock su empresa" ON public.historial_stock;
CREATE POLICY "Ver historial stock su empresa" ON public.historial_stock 
FOR SELECT USING (empresa_id = get_user_empresa_id());

DROP POLICY IF EXISTS "Insertar historial stock su empresa" ON public.historial_stock;
CREATE POLICY "Insertar historial stock su empresa" ON public.historial_stock 
FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());
