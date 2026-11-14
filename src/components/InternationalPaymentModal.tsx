import React, { useState } from 'react';
import type { CurrencyCode } from '../utils/currency';
import { 
  SUPPORTED_CURRENCIES, 
  formatCurrencyAmount 
} from '../utils/currency';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  X, 
  Globe, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface InternationalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  planKey: 'estandar' | 'premium';
  amount: number;
  currency: CurrencyCode;
  isNewUser: boolean;
  onSuccess: () => void;
}

export const InternationalPaymentModal: React.FC<InternationalPaymentModalProps> = ({
  isOpen,
  onClose,
  planTitle,
  planKey,
  amount,
  currency,
  isNewUser,
  onSuccess,
}) => {
  const { empresa, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario de Tarjeta Internacional (Visa / Mastercard / Amex)
  const [cardData, setCardData] = useState({
    name: '',
    number: '',
    expiry: '',
    cvc: '',
    country: 'US',
  });

  if (!isOpen) return null;

  const currencyInfo = SUPPORTED_CURRENCIES.find((c) => c.code === currency) || SUPPORTED_CURRENCIES[1];

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    }
    return value;
  };

  const formatExpiry = (value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    if (clean.length >= 2) {
      return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
    }
    return clean;
  };

  const handleSubmitCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanNum = cardData.number.replace(/\s+/g, '');
    if (cleanNum.length < 15) {
      setError('Por favor, ingresa un número de tarjeta válido (Visa o Mastercard).');
      return;
    }
    if (!cardData.name.trim()) {
      setError('Por favor, ingresa el nombre que figura en la tarjeta.');
      return;
    }
    if (cardData.expiry.length < 5) {
      setError('Ingresa una fecha de expiración válida (MM/AA).');
      return;
    }
    if (cardData.cvc.length < 3) {
      setError('Ingresa el código CVC/CVV de seguridad.');
      return;
    }

    setLoading(true);

    try {
      if (empresa?.id) {
        const { error: dbError } = await supabase
          .from('empresas')
          .update({
            plan: planKey === 'premium' ? 'Premium' : 'Estándar',
            subscripcion_activa: true,
            estado_pago: 'al_dia',
          })
          .eq('id', empresa.id);

        if (dbError) throw dbError;
        await refreshProfile();
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error al procesar pago internacional:', err);
      setError(err.message || 'No se pudo procesar el pago con tarjeta internacional.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden border border-brand-gray/20 animate-in zoom-in-95 duration-200">
        
        {/* ENCABEZADO */}
        <div className="bg-brand-black text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{currencyInfo.flag}</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-blue flex items-center gap-1">
              <Globe size={13} /> Pago Internacional con Tarjeta ({currency})
            </span>
          </div>

          <h3 className="text-2xl font-black uppercase tracking-tighter italic">
            {planTitle}
          </h3>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-4xl font-black text-white">
              {formatCurrencyAmount(amount, currency)}
            </span>
            <span className="text-xs text-white/60 font-bold uppercase">
              {currency} / mes
            </span>
          </div>

          {isNewUser && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-black uppercase tracking-wider">
              <Sparkles size={14} /> -50% durante los primeros 6 meses de prueba
            </div>
          )}
        </div>

        {/* CONTENIDO DEL MODAL */}
        <div className="p-6 space-y-6">
          {success ? (
            <div className="py-10 text-center space-y-3 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="text-2xl font-black text-brand-black uppercase">¡Pago Aprobado!</h4>
              <p className="text-sm text-brand-gray font-medium">
                Tu suscripción internacional ha sido activada con éxito. Actualizando tu plataforma...
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* LOGOS DE TARJETAS ACEPTADAS */}
              <div className="flex items-center justify-between p-3.5 bg-brand-lightGray/60 rounded-xl border border-brand-gray/15">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-brand-blue" />
                  <span className="text-xs font-black uppercase text-brand-black tracking-wide">
                    Tarjeta de Crédito / Débito
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-black">VISA</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-black">MASTERCARD</span>
                </div>
              </div>

              <form onSubmit={handleSubmitCardPayment} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-brand-gray mb-1">
                    Nombre en la Tarjeta
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="TITULAR DE LA TARJETA"
                    value={cardData.name}
                    onChange={(e) => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 rounded-xl border border-brand-gray/30 text-xs font-bold uppercase focus:ring-2 focus:ring-brand-blue outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-brand-gray mb-1">
                    Número de Tarjeta (Visa / Mastercard)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={19}
                      placeholder="4000 1234 5678 9010"
                      value={cardData.number}
                      onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-brand-gray/30 text-xs font-bold tracking-wider focus:ring-2 focus:ring-brand-blue outline-none"
                    />
                    <CreditCard className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-brand-gray mb-1">
                      Vencimiento (MM/AA)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="MM/AA"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-brand-gray/30 text-xs font-bold text-center focus:ring-2 focus:ring-brand-blue outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-brand-gray mb-1">
                      CVC / CVV
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="123"
                      value={cardData.cvc}
                      onChange={(e) => setCardData({ ...cardData, cvc: e.target.value.replace(/[^0-9]/g, '') })}
                      className="w-full px-4 py-3 rounded-xl border border-brand-gray/30 text-xs font-bold text-center focus:ring-2 focus:ring-brand-blue outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-brand-blue hover:bg-blue-600 disabled:opacity-50 text-white font-black rounded-xl uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="animate-pulse">Procesando Pago Seguro...</span>
                    ) : (
                      <>
                        <Lock size={16} />
                        Pagar {formatCurrencyAmount(amount, currency)}
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="pt-2 border-t border-brand-gray/10 flex items-center justify-center gap-4 text-[10px] text-brand-gray font-bold uppercase">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={14} className="text-green-600" /> Cifrado 256-Bit SSL
                </span>
                <span className="flex items-center gap-1">
                  <Lock size={14} className="text-brand-blue" /> Transacción Segura
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
