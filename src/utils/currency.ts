export type CurrencyCode = 'ARS' | 'USD' | 'EUR' | 'BRL' | 'CLP' | 'UYU' | 'PYG' | 'BOB';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  country: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'ARS', symbol: '$', name: 'Pesos Argentinos', flag: '🇦🇷', country: 'Argentina' },
  { code: 'USD', symbol: '$', name: 'Dólares (USD)', flag: '🇺🇸', country: 'Estados Unidos / Global' },
  { code: 'EUR', symbol: '€', name: 'Euros (EUR)', flag: '🇪🇺', country: 'Europa' },
  { code: 'BRL', symbol: 'R$', name: 'Reales (BRL)', flag: '🇧🇷', country: 'Brasil' },
  { code: 'CLP', symbol: '$', name: 'Pesos Chilenos (CLP)', flag: '🇨🇱', country: 'Chile' },
  { code: 'UYU', symbol: '$', name: 'Pesos Uruguayos (UYU)', flag: '🇺🇾', country: 'Uruguay' },
  { code: 'PYG', symbol: '₲', name: 'Guaraníes (PYG)', flag: '🇵🇾', country: 'Paraguay' },
  { code: 'BOB', symbol: 'Bs', name: 'Bolivianos (BOB)', flag: '🇧🇴', country: 'Bolivia' },
];

// Cotizaciones base de respaldo (ARS por cada unidad de moneda extranjera)
// 1 unidad extranjera = X ARS
export const DEFAULT_RATES_IN_ARS: Record<CurrencyCode, number> = {
  ARS: 1,
  USD: 1540,
  EUR: 1680,
  BRL: 275,
  CLP: 1.55,
  UYU: 38,
  PYG: 0.25,
  BOB: 130,
};

let cachedRatesInARS: Record<CurrencyCode, number> = { ...DEFAULT_RATES_IN_ARS };
let lastFetchTime = 0;

// Obtener cotizaciones actualizadas desde API pública con fallback inmediato
export const fetchCurrentRatesInARS = async (): Promise<Record<CurrencyCode, number>> => {
  const now = Date.now();
  // Cache por 15 minutos
  if (now - lastFetchTime < 15 * 60 * 1000 && lastFetchTime > 0) {
    return cachedRatesInARS;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const rates = data.rates || {};
      const arsPerUsd = Number(rates.ARS) || DEFAULT_RATES_IN_ARS.USD;

      const newRates: Record<CurrencyCode, number> = {
        ARS: 1,
        USD: arsPerUsd,
        EUR: rates.EUR ? Math.round(arsPerUsd / rates.EUR) : DEFAULT_RATES_IN_ARS.EUR,
        BRL: rates.BRL ? Math.round(arsPerUsd / rates.BRL) : DEFAULT_RATES_IN_ARS.BRL,
        CLP: rates.CLP ? parseFloat((arsPerUsd / rates.CLP).toFixed(2)) : DEFAULT_RATES_IN_ARS.CLP,
        UYU: rates.UYU ? Math.round(arsPerUsd / rates.UYU) : DEFAULT_RATES_IN_ARS.UYU,
        PYG: rates.PYG ? parseFloat((arsPerUsd / rates.PYG).toFixed(4)) : DEFAULT_RATES_IN_ARS.PYG,
        BOB: rates.BOB ? Math.round(arsPerUsd / rates.BOB) : DEFAULT_RATES_IN_ARS.BOB,
      };

      cachedRatesInARS = newRates;
      lastFetchTime = now;
      return newRates;
    }
  } catch (e) {
    console.warn('Fallback a cotizaciones offline para conversión de moneda:', e);
  }

  return cachedRatesInARS;
};

/**
 * Fórmula estricta requerida por PUNTO 2:
 * "Calcular el precio equivalente tomando el valor en ARS dividido la cotización vigente
 * de la moneda elegida y redondear siempre hacia abajo (Math.floor)."
 */
export const calculateConvertedPrice = (
  priceInARS: number,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, number> = cachedRatesInARS
): number => {
  if (currency === 'ARS') return priceInARS;
  const rateInARS = rates[currency] || DEFAULT_RATES_IN_ARS[currency] || 1;
  return Math.floor(priceInARS / rateInARS);
};

