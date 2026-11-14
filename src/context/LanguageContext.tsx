import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { Language } from '../i18n/types';
import { SUPPORTED_LANGUAGES } from '../i18n/types';
import { translations } from '../i18n';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

const STORAGE_KEY = 'straje_language';

// Helper de detección inicial de idioma
const detectInitialLanguage = (): Language => {
  // 1. Verificar preferencia guardada en localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language;
    if (saved && ['es', 'en', 'pt'].includes(saved)) {
      return saved;
    }
  } catch (e) {
    // Silencioso en caso de SSR o restricciones de storage
  }

  // 2. Detección automática por idioma del navegador
  try {
    const browserLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
    if (browserLang.startsWith('pt')) return 'pt';
    if (browserLang.startsWith('en')) return 'en';
  } catch (e) {
    // Fallback a español
  }

  // 3. Por defecto español
  return 'es';
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: async () => {},
  t: (key: string) => key,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => detectInitialLanguage());

  // Sincronizar con el perfil del usuario si viene un idioma guardado en la base de datos
  useEffect(() => {
    if (profile?.permisos?.idioma && ['es', 'en', 'pt'].includes(profile.permisos.idioma)) {
      const userLang = profile.permisos.idioma as Language;
      setLanguageState(userLang);
      try {
        localStorage.setItem(STORAGE_KEY, userLang);
      } catch (e) {}
    }
  }, [profile?.permisos?.idioma]);

  // Cambiar idioma con persistencia en localStorage y perfil de usuario
  const setLanguage = useCallback(async (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.error('Error saving language in localStorage:', e);
    }

    // Si el usuario está autenticado, persistimos su idioma en sus permisos de usuario en Supabase
    if (profile?.id) {
      try {
        const currentPermisos = profile.permisos || {};
        await supabase
          .from('usuarios')
          .update({
            permisos: {
              ...currentPermisos,
              idioma: newLang,
            },
          })
          .eq('id', profile.id);
      } catch (err) {
        console.warn('No se pudo guardar el idioma en el perfil de usuario:', err);
      }
    }
  }, [profile]);

  // Función de traducción t('clave.subclave', { var: 'valor' })
  const t = useCallback((path: string, params?: Record<string, string | number>): string => {
    const keys = path.split('.');
    
    // 1. Buscar en el idioma seleccionado
    let value: any = (translations as any)[language];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }

    // 2. Si no existe en el idioma actual, fallback a español
    if (value === undefined || typeof value !== 'string') {
      let fallbackValue: any = translations.es;
      for (const k of keys) {
        if (fallbackValue && typeof fallbackValue === 'object' && k in fallbackValue) {
          fallbackValue = fallbackValue[k];
        } else {
          fallbackValue = undefined;
          break;
        }
      }
      value = fallbackValue;
    }

    // 3. Si sigue sin existir, devolver la clave
    if (value === undefined || typeof value !== 'string') {
      return path;
    }

    // 4. Reemplazar parámetros {paramName}
    if (params) {
      let interpolated = value;
      for (const [pKey, pVal] of Object.entries(params)) {
        interpolated = interpolated.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      }
      return interpolated;
    }

    return value;
  }, [language]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t,
    supportedLanguages: SUPPORTED_LANGUAGES,
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
