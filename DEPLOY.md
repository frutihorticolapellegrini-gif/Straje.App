# CHECKLIST DE SUBIDA A HOSTING (ACTUALIZACIÓN SIN CORTES)

1. **Verificación previa al Build:**
   - Confirmar que las variables de entorno de producción (APIs de cotización de moneda, llaves de Mercado Pago y pasarela internacional) estén configuradas y no haya claves de prueba expuestas.
   - Verificar que el número/hash de versión de la app esté incrementado para disparar la actualización automática en clientes.
2. **Compilación limpia:**
   - Ejecutar el comando de compilación (`npm run build` / `vite build`) y confirmar 0 errores.
3. **Subida al servidor:**
   - Subir únicamente los archivos generados de distribución (`dist/` o `build/`) sin sobrescribir carpetas de almacenamiento de usuario (`uploads/`, `videos/`, `.env`).
   - Si usás Nginx / Node (PM2), reiniciar el proceso (`pm2 restart <nombre-app>`) y limpiar caché de CDN/proxy si corresponde.
4. **Prueba rápida post-deploy (2 minutos):**
   - Abrir la URL en modo incógnito desde PC y celular.
   - Verificar que abre el Home rápido, cambiar idioma (ES/EN/PT) y moneda (ARS/USD/EUR), y confirmar que la versión instalada en el celular toma los cambios al instante.