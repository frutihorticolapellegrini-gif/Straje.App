import React, { useState, useRef, useEffect } from 'react';
import type { CurrencyCode } from '../utils/currency';
import { 
  SUPPORTED_CURRENCIES, 
  getCurrencyByCountry 
} from '../utils/currency';
import { getClientGeoLocation } from '../lib/tracking';
import { Coins, ChevronDown, Check } from 'lucide-react';

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  className?: string;
  variant?: 'compact' | 'expanded';
}

const STORAGE_CURRENCY_KEY = 'straje_currency';

export const useCurrencyState = () => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CURRENCY_KEY) as CurrencyCode;
      if (saved && SUPPORTED_CURRENCIES.some(c => c.code === saved)) {
        return saved;
      }
    } catch (e) {}
    return 'ARS';
  });

  useEffect(() => {
    // Si no había guardada una moneda previa, detectamos por IP del usuario
    const saved = localStorage.getItem(STORAGE_CURRENCY_KEY);
    if (!saved) {
      getClientGeoLocation().then(geo => {
        if (geo?.country) {
          const detected = getCurrencyByCountry(geo.country);
          setCurrencyState(detected);
          try {
            localStorage.setItem(STORAGE_CURRENCY_KEY, detected);
          } catch (e) {}
        }
      }).catch(() => {});
    }
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_CURRENCY_KEY, c);
    } catch (e) {}
  };

  return { currency, setCurrency };
};

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  className = '',
  variant = 'compact'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCurrency = SUPPORTED_CURRENCIES.find(c => c.code === value) || SUPPORTED_CURRENCIES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'expanded') {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${className}`}>
        {SUPPORTED_CURRENCIES.map((cur) => {
          const isSelected = cur.code === value;
          return (
            <button
              key={cur.code}
              type="button"
              onClick={() => onChange(cur.code)}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                isSelected
                  ? 'border-brand-blue bg-blue-50/70 shadow-sm text-brand-black font-black'
                  : 'border-brand-gray/20 bg-white hover:border-brand-gray/40 text-brand-gray'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">{cur.flag}</span>
                <div>
                  <p className="text-xs font-black text-brand-black">{cur.code}</p>
                  <p className="text-[10px] text-brand-gray truncate max-w-[80px]">{cur.name}</p>
                </div>
              </div>
              {isSelected && <Check size={14} className="text-brand-blue font-bold shrink-0" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-brand-gray/20 shadow-sm hover:border-brand-gray/40 transition-all font-black text-xs text-brand-black"
        aria-expanded={isOpen}
      >
        <Coins size={14} className="text-brand-blue" />
        <span className="text-base leading-none">{selectedCurrency.flag}</span>
        <span>{selectedCurrency.code}</span>
        <span className="text-brand-gray font-normal">({selectedCurrency.symbol})</span>
        <ChevronDown size={14} className={`text-brand-gray transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-64 rounded-2xl bg-white shadow-2xl border border-brand-gray/20 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-80 overflow-y-auto custom-scrollbar">
          <div className="px-3 py-1.5 border-b border-brand-gray/10 text-[10px] font-black uppercase tracking-wider text-brand-gray">
            Seleccionar Moneda de Pago
          </div>
          <div className="py-1">
            {SUPPORTED_CURRENCIES.map((cur) => {
              const isSelected = cur.code === value;
              return (
                <button
                  key={cur.code}
                  type="button"
                  onClick={() => {
                    onChange(cur.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-brand-blue font-black'
                      : 'text-brand-black hover:bg-brand-lightGray font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">{cur.flag}</span>
                    <div className="text-left">
                      <p className="font-bold text-brand-black">{cur.name}</p>
                      <p className="text-[10px] text-brand-gray uppercase font-semibold">{cur.code} ({cur.symbol})</p>
                    </div>
                  </div>
                  {isSelected && <Check size={16} className="text-brand-blue font-black shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