export const formatCurrencyAmount = (amount: number, currency: CurrencyCode): string => {
  const info = SUPPORTED_CURRENCIES.find(c => c.code === currency);
  const symbol = info?.symbol || '$';
  const formattedNumber = amount.toLocaleString('es-AR');
  return `${symbol} ${formattedNumber} ${currency}`;
};

/**
 * Detección automática de moneda según país del usuario
 */
export const getCurrencyByCountry = (countryName: string = ''): CurrencyCode => {
  const c = countryName.toLowerCase();
  if (c.includes('argentin')) return 'ARS';
  if (c.includes('brasil') || c.includes('brazil')) return 'BRL';
  if (c.includes('chile')) return 'CLP';
  if (c.includes('uruguay')) return 'UYU';
  if (c.includes('paraguay')) return 'PYG';
  if (c.includes('bolivia')) return 'BOB';
  if (
    c.includes('españ') || c.includes('spain') || 
    c.includes('italia') || c.includes('italy') || 
    c.includes('alemania') || c.includes('germany') || 
    c.includes('francia') || c.includes('france') || 
    c.includes('portugal') || c.includes('europe')
  ) {
    return 'EUR';
  }
  return 'USD';
};

/**
 * Precios base oficiales definidos en Punto 2:
 * - Estándar: $30.000 ARS regular → $15.000 ARS promo nuevos usuarios (-50%)
 * - Premium: $60.000 ARS regular → $30.000 ARS promo nuevos usuarios (-50%)
 */
export const BASE_PRICES_ARS = {
  estandar: {
    regular: 30000,
    promo: 15000,
  },
  premium: {
    regular: 60000,
    promo: 30000,
  },
};

/**
 * Información de estado del período de prueba con contador de días restantes:
 * - Durante los primeros 180 días (6 meses): aplica -50% promocional
 * - Una vez transcurridos los 180 días: finaliza la promo y pasa a precio regular
 */
export interface UserPromoStatus {
  isNewUser: boolean;
  daysPassed: number;
  daysRemaining: number;
  monthsRemaining: number;
  promoEndDate: string;
}

export const getUserPromoStatus = (fechaRegistro?: string | null): UserPromoStatus => {
  const TOTAL_PROMO_DAYS = 180; // 6 meses de prueba
  
  if (!fechaRegistro) {
    // Cuenta nueva sin registro previo registrado
    return {
      isNewUser: true,
      daysPassed: 0,
      daysRemaining: TOTAL_PROMO_DAYS,
      monthsRemaining: 6,
      promoEndDate: new Date(Date.now() + TOTAL_PROMO_DAYS * 86400000).toLocaleDateString(),
    };
  }

  try {
    const reg = new Date(fechaRegistro);
    if (isNaN(reg.getTime())) {
      return {
        isNewUser: true,
        daysPassed: 0,
        daysRemaining: TOTAL_PROMO_DAYS,
        monthsRemaining: 6,
        promoEndDate: new Date(Date.now() + TOTAL_PROMO_DAYS * 86400000).toLocaleDateString(),
      };
    }

    const now = new Date();
    const diffMs = now.getTime() - reg.getTime();
    const daysPassed = Math.max(0, Math.floor(diffMs / (1000 * 3600 * 24)));
    const daysRemaining = Math.max(0, TOTAL_PROMO_DAYS - daysPassed);
    const monthsRemaining = Math.max(0, Math.ceil(daysRemaining / 30));
    const endDate = new Date(reg.getTime() + TOTAL_PROMO_DAYS * 86400000);

    return {
      isNewUser: daysRemaining > 0,
      daysPassed,
      daysRemaining,
      monthsRemaining,
      promoEndDate: endDate.toLocaleDateString(),
    };
  } catch (e) {
    return {
      isNewUser: true,
      daysPassed: 0,
      daysRemaining: TOTAL_PROMO_DAYS,
      monthsRemaining: 6,
      promoEndDate: new Date(Date.now() + TOTAL_PROMO_DAYS * 86400000).toLocaleDateString(),
    };
  }
};

/**
 * Backward compatibility wrapper
 */
export const checkIsNewUser = (fechaRegistro?: string | null): boolean => {
  return getUserPromoStatus(fechaRegistro).isNewUser;
};
