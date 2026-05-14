import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  LogOut, 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  BarChart2, 
  Settings, 
  History, 
  Package,
  ShoppingCart,
  Calendar,
  MessageCircle,
  Scissors,
  Waves,
  LayoutGrid
} from 'lucide-react'

export const DashboardLayout = () => {
  const { profile, signOut } = useAuth()
  const [isHovered, setIsHovered] = useState(false)
  const isDueno = profile?.rol === 'dueño' || profile?.rol === 'programador'

  const navItemClass = (isActive: boolean) => 
    `flex items-center gap-3 px-4 py-3 rounded-semi font-bold transition-all ${
      isActive ? 'bg-brand-black text-brand-white shadow-btn' : 'text-brand-gray hover:bg-brand-lightGray hover:text-brand-black'
    } ${!isHovered ? 'md:justify-center md:px-0' : ''}`

  const spanClass = `transition-all duration-300 whitespace-nowrap ${!isHovered ? 'md:opacity-0 md:w-0' : 'opacity-100'}`

  // Helper para verificar permisos de módulo
  const hasPermission = (key: string) => {
    if (isDueno) return true
    if (!profile?.permisos) return true // Por defecto si no hay JSON de permisos, ve todo (compatibilidad)
    return profile.permisos[key] !== false
  }

  return (
    <div className="min-h-screen bg-brand-lightGray flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Colapsable */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`bg-brand-white shadow-xl flex flex-col transition-all duration-300 ease-in-out border-r border-brand-gray/10 z-[100] ${
          isHovered ? 'w-full md:w-64' : 'w-full md:w-20'
        }`}
      >
        <div className={`p-6 border-b border-brand-gray/10 flex items-center gap-3 overflow-hidden ${!isHovered ? 'md:px-4' : ''}`}>
          <div className="w-10 h-10 bg-brand-white rounded-semi flex items-center justify-center shadow-btn flex-shrink-0 overflow-hidden">
            <img src="/pwa-icon.png" alt="Straje.App Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className={`font-black text-xl text-brand-black tracking-tighter italic transition-all duration-300 whitespace-nowrap ${!isHovered ? 'md:opacity-0 md:w-0' : 'opacity-100'}`}>
            STRAJE.APP
          </h1>
        </div>

        <div className="p-4 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <nav className="space-y-2">
            {hasPermission('ver_inicio') && (
              <NavLink to="/dashboard" end className={({isActive}) => navItemClass(isActive)}>
                <LayoutDashboard size={20} className="flex-shrink-0" />
                <span className={spanClass}>INICIO</span>
              </NavLink>
            )}

            {hasPermission('ver_disponibilidad') && (
              <NavLink to="/dashboard/disponibilidad" className={({isActive}) => navItemClass(isActive)}>
                <LayoutGrid size={20} className="flex-shrink-0 text-brand-blue" />
                <span className={spanClass}>DISPONIBILIDAD</span>
              </NavLink>
            )}

            {hasPermission('ver_alquileres') && (
              <NavLink to="/dashboard/alquileres" className={({isActive}) => navItemClass(isActive)}>
                <Calendar size={20} className="flex-shrink-0" />
                <span className={spanClass}>ALQUILERES</span>
              </NavLink>
            )}

            {hasPermission('ver_ventas') && (
              <NavLink to="/dashboard/ventas" className={({isActive}) => navItemClass(isActive)}>
                <ShoppingCart size={20} className="flex-shrink-0" />
                <span className={spanClass}>VENTAS</span>
              </NavLink>
            )}

            {hasPermission('ver_caja') && (
              <NavLink to="/dashboard/caja" className={({isActive}) => navItemClass(isActive)}>
                <div className="flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className={spanClass}>CAJA DIARIA</span>
              </NavLink>
            )}

            {hasPermission('ver_cuentacorriente') && (
              <NavLink to="/dashboard/cuenta-corriente" className={({isActive}) => navItemClass(isActive)}>
                <MessageCircle size={20} className="flex-shrink-0" />
                <span className={spanClass}>CTA. CORRIENTE</span>
              </NavLink>
            )}

            {hasPermission('ver_troqueles') && (
              <NavLink to="/dashboard/troqueles" className={({isActive}) => navItemClass(isActive)}>
                <Scissors size={20} className="flex-shrink-0" />
                <span className={spanClass}>TROQUELES</span>
              </NavLink>
            )}

            {hasPermission('ver_preparar') && (
              <NavLink to="/dashboard/pedidos-preparar" className={({isActive}) => navItemClass(isActive)}>
                <Package size={20} className="flex-shrink-0" />
                <span className={spanClass}>A PREPARAR</span>
              </NavLink>
            )}

            {hasPermission('ver_lavanderia') && (
              <NavLink to="/dashboard/lavanderia" className={({isActive}) => navItemClass(isActive)}>
                <Waves size={20} className="flex-shrink-0" />
                <span className={spanClass}>LAVANDERÍA</span>
              </NavLink>
            )}

            {hasPermission('ver_inventario') && (
              <NavLink to="/dashboard/inventario" className={({isActive}) => navItemClass(isActive)}>
                <Package size={20} className="flex-shrink-0" />
                <span className={spanClass}>INVENTARIO</span>
              </NavLink>
            )}

            {hasPermission('ver_historial_stock') && (
              <NavLink to="/dashboard/historial-stock" className={({isActive}) => navItemClass(isActive)}>
                <History size={20} className="flex-shrink-0" />
                <span className={spanClass}>HISTORIAL STOCK</span>
              </NavLink>
            )}

            {hasPermission('ver_rentabilidad') && (
              <NavLink to="/dashboard/rentabilidad" className={({isActive}) => navItemClass(isActive)}>
                <BarChart2 size={20} className="flex-shrink-0" />
                <span className={spanClass}>RENTABILIDAD</span>
              </NavLink>
            )}

            {hasPermission('ver_historial_caja') && (
              <NavLink to="/dashboard/historial" className={({isActive}) => navItemClass(isActive)}>
                <BarChart2 size={20} className="flex-shrink-0" />
                <span className={spanClass}>HISTORIAL CAJA</span>
              </NavLink>
            )}

            {hasPermission('ver_empleados') && (
              <NavLink to="/dashboard/empleados" className={({isActive}) => navItemClass(isActive)}>
                <Users size={20} className="flex-shrink-0" />
                <span className={spanClass}>EMPLEADOS</span>
              </NavLink>
            )}
          </nav>
        </div>

        <div className={`p-4 border-t border-brand-gray/10 transition-all ${!isHovered ? 'md:px-2' : ''}`}>
          {hasPermission('ver_configuracion') && (
            <NavLink to="/dashboard/configuracion" className={({isActive}) => `flex items-center gap-3 mb-4 px-4 py-2 rounded-semi text-xs font-bold transition-all ${isActive ? 'bg-brand-blue text-white shadow-md' : 'bg-brand-lightGray text-brand-gray hover:text-brand-black'} ${!isHovered ? 'md:justify-center md:px-0' : ''}`}>
              <Settings size={18} className="flex-shrink-0" />
              <span className={spanClass}>CONFIGURACIÓN</span>
            </NavLink>
          )}

          <div className={`flex items-center gap-3 mb-4 px-2 overflow-hidden transition-all ${!isHovered ? 'md:justify-center md:px-0' : ''}`}>
            <UserCircle size={32} className="text-brand-gray flex-shrink-0" />
            <div className={`transition-all duration-300 ${!isHovered ? 'md:opacity-0 md:w-0' : 'opacity-100'}`}>
              <p className="text-[10px] font-black text-brand-black truncate uppercase">{profile?.nombre}</p>
              <p className="text-[9px] text-brand-blue uppercase font-black">{profile?.rol}</p>
            </div>
          </div>
          <button 
            onClick={signOut}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 rounded-semi transition-all uppercase ${!isHovered ? 'md:p-3' : ''}`}
            title="Cerrar Sesión"
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span className={spanClass}>SALIR</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
