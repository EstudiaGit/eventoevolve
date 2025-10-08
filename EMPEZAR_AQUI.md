# 🚀 EMPEZAR AQUÍ - Guía de Inicio Rápido

## ✅ **Implementación Completada**

¡Todo el código de Stripe está listo! Aquí está lo que se ha implementado:

### **Archivos Creados:**

1. **API Routes:**
   - ✅ `src/pages/api/checkout.ts` - Crea sesiones de pago
   - ✅ `src/pages/api/webhooks.ts` - Recibe eventos de Stripe

2. **Páginas:**
   - ✅ `src/pages/success.astro` - Confirmación de compra
   - ✅ `src/pages/cancel.astro` - Compra cancelada

3. **Integración Frontend:**
   - ✅ `src/pages/index.astro` - Botones conectados con Stripe.js

4. **Configuración:**
   - ✅ `astro.config.local.mjs` - Config para desarrollo local con SSR
   - ✅ `package.json` - Scripts actualizados
   - ✅ `Dockerfile` - Usa configuración local

---

## 🎯 **Pasos para Empezar (5 minutos)**

### **1. Obtener Claves de Stripe Test**

1. Ve a: https://dashboard.stripe.com/register
2. Crea una cuenta (es gratis)
3. Una vez dentro, ve a: https://dashboard.stripe.com/test/apikeys
4. Copia estas dos claves:

```
Publishable key: pk_test_51xxxxx...
Secret key: sk_test_51xxxxx...
```

### **2. Configurar Variables de Entorno**

Abre tu archivo `.env` y agrega tus claves:

```bash
# Base de datos (ya lo tienes)
DATABASE_URL=postgresql://festivgeek_user:secretpassword@db:5432/festivgeek_db

# Stripe (AGREGA ESTO con tus claves reales)
STRIPE_SECRET_KEY=sk_test_TU_CLAVE_SECRETA_AQUI
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_TU_CLAVE_PUBLICA_AQUI

# Webhook secret (se genera automáticamente al levantar Docker)
STRIPE_WEBHOOK_SECRET=whsec_se_genera_automaticamente
```

### **3. Levantar Docker**

```bash
# Detener si está corriendo
docker compose down

# Levantar todos los servicios
docker compose up -d

# Ver logs de la aplicación
docker compose logs app -f
```

### **4. Crear las Tablas de la Base de Datos**

```bash
# Ejecutar migraciones
docker compose exec app npm run db:push

# Verificar que se crearon las tablas (opcional)
docker compose exec app npm run db:studio
# Abre en: http://localhost:4983
```

### **5. Obtener el Webhook Secret de Stripe**

```bash
# Ver los logs de Stripe CLI
docker compose logs stripe

# Busca una línea como esta:
# > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx

# COPIA ese valor y agrégalo a tu .env
```

Edita `.env` y agrega:
```bash
STRIPE_WEBHOOK_SECRET=whsec_EL_VALOR_QUE_COPIASTE
```

Reinicia la app:
```bash
docker compose restart app
```

---

## 🧪 **Probar una Compra**

### **1. Abrir la Aplicación**

```
http://localhost:4321
```

### **2. Hacer Click en "BUY NOW"**

- Elige cualquier ticket (Day Pass, Weekend Pass, o VIP)
- Haz click en el botón "BUY NOW"
- Te redirigirá a Stripe Checkout

### **3. Usar Tarjeta de Prueba**

En el formulario de Stripe, usa estos datos:

```
Número de tarjeta: 4242 4242 4242 4242
Fecha: Cualquier fecha futura (ej: 12/25)
CVC: Cualquier 3 dígitos (ej: 123)
Código postal: Cualquiera (ej: 12345)
```

### **4. Completar la Compra**

- Llena el formulario con datos de prueba
- Haz click en "Pagar"
- Te redirigirá a `/success` con la confirmación

### **5. Verificar el Pedido en la Base de Datos**

