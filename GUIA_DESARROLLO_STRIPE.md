# 🎯 Análisis del Proyecto - FestiGeek MVP con Stripe

## ✅ **RESUMEN: Tu proyecto está PERFECTAMENTE preparado para desarrollo local con Stripe**

Tu estructura actual es **excelente** para trabajar con Stripe en local usando Docker. Ya tienes todo lo necesario configurado.

---

## 📋 **Estado Actual del Proyecto**

### ✅ **Lo que YA tienes configurado:**

#### 1. **Docker Compose - 3 Servicios**
```yaml
✅ app         - Aplicación Astro (puerto 4321)
✅ db          - PostgreSQL con persistencia
✅ stripe      - Stripe CLI para webhooks locales
```

#### 2. **Base de Datos**
```typescript
✅ Schema definido (entradas + pedidos)
✅ Drizzle ORM configurado
✅ Conexión a PostgreSQL
✅ Persistencia con volúmenes Docker
```

#### 3. **Variables de Entorno**
```bash
✅ .env creado (ya existe)
✅ Variables de Stripe configuradas en docker-compose
✅ DATABASE_URL configurada
```

#### 4. **Stripe Integration**
```
✅ stripe package instalado (package.json)
✅ Stripe CLI container configurado
✅ Webhook endpoint definido: /api/webhooks
```

### ❌ **Lo que te FALTA implementar:**

1. **API Routes para Stripe** (NO existen todavía)
   - `src/pages/api/checkout.ts` - Crear sesión de pago
   - `src/pages/api/webhooks.ts` - Recibir eventos de Stripe
   - `src/pages/api/orders.ts` - Consultar pedidos

2. **Páginas de compra**
   - `src/pages/comprar/[tipo].astro` - Páginas de checkout
   - `src/pages/success.astro` - Página de éxito
   - `src/pages/cancel.astro` - Página de cancelación

3. **Integración frontend**
   - Botones "BUY NOW" conectados a la API
   - Formulario de checkout con Stripe Elements

4. **Migraciones de BD**
   - Ejecutar `npm run db:push` para crear tablas

---

## 🚀 **Plan de Implementación para Stripe**

### **FASE 1: Preparación (5 minutos)**

#### 1.1. Obtener claves de Stripe

1. Ve a: https://dashboard.stripe.com/register
2. Crea una cuenta (modo test automático)
3. Ve a: https://dashboard.stripe.com/test/apikeys
4. Copia tus claves de **TEST**:
   ```
   Publishable key: pk_test_...
   Secret key: sk_test_...
   ```

#### 1.2. Configurar .env

```bash
# Edita tu .env (YA EXISTE)
STRIPE_SECRET_KEY=sk_test_TU_CLAVE_AQUI
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_TU_CLAVE_AQUI
```

#### 1.3. Levantar Docker

```bash
# Detener si está corriendo
docker compose down

# Levantar todo
docker compose up -d

# Ver logs de Stripe CLI (importante)
docker compose logs stripe
```

El container de Stripe generará automáticamente el `STRIPE_WEBHOOK_SECRET`.

---

### **FASE 2: Crear la Base de Datos (2 minutos)**

```bash
# Ejecutar migraciones (crea las tablas)
docker compose exec app npm run db:push

# Verificar que se crearon
docker compose exec app npm run db:studio
# Abre en: http://localhost:4983
```

---

### **FASE 3: Implementar API Routes**

#### 3.1. Crear endpoint de checkout

