import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../i18n/types';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'navbar' | 'minimal' | 'cards' | 'inline' | 'sidebar';
  className?: string;
  direction?: 'down' | 'up';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  variant = 'navbar',
  className = '',
  direction = 'down'
}) => {
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption = supportedLanguages.find(l => l.code === language) || supportedLanguages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  // Variante CARDS (ideal para la página de Configuración)
  if (variant === 'cards') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
        {supportedLanguages.map((opt) => {
          const isSelected = opt.code === language;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => handleSelect(opt.code)}
              className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-brand-blue bg-blue-50/50 shadow-md scale-[1.02]'
                  : 'border-brand-gray/20 hover:border-brand-gray/40 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" role="img" aria-label={opt.label}>{opt.flag}</span>
                <div>
                  <p className="font-black text-brand-black text-sm">{opt.label}</p>
                  <p className="text-[10px] text-brand-gray font-bold uppercase">{opt.shortLabel}</p>
                </div>
              </div>
              {isSelected && <Check size={18} className="text-brand-blue font-bold" />}
            </button>
          );
        })}
      </div>
    );
  }

  // Variante INLINE (botones horizontales compactos)
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center p-1 bg-brand-lightGray/80 rounded-full border border-brand-gray/20 ${className}`}>
        {supportedLanguages.map((opt) => {
          const isSelected = opt.code === language;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => handleSelect(opt.code)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
                isSelected
                  ? 'bg-brand-black text-white shadow-sm'
                  : 'text-brand-gray hover:text-brand-black'
              }`}
            >
              <span className="text-sm">{opt.flag}</span>
              <span>{opt.shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Menú desplegable estándar (navbar o sidebar)
  const isUp = direction === 'up';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 md:py-2 rounded-full bg-white/95 hover:bg-white border border-brand-gray/30 shadow-sm hover:shadow transition-all text-brand-black font-black text-xs uppercase"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Cambiar idioma / Change language / Mudar idioma"
      >
        <span className="text-base leading-none">{currentOption.flag}</span>
        <span className="text-[11px] font-black tracking-wider">{currentOption.shortLabel}</span>
        <Globe size={13} className="text-brand-gray" />
        <ChevronDown size={11} className={`text-brand-gray transition-transform duration-200 ${isOpen ? (isUp ? '' : 'rotate-180') : (isUp ? 'rotate-180' : '')}`} />
      </button>

      {isOpen && (
        <div 
          className={`absolute right-0 ${
            isUp ? 'bottom-full mb-2' : 'top-full mt-2'
          } w-48 rounded-2xl bg-white shadow-2xl border border-brand-gray/20 py-2 z-[9999] animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="px-3 py-1.5 border-b border-brand-gray/10 text-[10px] font-black uppercase tracking-wider text-brand-gray">
            Idioma / Language
          </div>
          <div className="py-1">
            {supportedLanguages.map((opt) => {
              const isSelected = opt.code === language;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleSelect(opt.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition-colors ${
                    isSelected
                      ? 'bg-brand-blue/10 text-brand-blue font-black'
                      : 'text-brand-black hover:bg-brand-lightGray'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">{opt.flag}</span>
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-brand-blue font-black" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
