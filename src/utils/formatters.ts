/**
 * Convierte un texto a Title Case (La Primera Letra De Cada Palabra En Mayúscula)
 * Ej: "la confecion prenda" -> "La Confecion Prenda"
 */
export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Formatea un número como moneda con separador de miles
 * Ej: 200000 -> "$200.000"
 */
export const formatMoney = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0';
  return '$' + amount.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

/**
 * Convierte un texto a Mayúsculas sostenidas
 */
export const toUpperCase = (str: string): string => {
  return str ? str.toUpperCase() : '';
};
