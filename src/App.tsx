import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { AuthLayout } from './layouts/AuthLayout'
import { DashboardLayout } from './layouts/DashboardLayout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Politicas } from './pages/Politicas'
import { SubscriptionGuard } from './components/SubscriptionGuard'

// Lazy loading para todas las vistas del dashboard para acelerar apertura inicial
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Employees = lazy(() => import('./pages/dashboard/Employees').then(m => ({ default: m.Employees })))
const Stock = lazy(() => import('./pages/dashboard/Stock').then(m => ({ default: m.Stock })))
const Alquileres = lazy(() => import('./pages/dashboard/Alquileres').then(m => ({ default: m.Alquileres })))
const Ventas = lazy(() => import('./pages/dashboard/Ventas').then(m => ({ default: m.Ventas })))
const Caja = lazy(() => import('./pages/dashboard/Caja').then(m => ({ default: m.Caja })))
const Historial = lazy(() => import('./pages/dashboard/Historial').then(m => ({ default: m.Historial })))
const Config = lazy(() => import('./pages/dashboard/Config').then(m => ({ default: m.Config })))
const HistorialStock = lazy(() => import('./pages/dashboard/HistorialStock').then(m => ({ default: m.HistorialStock })))
const CuentaCorriente = lazy(() => import('./pages/dashboard/CuentaCorriente').then(m => ({ default: m.CuentaCorriente })))
const Troqueles = lazy(() => import('./pages/dashboard/Troqueles').then(m => ({ default: m.Troqueles })))
const Lavanderia = lazy(() => import('./pages/dashboard/Lavanderia').then(m => ({ default: m.Lavanderia })))
const PedidosPreparar = lazy(() => import('./pages/dashboard/PedidosPreparar').then(m => ({ default: m.PedidosPreparar })))
const Disponibilidad = lazy(() => import('./pages/dashboard/Disponibilidad').then(m => ({ default: m.Disponibilidad })))
const Rentabilidad = lazy(() => import('./pages/dashboard/Rentabilidad').then(m => ({ default: m.Rentabilidad })))
const Metricas = lazy(() => import('./pages/dashboard/Metricas').then(m => ({ default: m.Metricas })))
const VideosPrograma = lazy(() => import('./pages/dashboard/VideosPrograma').then(m => ({ default: m.VideosPrograma })))

// Skeleton de carga instantáneo y elegante
const PageFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-8">
    <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
  </div>
)

// Componente para proteger las rutas (solo usuarios logueados)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen bg-brand-lightGray flex items-center justify-center" />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { session } = useAuth()
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/privacidad" element={<Politicas />} />
      <Route path="/terminos" element={<Politicas />} />
      <Route path="/reembolsos" element={<Politicas />} />
      
      {/* Rutas Públicas (Auth) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/registro" element={<Register />} />
      </Route>

      {/* Rutas Protegidas (Requieren Sesión y Suscripción Activa) */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <SubscriptionGuard>
              <DashboardLayout />
            </SubscriptionGuard>
          </ProtectedRoute>
        } 
      >
        <Route index element={<Suspense fallback={<PageFallback />}><Dashboard /></Suspense>} />
        <Route path="inventario" element={<Suspense fallback={<PageFallback />}><Stock /></Suspense>} />
        <Route path="alquileres" element={<Suspense fallback={<PageFallback />}><Alquileres /></Suspense>} />
        <Route path="ventas" element={<Suspense fallback={<PageFallback />}><Ventas /></Suspense>} />
        <Route path="empleados" element={<Suspense fallback={<PageFallback />}><Employees /></Suspense>} />
        <Route path="caja" element={<Suspense fallback={<PageFallback />}><Caja /></Suspense>} />
        <Route path="cuenta-corriente" element={<Suspense fallback={<PageFallback />}><CuentaCorriente /></Suspense>} />
        <Route path="troqueles" element={<Suspense fallback={<PageFallback />}><Troqueles /></Suspense>} />
        <Route path="lavanderia" element={<Suspense fallback={<PageFallback />}><Lavanderia /></Suspense>} />
        <Route path="pedidos-preparar" element={<Suspense fallback={<PageFallback />}><PedidosPreparar /></Suspense>} />
        <Route path="disponibilidad" element={<Suspense fallback={<PageFallback />}><Disponibilidad /></Suspense>} />
        <Route path="rentabilidad" element={<Suspense fallback={<PageFallback />}><Rentabilidad /></Suspense>} />
        <Route path="historial" element={<Suspense fallback={<PageFallback />}><Historial /></Suspense>} />
        <Route path="historial-stock" element={<Suspense fallback={<PageFallback />}><HistorialStock /></Suspense>} />
        <Route path="metricas" element={<Suspense fallback={<PageFallback />}><Metricas /></Suspense>} />
        <Route path="videos" element={<Suspense fallback={<PageFallback />}><VideosPrograma /></Suspense>} />
        <Route path="configuracion" element={<Suspense fallback={<PageFallback />}><Config /></Suspense>} />
      </Route>

      {/* Redirección por defecto: siempre Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  React.useEffect(() => {
    // Record visit once when app loads
    const recordVisit = async () => {
      try {
        const { supabase } = await import('./lib/supabase');
        await supabase.from('visitas_app').insert({ origen: 'app' });
      } catch (err) {
        console.error("No se pudo registrar la visita:", err);
      }
    };
    recordVisit();
  }, []);

  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <AppRoutes />
        </Router>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
