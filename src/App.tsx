import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthLayout } from './layouts/AuthLayout'
import { DashboardLayout } from './layouts/DashboardLayout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Employees } from './pages/dashboard/Employees'
import { Stock } from './pages/dashboard/Stock'
import { Alquileres } from './pages/dashboard/Alquileres'
import { Ventas } from './pages/dashboard/Ventas'
import { SubscriptionGuard } from './components/SubscriptionGuard'
import { Caja } from './pages/dashboard/Caja'
import { Historial } from './pages/dashboard/Historial'
import { Config } from './pages/dashboard/Config'
import { HistorialStock } from './pages/dashboard/HistorialStock'

// Componente para proteger las rutas (solo usuarios logueados)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen bg-brand-lightGray" />
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
        <Route index element={<Dashboard />} />
        <Route path="inventario" element={<Stock />} />
        <Route path="alquileres" element={<Alquileres />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="empleados" element={<Employees />} />
        <Route path="caja" element={<Caja />} />
        <Route path="historial" element={<Historial />} />
        <Route path="historial-stock" element={<HistorialStock />} />
        <Route path="configuracion" element={<Config />} />
      </Route>

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App
