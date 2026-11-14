# HOJA DE RUTA DE MEJORAS

## PUNTO 1: Sistema Global de Idiomas (i18n) con Persistencia
- **Objetivo:** Implementar un selector de idioma visible en la pantalla principal (Home) que traduzca el 100% de la interfaz de la plataforma.
- **Idiomas mínimos requeridos:** Español (ES), Inglés (EN) y Portugués (PT), dejando preparada la estructura para sumar más idiomas fácilmente.
- **Comportamiento obligatorio:**
  - Detectar inicialmente el idioma/región del navegador o país del usuario, pero permitir cambiarlo manualmente desde el selector.
  - Al elegir un idioma (ej. Inglés), **toda la aplicación** debe traducirse inmediatamente: menús, botones, títulos, formularios, alertas, configuración y textos de suscripción.
  - **Persistencia:** Guardar la elección en `localStorage` (y en el perfil del usuario si está logueado) para que, al cerrar y volver a abrir la app, mantenga siempre el idioma seleccionado hasta que el usuario decida cambiarlo.
- **Criterio de cierre:** Verificar que al cambiar entre ES/EN/PT no queden textos sin traducir y que al recargar la página se conserve el idioma. **Detenerse y pedir confirmación antes de pasar al Punto 2.**

---

## PUNTO 2: Suscripciones con Descuento 50% (Nuevos Usuarios), Multi-moneda y Pagos Globales
- **Objetivo:** Actualizar la sección de suscripciones con precios promocionales para usuarios nuevos, conversión automática a monedas locales y soporte de pago internacional.
- **Descuento para usuarios nuevos:**
  - Mostrar visualmente una etiqueta/banner de oferta: **"-50% durante los primeros 6 meses de prueba"**.
  - **Condición:** Esta oferta solo debe mostrarse y aplicarse a **usuarios nuevos recién registrados** (los usuarios antiguos ven el precio regular).
  - **Valores base en Pesos Argentinos (ARS):**
    - Plan Estándar: ~~$30.000 ARS~~ → **$15.000 ARS** (primeros 6 meses).
    - Plan Premium: ~~$60.000 ARS~~ → **$30.000 ARS** (primeros 6 meses).
- **Selector de Moneda y Conversión Automática:**
  - Aprovechar la detección de país/moneda existente y mostrar **a la vista en la pantalla de suscripciones** un selector claro con las monedas disponibles: **Pesos Argentinos (ARS), Dólares (USD), Euros (EUR), Reales (BRL), Pesos Chilenos (CLP), Pesos Uruguayos (UYU), Guaraníes Paraguayos (PYG) y Bolivianos (BOB)**.
  - **Fórmula de conversión y redondeo:** Calcular el precio equivalente tomando el valor en ARS dividido la cotización vigente de la moneda elegida y **redondear siempre hacia abajo** (`Math.floor`). *Ejemplo: Si el plan promocional está $20.000 ARS y el dólar está a $1.600 ARS ($20.000 / $1.600 = 12.5), al usuario se le muestra y cobra **$12 USD**.*
- **Medios de Pago (Argentina vs. Exterior):**
  - **Argentina (ARS):** Procesar el cobro mediante **Mercado Pago** en pesos argentinos.
  - **Exterior (USD, EUR, BRL, CLP, UYU, PYG, BOB):** Dado que Mercado Pago Argentina solo opera en ARS, habilitar el pago internacional con tarjeta de crédito/débito (vía pasarela internacional como Stripe/PayPal o checkout internacional configurado) mostrando el importe exacto redondeado hacia abajo en la moneda local del usuario, liquidando el ingreso hacia nuestra cuenta.
- **Criterio de cierre:** Probar el cambio de moneda en la vista de suscripciones, verificar el cálculo con `Math.floor`, comprobar que el 50% solo aplique a cuentas nuevas y confirmar que el flujo de pago funciona tanto en ARS como en moneda extranjera. **Detenerse y pedir confirmación antes de pasar al Punto 3.**

---

## PUNTO 3: Rediseño de Pantalla Principal (Home), Planes y Políticas Legales
- **Objetivo:** Configurar la pantalla principal (Home) como punto de entrada obligatorio y enriquecerla visual y comercialmente sin romper el diseño responsive.
- **Requerimientos:**
  1. **Ruta por defecto:** Asegurar que al abrir la aplicación siempre cargue primero la pantalla principal (Home).
  2. **Contenido y estética:** Ampliar la información explicando claramente qué hace la aplicación y sus beneficios. Incorporar colores y detalles visuales llamativos siguiendo la paleta e identidad actual de la app (cuidando móvil, tablet y PC).
  3. **Bloque de Planes y Selector de País/Moneda:** Casi antes del final de la página (antes del footer), mostrar una sección comparativa con los valores de los planes de pago, incluyendo un selector visible de **País / Moneda** para que el visitante vea al instante cuánto cuesta en su moneda local.
  4. **Medios de Pago y Políticas (Footer):** Aclarar explícitamente los medios de pago aceptados (tarjetas internacionales, Mercado Pago, etc.) y actualizar/detallar las **Políticas de Privacidad, Términos y Condiciones y Políticas de Reembolso/Suscripción** cumpliendo con los requisitos exigidos por pasarelas de pago y plataformas web/móviles.
- **Criterio de cierre:** Revisar visualización en celular, tablet y escritorio, comprobando que el selector de país/moneda del Home actualice los precios en tiempo real y que todas las políticas sean accesibles. **Detenerse y pedir confirmación antes de pasar al Punto 4.**

---

## PUNTO 4: Optimización de Velocidad, Limpieza Segura y Actualización Instantánea (Cache/PWA)
- **Objetivo:** Hacer que la app abra de forma instantánea, eliminar código basura sin tocar datos reales y asegurar que las actualizaciones se reflejen al momento tanto en web como en celulares.
- **Requerimientos:**
  1. **Limpieza segura:** Auditar y eliminar archivos huérfanos, imports sin usar, componentes muertos o dependencias que no cumplen ninguna función y ocupan espacio innecesario. **IMPORTANTE:** No tocar ni borrar nada relacionado con la base de datos ni los videos ya cargados por los usuarios.
  2. **Velocidad de apertura:** Optimizar la carga inicial (lazy loading en vistas pesadas, compresión de assets, evitar bloqueos de renderizado) para que no aparezcan pantallas de espera largas.
  3. **Actualización inmediata (Web + App descargada / PWA):** Configurar la estrategia de caché y Service Worker (`skipWaiting` + `clientsClaim` o recarga controlada por versión) para que, cada vez que se suba una mejora al hosting, tanto la versión web como la app instalada en el celular detecten la nueva versión y se actualicen automáticamente al instante, sin quedarse pegadas en versiones viejas ni en pantallas de carga.
- **Criterio de cierre:** Realizar build de producción (`npm run build`), verificar que no haya errores ni advertencias críticas y dejar todo listo para subir al hosting. **Avisar al finalizar.**