**`src/pages/api/checkout.ts`**
```typescript
import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { ticketType, quantity } = await request.json();
    
    // Precios según tipo (en centavos)
    const prices: Record<string, number> = {
      'day-pass': 9900,      // €99
      'weekend-pass': 15900, // €159
      'vip': 29500           // €295
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Entrada ${ticketType}`,
              description: 'FestiGeek Canarias 2025',
            },
            unit_amount: prices[ticketType],
          },
          quantity: quantity || 1,
        },
      ],
      mode: 'payment',
      success_url: `${new URL(request.url).origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/cancel`,
      metadata: {
        ticketType,
        quantity: (quantity || 1).toString(),
      },
    });

    return new Response(JSON.stringify({ sessionId: session.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creando sesión:', error);
    return new Response(JSON.stringify({ error: 'Error al procesar' }), {
      status: 500,
    });
  }
};
```

#### 3.2. Crear webhook endpoint

**`src/pages/api/webhooks.ts`**
```typescript
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { db } from '../../db/client';
import { pedidos } from '../../db/schema';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      import.meta.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed.', err);
    return new Response('Webhook Error', { status: 400 });
  }

  // Manejar el evento
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Guardar pedido en BD
      await db.insert(pedidos).values({
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string,
        emailComprador: session.customer_details?.email || '',
        nombreComprador: session.customer_details?.name || '',
        total: session.amount_total || 0,
        estado: 'completed',
        entradaId: session.metadata?.ticketType || '',
        cantidad: parseInt(session.metadata?.quantity || '1'),
        fechaPago: new Date(),
      });

      console.log('✅ Pedido guardado:', session.id);
      break;

    case 'payment_intent.payment_failed':
      console.log('❌ Pago fallido');
      break;

    default:
      console.log(`Evento no manejado: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
  });
};
```

---

### **FASE 4: Conectar Frontend**

#### 4.1. Actualizar botones "BUY NOW"

En `src/pages/index.astro`, cambia los botones:

```html
<!-- Ejemplo para Day Pass -->
<button 
  class="btn btn-primary buy-ticket" 
  data-ticket-type="day-pass"
  style="width: 100%;"
>
  BUY NOW
</button>

<!-- Agregar al final del archivo, antes de </body> -->
<script>
  const buyButtons = document.querySelectorAll('.buy-ticket');
  
  buyButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const ticketType = (e.target as HTMLElement).dataset.ticketType;
      
      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketType, quantity: 1 }),
        });
        
        const { sessionId } = await response.json();
        
        // Redirigir a Stripe Checkout
        const stripe = Stripe(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY);
        await stripe.redirectToCheckout({ sessionId });
      } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar la compra');
      }
    });
  });
</script>
```

#### 4.2. Agregar Stripe.js

En el `<head>` de `index.astro`:

```html
<script src="https://js.stripe.com/v3/"></script>
```

---

### **FASE 5: Páginas de Success/Cancel**

**`src/pages/success.astro`**
```astro
---
const sessionId = Astro.url.searchParams.get('session_id');
---

<!DOCTYPE html>
<html>
<head>
  <title>¡Compra Exitosa!</title>
</head>
<body>
  <h1>✅ ¡Gracias por tu compra!</h1>
  <p>Recibirás un email de confirmación en breve.</p>
  <p>Referencia: {sessionId}</p>
  <a href="/">Volver al inicio</a>
</body>
</html>
```

**`src/pages/cancel.astro`**
```astro
<!DOCTYPE html>
<html>
<head>
  <title>Compra Cancelada</title>
</head>
<body>
  <h1>❌ Compra cancelada</h1>
  <p>No se ha realizado ningún cargo.</p>
  <a href="/">Volver al inicio</a>
</body>
</html>
```

---

## 🧪 **Testing Local con Stripe**

### **Tarjetas de Prueba de Stripe**

```
✅ Pago exitoso:
   4242 4242 4242 4242
   Cualquier fecha futura
   Cualquier CVC

❌ Pago rechazado:
   4000 0000 0000 0002

🔄 Requiere autenticación (3D Secure):
   4000 0025 0000 3155
```

### **Flujo de Prueba**

1. Abre http://localhost:4321
2. Haz clic en "BUY NOW"
3. Te redirigirá a Stripe Checkout (modo test)
4. Usa la tarjeta 4242...
5. Completa el pago
6. Verás la página de success
7. **Verifica el webhook en logs:**
   ```bash
   docker compose logs stripe -f
   ```

---

## 🔧 **Comandos Útiles**

```bash
# Ver logs de la app
docker compose logs app -f

# Ver logs de Stripe CLI
docker compose logs stripe -f

# Reiniciar solo la app (después de cambios)
docker compose restart app

# Ejecutar comando dentro del container
docker compose exec app npm run db:studio

# Acceder a la BD desde el host
psql postgresql://festivgeek_user:secretpassword@localhost:5432/festivgeek_db
```

---

## ⚠️ **Problemas Comunes**

### 1. **Webhooks no funcionan**
```bash
# Verifica que el container stripe esté corriendo
docker compose ps

# Ver el webhook secret generado
docker compose logs stripe | grep whsec_
```

### 2. **Error de DATABASE_URL**
```bash
# Asegúrate de que la DB está corriendo
docker compose ps db

# Reinicia todo
docker compose restart
```

### 3. **Cannot find module 'stripe'**
```bash
# Instala dependencias dentro del container
docker compose exec app npm install
```

---

## 📊 **Diferencias: Local vs GitHub Pages**

| Característica | Local (Docker) | GitHub Pages |
|---|---|---|
| **Modo** | SSR (Server) | Estático |
| **API Routes** | ✅ Funcionan | ❌ NO funcionan |
| **Base de Datos** | ✅ PostgreSQL | ❌ No disponible |
| **Stripe Webhooks** | ✅ Con Stripe CLI | ❌ Necesita servidor |
| **Variables de Entorno** | ✅ `.env` local | ❌ No hay backend |

### **Solución para Producción:**

Para desplegar con Stripe necesitas un servidor real:
- **Vercel** (recomendado para Astro SSR)
- **Netlify**
- **Railway** / **Render**
- **VPS propio**

GitHub Pages es **SOLO para la landing estática** (sin compras).

---

## 🎯 **Siguiente Paso Inmediato**

1. **Configura tus claves de Stripe test** en `.env`
2. **Levanta Docker**: `docker compose up -d`
3. **Crea las API routes** que te mostré arriba
4. **Prueba una compra** con la tarjeta 4242...

---

## 📚 **Recursos**

- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Checkout](https://stripe.com/docs/checkout/quickstart)
- [Astro API Routes](https://docs.astro.build/en/core-concepts/endpoints/)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

**¿Quieres que te ayude a implementar alguna de estas fases ahora?** 🚀
