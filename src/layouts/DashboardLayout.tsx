import { Outlet, NavLink } from 'react-router-dom'
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
  Calendar
} from 'lucide-react'

export const DashboardLayout = () => {
  const { profile, signOut } = useAuth()
  const isDueno = profile?.rol === 'dueño' || profile?.rol === 'programador'

  return (
    <div className="min-h-screen bg-brand-lightGray flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-brand-white shadow-xl flex flex-col">
        <div className="p-6 border-b border-brand-gray/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-white rounded-semi flex items-center justify-center shadow-btn flex-shrink-0 overflow-hidden">
            <img src="/pwa-icon.png" alt="Straje.App Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-bold text-xl text-brand-black tracking-wide italic">STRAJE.APP</h1>
        </div>

        <div className="p-4 flex-1">
          <nav className="space-y-2">
            <NavLink 
              to="/dashboard" 
              end
              className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-semi font-bold transition-colors ${isActive ? 'bg-brand-black text-brand-white shadow-btn' : 'text-brand-gray hover:bg-brand-lightGray hover:text-brand-black'}`}
            >
              <LayoutDashboard size={20} />
              <span>INICIO</span>
            </NavLink>

            <NavLink 
              to="/dashboard/alquileres" 
              className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-semi font-bold transition-colors ${isActive ? 'bg-brand-black text-brand-white shadow-btn' : 'text-brand-gray hover:bg-brand-lightGray hover:text-brand-black'}`}
            >
              <Calendar size={20} />
              <span>ALQUILERES</span>
            </NavLink>

            <NavLink 
              to="/dashboard/ventas" 
              className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-semi font-bold transition-colors ${isActive ? 'bg-brand-black text-brand-white shadow-btn' : 'text-brand-gray hover:bg-brand-lightGray hover:text-brand-black'}`}
            >
              <ShoppingCart size={20} />
              <span>VENTAS</span>
            </NavLink>

            <NavLink 
              to="/dashboard/caja" 
              className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-semi font-bold transition-colors ${isActive ? 'bg-brand-black text-brand-white shadow-btn' : 'text-brand-gray hover:bg-brand-lightGray hover:text-brand-black'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>CAJA DIARIA</span>
            </NavLink>

            {/* Inventario protegido (Punto 5) */}
            {(isDueno || profile?.permisos?.puede_ver_inventario !== false) && (
              <NavLink 
                to="/dashboard/inventario" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-semi font-bold transition-colors ${isActive ? 'bg-brand-black text-brand-white shadow-btn' : 'text-brand-gray hover:bg-brand-lightGray hover:text-brand-black'}`}
              >
                <Package size={20} />
                <span>INVENTARIO</span>
              </NavLink>
            )}

            {/* Historial de Movimientos de Stock (Punto 3) */}
            {(isDueno || profile?.permisos?.puede_ver_inventario !== false) && (
              <NavLink 
                to="/dashboard/historial-stock" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-semi font-bold transition-colors ${isActive ? 'bg-brand-blue text-brand-white shadow-md' : 'text-brand-gray hover:bg-brand-lightGray hover:text-brand-black'}`}
              >
                <History size={20} />
                <span>HISTORIAL STOCK</span>
              </NavLink>
            )}

            {/* Historial General protegido (Punto 5) */}
            {(isDueno || profile?.permisos?.puede_ver_historial) && (
              <NavLink
                to="/dashboard/historial"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-semi font-bold transition-colors ${
                    isActive 
                      ? 'bg-brand-blue text-brand-white shadow-md' 
                      : 'text-brand-gray hover:bg-brand-lightGray hover:text-brand-black'
                  }`
                }
              >
                <BarChart2 size={20} />
                <span>HISTORIAL CAJA</span>
              </NavLink>
            )}

            {isDueno && (
              <NavLink 
                to="/dashboard/empleados" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-semi font-bold transition-colors ${isActive ? 'bg-brand-black text-brand-white shadow-btn' : 'text-brand-gray hover:bg-brand-lightGray hover:text-brand-black'}`}
              >
                <Users size={20} />
                <span>EMPLEADOS</span>
              </NavLink>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-brand-gray/10">
          {/* Configuración oculta para empleados (Punto 17) */}
          {isDueno && (
            <NavLink 
              to="/dashboard/configuracion"
              className={({isActive}) => `flex items-center gap-2 mb-4 px-4 py-2 rounded-semi text-sm font-bold transition-all ${isActive ? 'bg-brand-blue text-white shadow-md' : 'bg-brand-lightGray text-brand-gray hover:text-brand-black'}`}
            >
              <Settings size={16} />
              <span>CONFIGURACIÓN</span>
            </NavLink>
          )}

          <div className="flex items-center gap-3 mb-4 px-2">
            <UserCircle size={36} className="text-brand-gray" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-brand-black truncate uppercase">{profile?.nombre}</p>
              <p className="text-[10px] text-brand-blue uppercase font-black">{profile?.rol}</p>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-semi transition-colors uppercase"
          >
            <LogOut size={16} />
            CERRAR SESIÓN
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
