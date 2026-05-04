import React from 'react'
import { X, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface DetalleKPIModalProps {
  tipo: 'ingresos' | 'egresos' | 'prestadas' | 'lavanderia' | null
  onClose: () => void
}

export const DetalleKPIModal: React.FC<DetalleKPIModalProps> = ({ tipo, onClose }) => {
  const navigate = useNavigate()

  if (!tipo) return null

  const getContenido = () => {
    switch (tipo) {
      case 'ingresos':
        return {
          titulo: 'Detalle de Ingresos (30 días)',
          desc: 'Para ver el detalle completo de cada venta o cobro de alquiler, por favor dirígete al Historial.',
          link: '/dashboard/historial'
        }
      case 'egresos':
        return {
          titulo: 'Detalle de Egresos (30 días)',
          desc: 'Todos los gastos registrados en la caja diaria se pueden auditar en el Historial.',
          link: '/dashboard/historial'
        }
      case 'prestadas':
        return {
          titulo: 'Prendas Prestadas',
          desc: 'Puedes ver el detalle de a quién se le prestó cada traje desde el panel de Alquileres.',
          link: '/dashboard/alquileres'
        }
      case 'lavanderia':
        return {
          titulo: 'Prendas en Lavandería',
          desc: 'Las prendas que están sucias o en la tintorería las puedes gestionar desde tu Inventario.',
          link: '/dashboard/stock'
        }
      default:
        return { titulo: '', desc: '', link: '' }
    }
  }

  const { titulo, desc, link } = getContenido()

  return (
    <div className="fixed inset-0 bg-brand-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-brand-white rounded-semi shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        
        <div className="bg-brand-black px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-white">{titulo}</h3>
          <button onClick={onClose} className="p-2 text-brand-gray hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 text-center">
          <p className="text-brand-dark mb-6">{desc}</p>
          <button 
            onClick={() => {
              onClose()
              navigate(link)
            }}
            className="w-full py-3 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-semi flex items-center justify-center gap-2 transition-colors"
          >
            Ir al detalle completo <ExternalLink size={18} />
          </button>
        </div>

      </div>
    </div>
  )
}
