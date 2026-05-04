-- ========================================================================================
-- DOCUMENTO MAESTRO SQL - STRAJE.APP
-- Este script genera la base de datos completa con tablas, roles, enums y políticas de RLS.
-- ========================================================================================

-- 1. LIMPIEZA PREVIA (Opcional, útil para reiniciar la DB en desarrollo)
DROP TABLE IF EXISTS public.caja CASCADE;
DROP TABLE IF EXISTS public.cierres_diarios CASCADE;
DROP TABLE IF EXISTS public.venta_detalles CASCADE;
DROP TABLE IF EXISTS public.ventas CASCADE;
DROP TABLE IF EXISTS public.alquiler_detalles CASCADE;
DROP TABLE IF EXISTS public.alquileres CASCADE;
DROP TABLE IF EXISTS public.stock CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;

DROP TYPE IF EXISTS plan_suscripcion CASCADE;
DROP TYPE IF EXISTS rol_usuario CASCADE;
DROP TYPE IF EXISTS estado_prenda CASCADE;
DROP TYPE IF EXISTS estado_alquiler CASCADE;
DROP TYPE IF EXISTS tipo_movimiento CASCADE;

-- 2. EXTENSIONES Y TIPOS DE DATOS (ENUMS)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE plan_suscripcion AS ENUM ('programador', 'premium', 'estandar');
CREATE TYPE rol_usuario AS ENUM ('dueño', 'empleado');
CREATE TYPE estado_prenda AS ENUM ('disponible', 'alquilado', 'reservado', 'lavanderia', 'modista', 'baja');
CREATE TYPE estado_alquiler AS ENUM ('reservado', 'entregado', 'devuelto', 'atrasado');
CREATE TYPE tipo_movimiento AS ENUM ('ingreso', 'egreso');

-- 2. CREACIÓN DE TABLAS

-- Tabla: EMPRESAS (Suscripciones y datos del negocio)
CREATE TABLE public.empresas (
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
    activa BOOLEAN DEFAULT TRUE
);

-- Tabla: USUARIOS (Perfiles asociados a auth.users de Supabase)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    rol rol_usuario NOT NULL DEFAULT 'empleado',
    nombre TEXT NOT NULL,
    permisos JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: STOCK (Inventario de Trajes, Vestidos y Accesorios)
CREATE TABLE public.stock (
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
    estado estado_prenda NOT NULL DEFAULT 'disponible',
    atributos_extra JSONB DEFAULT '{}'::jsonb,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: ALQUILERES (Y Reservas - Núcleo operativo)
CREATE TABLE public.alquileres (
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
CREATE TABLE public.alquiler_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alquiler_id UUID NOT NULL REFERENCES public.alquileres(id) ON DELETE CASCADE,
    prenda_id UUID NOT NULL REFERENCES public.stock(id),
    precio_unitario DECIMAL(10,2) NOT NULL
);

-- Tabla: VENTAS (Venta directa de indumentaria)
CREATE TABLE public.ventas (
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

-- Tabla: VENTA_DETALLES (Prendas dentro de la venta)
CREATE TABLE public.venta_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    prenda_id UUID NOT NULL REFERENCES public.stock(id),
    precio_unitario DECIMAL(10,2) NOT NULL
);

-- Tabla: CAJA (Registro de ingresos y egresos diarios)
CREATE TABLE public.caja (
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
CREATE TABLE public.cierres_diarios (
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


-- 3. SEGURIDAD (ROW LEVEL SECURITY - RLS)

-- Habilitar RLS en todas las tablas para que por defecto nadie vea nada.
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alquileres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_diarios ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Empresas ven solo su perfil" ON public.empresas FOR SELECT USING (id = get_user_empresa_id());
CREATE POLICY "Permitir registro de empresas" ON public.empresas FOR INSERT WITH CHECK (true);

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
CREATE POLICY "Ver propio perfil" ON public.usuarios FOR SELECT USING (id = auth.uid());
CREATE POLICY "Ver usuarios de mi empresa" ON public.usuarios FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Registro propio" ON public.usuarios FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Dueño registra empleados" ON public.usuarios FOR INSERT WITH CHECK (is_dueño_de_empresa(empresa_id));
CREATE POLICY "Dueño edita empleados" ON public.usuarios FOR UPDATE USING (is_dueño_de_empresa(empresa_id));
CREATE POLICY "Dueño elimina empleados" ON public.usuarios FOR DELETE USING (is_dueño_de_empresa(empresa_id));

-- Políticas Stock
CREATE POLICY "Ver stock de su empresa" ON public.stock FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Dueño agrega stock" ON public.stock FOR INSERT WITH CHECK (get_user_rol() = 'dueño' AND empresa_id = get_user_empresa_id());
CREATE POLICY "Todos pueden editar stock" ON public.stock FOR UPDATE USING (empresa_id = get_user_empresa_id());

-- Políticas Alquileres
CREATE POLICY "Ver y editar alquileres de su empresa" ON public.alquileres FOR ALL USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Acceso a alquiler detalles" ON public.alquiler_detalles FOR ALL USING (true);

-- Políticas Ventas
CREATE POLICY "Ver y registrar ventas de su empresa" ON public.ventas FOR ALL USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Acceso a venta detalles" ON public.venta_detalles FOR ALL USING (true);

-- Políticas Caja
CREATE POLICY "Solo lectura para la propia empresa en caja"
    ON public.caja FOR SELECT
    USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Inserción permitida en caja"
    ON public.caja FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Solo lectura para la propia empresa en cierres"
    ON public.cierres_diarios FOR SELECT
    USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Inserción permitida en cierres"
    ON public.cierres_diarios FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id());


-- NOTA: El campo "costo" de la tabla Stock se protegerá en el Frontend (React) o mediante vistas en etapas avanzadas 
-- para evitar que los Empleados lo observen al hacer peticiones GET a la API.