```bash
# Abrir Drizzle Studio
docker compose exec app npm run db:studio

# O ver los logs del webhook
docker compose logs stripe -f
```

Deberías ver un registro nuevo en la tabla `pedidos`.

---

## 📊 **Verificar que Todo Funciona**

### **Checklist:**

- [ ] ✅ La app carga en `http://localhost:4321`
- [ ] ✅ Los botones "BUY NOW" funcionan
- [ ] ✅ Te redirige a Stripe Checkout
- [ ] ✅ Puedes completar el pago con tarjeta de prueba
- [ ] ✅ Te redirige a `/success` después del pago
- [ ] ✅ El pedido se guarda en la base de datos
- [ ] ✅ Los logs de Stripe CLI muestran el webhook

---

## 🔧 **Comandos Útiles**

```bash
# Ver logs de la app
docker compose logs app -f

# Ver logs de Stripe CLI (webhooks)
docker compose logs stripe -f

# Ver logs de la base de datos
docker compose logs db -f

# Reiniciar solo la app (después de cambios)
docker compose restart app

# Ver estado de los contenedores
docker compose ps

# Entrar al contenedor de la app
docker compose exec app sh

# Limpiar todo y empezar de nuevo
docker compose down -v
docker compose up -d
```

---

## 🎨 **Personalizar Precios**

Los precios están en `src/pages/api/checkout.ts`:

```typescript
const prices: Record<string, number> = {
  'day-pass': 9900,      // €99.00 (en centavos)
  'weekend-pass': 15900, // €159.00
  'vip': 29500           // €295.00
};
```

Cambia los valores y reinicia:
```bash
docker compose restart app
```

---

## 🐛 **Problemas Comunes**

### **Error: "PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined"**
- Asegúrate de que tu `.env` tiene la clave pública
- Reinicia Docker: `docker compose restart app`

### **Error: "DATABASE_URL no está definida"**
- Verifica que la variable está en `.env`
- Asegúrate de que el contenedor de DB está corriendo: `docker compose ps`

### **Los webhooks no funcionan**
- Verifica que el container `stripe` está corriendo
- Revisa los logs: `docker compose logs stripe`
- Asegúrate de tener el `STRIPE_WEBHOOK_SECRET` en `.env`

### **Botón "BUY NOW" no hace nada**
- Abre la consola del navegador (F12) para ver errores
- Verifica que Stripe.js se cargó correctamente
- Revisa los logs de la app: `docker compose logs app -f`

---

## 📚 **Recursos Adicionales**

- **Tarjetas de prueba:** https://stripe.com/docs/testing
- **Dashboard de Stripe:** https://dashboard.stripe.com/test/payments
- **Documentación de Stripe:** https://stripe.com/docs
- **API Reference:** https://stripe.com/docs/api

---

## 🎓 **Próximos Pasos**

Una vez que todo funcione:

1. **Personaliza los emails** de confirmación en Stripe Dashboard
2. **Agrega más productos** modificando los precios
3. **Implementa descuentos** usando Stripe Coupons
4. **Agrega un panel de administración** para ver pedidos
5. **Configura webhooks de producción** cuando despliegues

---

## ✅ **¿Listo para Producción?**

Cuando quieras desplegar tu app con ventas reales:

### **Opción 1: Vercel (Recomendado)**
```bash
npm i -g vercel
vercel
```

### **Opción 2: Railway**
- Conecta tu repo de GitHub
- Railway detectará automáticamente Astro
- Configura las variables de entorno

### **Opción 3: VPS (DigitalOcean, AWS, etc.)**
- Sube tu código
- Configura PM2 o similar
- Usa las claves LIVE de Stripe (no test)

---

## 🆘 **¿Necesitas Ayuda?**

Si algo no funciona:

1. Revisa los logs: `docker compose logs app -f`
2. Verifica que Docker está corriendo: `docker compose ps`
3. Comprueba tu `.env`
4. Asegúrate de tener las claves correctas de Stripe

---

**¡A VENDER TICKETS!** 🎟️🚀
