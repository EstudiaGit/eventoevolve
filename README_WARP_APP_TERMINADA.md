Si por favor

¡Perfecto! Vamos a implementar todo el sistema de Stripe paso a paso. Empecemos:
UpdateTodos: 7 items
Perfecto, vamos a implementar todo. Empecemos:

## **PASO 1: Crear la estructura de directorios API**

**Command Executed:**

```bash
New-Item -ItemType Directory -Force -Path "C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages\api"
```

**Output:**

```

    Directory: C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d----          07/10/2025    13:42                api

```

MarkAsCompleted: 1 items

## **PASO 2: Crear endpoint de checkout**

**Diff:**

```diff
--- C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages\api\checkout.ts
+++ C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages\api\checkout.ts
@@ -0,0 +1,109 @@
+// src/pages/api/checkout.ts
+import type { APIRoute } from 'astro';
+import Stripe from 'stripe';
+
+// Inicializar Stripe con tu clave secreta
+const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
+  apiVersion: '2024-11-20.acacia',
+});
+
+export const POST: APIRoute = async ({ request }) => {
+  try {
+    // Parsear el body de la petición
+    const { ticketType, quantity } = await request.json();
+
+    // Validar que ticketType existe
+    if (!ticketType) {
+      return new Response(
+        JSON.stringify({ error: 'ticketType es requerido' }),
+        { status: 400, headers: { 'Content-Type': 'application/json' } }
+      );
+    }
+
+    // Precios según tipo (en centavos de euro)
+    const prices: Record<string, number> = {
+      'day-pass': 9900,      // €99.00
+      'weekend-pass': 15900, // €159.00
+      'vip': 29500           // €295.00
+    };
+
+    // Nombres descriptivos
+    const names: Record<string, string> = {
+      'day-pass': 'Day Pass - 1 Día',
+      'weekend-pass': 'Weekend Pass - 2 Días',
+      'vip': 'VIP Experience - Acceso Completo'
+    };
+
+    // Validar que el tipo de ticket existe
+    if (!prices[ticketType]) {
+      return new Response(
+        JSON.stringify({ error: 'Tipo de ticket inválido' }),
+        { status: 400, headers: { 'Content-Type': 'application/json' } }
+      );
+    }
+
+    // Crear sesión de Stripe Checkout
+    const session = await stripe.checkout.sessions.create({
+      payment_method_types: ['card'],
+      line_items: [
+        {
+          price_data: {
+            currency: 'eur',
+            product_data: {
+              name: names[ticketType],
+              description: 'FestiGeek Canarias 2025 - 15-16 Marzo',
+              images: [], // Puedes agregar URLs de imágenes aquí
+            },
+            unit_amount: prices[ticketType],
+          },
+          quantity: quantity || 1,
+        },
+      ],
+      mode: 'payment',
+
+      // URLs de redirección (funcionarán tanto en local como en producción)
+      success_url: `${new URL(request.url).origin}/success?session_id={CHECKOUT_SESSION_ID}`,
+      cancel_url: `${new URL(request.url).origin}/cancel`,
+
+      // Metadata para identificar el pedido después
+      metadata: {
+        ticketType,
+        quantity: (quantity || 1).toString(),
+      },
+
+      // Configuración adicional
+      billing_address_collection: 'required',
+      phone_number_collection: {
+        enabled: true,
+      },
+    });
+
+    console.log('✅ Sesión de checkout creada:', session.id);
+
+    // Devolver el ID de la sesión al frontend
+    return new Response(
+      JSON.stringify({
+        sessionId: session.id,
+        url: session.url // URL de redirección a Stripe
+      }),
+      {
+        status: 200,
+        headers: { 'Content-Type': 'application/json' },
+      }
+    );
+
+  } catch (error) {
+    console.error('❌ Error creando sesión de checkout:', error);
+
+    return new Response(
+      JSON.stringify({
+        error: 'Error al procesar la solicitud',
+        details: error instanceof Error ? error.message : 'Error desconocido'
+      }),
+      {
+        status: 500,
+        headers: { 'Content-Type': 'application/json' },
+      }
+    );
+  }
+};

```

MarkAsCompleted: 1 items

## **PASO 3: Crear endpoint de webhooks**

**Diff:**

```diff
--- C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages\api\webhooks.ts
+++ C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages\api\webhooks.ts
@@ -0,0 +1,132 @@
+// src/pages/api/webhooks.ts
+import type { APIRoute } from 'astro';
+import Stripe from 'stripe';
+import { db } from '../../db/client';
+import { pedidos } from '../../db/schema';
+
+// Inicializar Stripe
+const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
+  apiVersion: '2024-11-20.acacia',
+});
+
+export const POST: APIRoute = async ({ request }) => {
+  // Obtener el body raw (necesario para verificar la firma)
+  const body = await request.text();
+  const signature = request.headers.get('stripe-signature');
+
+  if (!signature) {
+    console.error('⚠️ No se recibió firma de Stripe');
+    return new Response('No signature', { status: 400 });
+  }
+
+  let event: Stripe.Event;
+
+  try {
+    // Verificar que el webhook viene realmente de Stripe
+    event = stripe.webhooks.constructEvent(
+      body,
+      signature,
+      import.meta.env.STRIPE_WEBHOOK_SECRET || ''
+    );
+  } catch (err) {
+    console.error('⚠️ Error verificando firma del webhook:', err);
+    return new Response(
+      `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
+      { status: 400 }
+    );
+  }
+
+  // Manejar diferentes tipos de eventos
+  try {
+    switch (event.type) {
+      case 'checkout.session.completed': {
+        const session = event.data.object as Stripe.Checkout.Session;
+
+        console.log('✅ Checkout completado:', {
+          sessionId: session.id,
+          email: session.customer_details?.email,
+          amount: session.amount_total,
+        });
+
+        // Guardar el pedido en la base de datos
+        try {
+          await db.insert(pedidos).values({
+            stripeSessionId: session.id,
+            stripePaymentIntentId: session.payment_intent as string || '',
+            emailComprador: session.customer_details?.email || '',
+            nombreComprador: session.customer_details?.name || '',
+            total: session.amount_total || 0,
+            estado: 'completed',
+            entradaId: session.metadata?.ticketType || '',
+            cantidad: parseInt(session.metadata?.quantity || '1'),
+            fechaPago: new Date(),
+            metadata: JSON.stringify({
+              phone: session.customer_details?.phone,
+              address: session.customer_details?.address,
+            }),
+          });
+
+          console.log('💾 Pedido guardado en BD correctamente');
+        } catch (dbError) {
+          console.error('❌ Error guardando en BD:', dbError);
+          // No retornar error para no hacer que Stripe reintente
+          // En producción, podrías enviar esto a un sistema de monitoreo
+        }
+
+        break;
+      }
+
+      case 'payment_intent.succeeded': {
+        const paymentIntent = event.data.object as Stripe.PaymentIntent;
+        console.log('💰 Pago exitoso:', paymentIntent.id);
+        break;
+      }
+
+      case 'payment_intent.payment_failed': {
+        const paymentIntent = event.data.object as Stripe.PaymentIntent;
+        console.log('❌ Pago fallido:', {
+          id: paymentIntent.id,
+          error: paymentIntent.last_payment_error?.message,
+        });
+
+        // Aquí podrías actualizar el pedido a estado 'failed'
+        break;
+      }
+
+      case 'charge.refunded': {
+        const charge = event.data.object as Stripe.Charge;
+        console.log('↩️ Reembolso procesado:', charge.id);
+
+        // Aquí podrías actualizar el pedido a estado 'refunded'
+        break;
+      }
+
+      default:
+        console.log(`ℹ️ Evento no manejado: ${event.type}`);
+    }
+
+    // Responder a Stripe que el webhook fue recibido correctamente
+    return new Response(
+      JSON.stringify({ received: true, event: event.type }),
+      {
+        status: 200,
+        headers: { 'Content-Type': 'application/json' },
+      }
+    );
+
+  } catch (error) {
+    console.error('❌ Error procesando webhook:', error);
+
+    // Aún así, devolver 200 para evitar reintentos infinitos de Stripe
+    return new Response(
+      JSON.stringify({
+        received: true,
+        error: 'Processing failed but acknowledged'
+      }),
+      {
+        status: 200,
+        headers: { 'Content-Type': 'application/json' },
+      }
+    );
+  }
+};

```

MarkAsCompleted: 1 items

## **PASO 4: Crear páginas de Success y Cancel**

**Diff:**

```diff
--- C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages\success.astro
+++ C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages\success.astro
@@ -0,0 +1,181 @@
+---
+// src/pages/success.astro
+const sessionId = Astro.url.searchParams.get('session_id');
+---
+
+<!DOCTYPE html>
+<html lang="es">
+<head>
+  <meta charset="UTF-8">
+  <meta name="viewport" content="width=device-width, initial-scale=1.0">
+  <title>¡Compra Exitosa! - FestiGeek Canarias 2025</title>
+
+  <!-- Google Fonts -->
+  <link rel="preconnect" href="https://fonts.googleapis.com">
+  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
+  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&family=Inter:wght@400;600&display=swap" rel="stylesheet">
+
+  <style>
+    :root {
+      --color-marfil: #F7F4EA;
+      --color-negro: #111111;
+      --color-turquesa: #2EE7D3;
+      --color-menta: #23D9B3;
+      --spacing-lg: 32px;
+      --spacing-xl: 48px;
+    }
+
+    * {
+      margin: 0;
+      padding: 0;
+      box-sizing: border-box;
+    }
+
+    body {
+      font-family: 'Inter', sans-serif;
+      background: linear-gradient(135deg, var(--color-turquesa) 0%, var(--color-menta) 100%);
+      min-height: 100vh;
+      display: flex;
+      align-items: center;
+      justify-content: center;
+      padding: var(--spacing-lg);
+    }
+
+    .container {
+      background-color: var(--color-marfil);
+      border: 4px solid var(--color-negro);
+      padding: var(--spacing-xl);
+      max-width: 600px;
+      width: 100%;
+      box-shadow: 8px 8px 0 var(--color-negro);
+      text-align: center;
+    }
+
+    .icon {
+      font-size: 80px;
+      margin-bottom: var(--spacing-lg);
+      animation: bounce 1s ease-in-out;
+    }
+
+    @keyframes bounce {
+      0%, 100% { transform: translateY(0); }
+      50% { transform: translateY(-20px); }
+    }
+
+    h1 {
+      font-family: 'Space Grotesk', sans-serif;
+      font-weight: 900;
+      font-size: 42px;
+      color: var(--color-negro);
+      margin-bottom: 20px;
+    }
+
+    p {
+      font-size: 18px;
+      color: var(--color-negro);
+      line-height: 1.6;
+      margin-bottom: 16px;
+    }
+
+    .session-id {
+      background-color: #fff;
+      padding: 16px;
+      border: 2px solid var(--color-negro);
+      font-family: monospace;
+      font-size: 14px;
+      margin: var(--spacing-lg) 0;
+      word-break: break-all;
+    }
+
+    .info-box {
+      background-color: #fff;
+      border: 3px solid var(--color-negro);
+      padding: 24px;
+      margin: var(--spacing-lg) 0;
+      text-align: left;
+    }
+
+    .info-box h2 {
+      font-family: 'Space Grotesk', sans-serif;
+      font-size: 20px;
+      margin-bottom: 12px;
+      color: var(--color-negro);
+    }
+
+    .info-box ul {
+      list-style: none;
+      padding: 0;
+    }
+
+    .info-box li {
+      padding: 8px 0;
+      border-bottom: 1px solid #E7E2D7;
+    }
+
+    .info-box li:last-child {
+      border-bottom: none;
+    }
+
+    .btn {
+      display: inline-block;
+      padding: 16px 32px;
+      background-color: var(--color-negro);
+      color: var(--color-marfil);
+      text-decoration: none;
+      font-family: 'Space Grotesk', sans-serif;
+      font-weight: 700;
+      font-size: 16px;
+      border: 2px solid var(--color-negro);
+      margin-top: var(--spacing-lg);
+      transition: all 0.2s;
+    }
+
+    .btn:hover {
+      transform: translateY(-2px);
+      box-shadow: 4px 4px 0 var(--color-negro);
+    }
+  </style>
+</head>
+<body>
+  <div class="container">
+    <div class="icon">✅</div>
+
+    <h1>¡Compra Exitosa!</h1>
+
+    <p><strong>¡Gracias por tu compra!</strong></p>
+    <p>Recibirás un email de confirmación con todos los detalles de tu entrada.</p>
+
+    {sessionId && (
+      <div class="session-id">
+        <strong>Referencia:</strong> {sessionId}
+      </div>
+    )}
+
+    <div class="info-box">
+      <h2>📧 Próximos Pasos</h2>
+      <ul>
+        <li>✓ Revisa tu email para ver el recibo de compra</li>
+        <li>✓ Tu entrada será enviada por correo electrónico</li>
+        <li>✓ Guarda el email para presentarlo el día del evento</li>
+        <li>✓ Llegarás a las puertas y mostrarás tu entrada (digital o impresa)</li>
+      </ul>
+    </div>
+
+    <div class="info-box">
+      <h2>📅 Detalles del Evento</h2>
+      <ul>
+        <li><strong>Fecha:</strong> 15-16 de Marzo 2025</li>
+        <li><strong>Horario:</strong> 10:00 - 21:00</li>
+        <li><strong>Lugar:</strong> Recinto Ferial de Canarias - Pabellón 7</li>
+        <li><strong>Ubicación:</strong> Las Palmas de Gran Canaria</li>
+      </ul>
+    </div>
+
+    <p style="margin-top: 24px; font-size: 14px; color: #5A5A5A;">
+      ¿Tienes alguna pregunta? Contáctanos en <strong>info@festigeekcanarias.com</strong>
+    </p>
+
+    <a href="/" class="btn">Volver al Inicio</a>
+  </div>
+</body>
+</html>

```

**Diff:**

```diff
--- C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages\cancel.astro
+++ C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages\cancel.astro
@@ -0,0 +1,182 @@
+---
+// src/pages/cancel.astro
+---
+
+<!DOCTYPE html>
+<html lang="es">
+<head>
+  <meta charset="UTF-8">
+  <meta name="viewport" content="width=device-width, initial-scale=1.0">
+  <title>Compra Cancelada - FestiGeek Canarias 2025</title>
+
+  <!-- Google Fonts -->
+  <link rel="preconnect" href="https://fonts.googleapis.com">
+  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
+  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&family=Inter:wght@400;600&display=swap" rel="stylesheet">
+
+  <style>
+    :root {
+      --color-marfil: #F7F4EA;
+      --color-negro: #111111;
+      --color-coral: #FF4F6D;
+      --color-naranja: #FF7A00;
+      --spacing-lg: 32px;
+      --spacing-xl: 48px;
+    }
+
+    * {
+      margin: 0;
+      padding: 0;
+      box-sizing: border-box;
+    }
+
+    body {
+      font-family: 'Inter', sans-serif;
+      background: linear-gradient(135deg, var(--color-coral) 0%, var(--color-naranja) 100%);
+      min-height: 100vh;
+      display: flex;
+      align-items: center;
+      justify-content: center;
+      padding: var(--spacing-lg);
+    }
+
+    .container {
+      background-color: var(--color-marfil);
+      border: 4px solid var(--color-negro);
+      padding: var(--spacing-xl);
+      max-width: 600px;
+      width: 100%;
+      box-shadow: 8px 8px 0 var(--color-negro);
+      text-align: center;
+    }
+
+    .icon {
+      font-size: 80px;
+      margin-bottom: var(--spacing-lg);
+    }
+
+    h1 {
+      font-family: 'Space Grotesk', sans-serif;
+      font-weight: 900;
+      font-size: 42px;
+      color: var(--color-negro);
+      margin-bottom: 20px;
+    }
+
+    p {
+      font-size: 18px;
+      color: var(--color-negro);
+      line-height: 1.6;
+      margin-bottom: 16px;
+    }
+
+    .info-box {
+      background-color: #fff;
+      border: 3px solid var(--color-negro);
+      padding: 24px;
+      margin: var(--spacing-lg) 0;
+      text-align: left;
+    }
+
+    .info-box h2 {
+      font-family: 'Space Grotesk', sans-serif;
+      font-size: 20px;
+      margin-bottom: 12px;
+      color: var(--color-negro);
+    }
+
+    .info-box ul {
+      list-style: none;
+      padding: 0;
+    }
+
+    .info-box li {
+      padding: 8px 0;
+      padding-left: 24px;
+      position: relative;
+    }
+
+    .info-box li:before {
+      content: "→";
+      position: absolute;
+      left: 0;
+      font-weight: bold;
+    }
+
+    .btn-group {
+      display: flex;
+      gap: 16px;
+      justify-content: center;
+      margin-top: var(--spacing-lg);
+      flex-wrap: wrap;
+    }
+
+    .btn {
+      display: inline-block;
+      padding: 16px 32px;
+      text-decoration: none;
+      font-family: 'Space Grotesk', sans-serif;
+      font-weight: 700;
+      font-size: 16px;
+      border: 2px solid var(--color-negro);
+      transition: all 0.2s;
+    }
+
+    .btn-primary {
+      background-color: var(--color-negro);
+      color: var(--color-marfil);
+    }
+
+    .btn-primary:hover {
+      transform: translateY(-2px);
+      box-shadow: 4px 4px 0 var(--color-negro);
+    }
+
+    .btn-outline {
+      background-color: transparent;
+      color: var(--color-negro);
+    }
+
+    .btn-outline:hover {
+      background-color: var(--color-negro);
+      color: var(--color-marfil);
+      transform: translateY(-2px);
+      box-shadow: 4px 4px 0 var(--color-negro);
+    }
+  </style>
+</head>
+<body>
+  <div class="container">
+    <div class="icon">❌</div>
+
+    <h1>Compra Cancelada</h1>
+
+    <p><strong>No te preocupes, no se ha realizado ningún cargo.</strong></p>
+    <p>Tu compra ha sido cancelada y no se procesó ningún pago.</p>
+
+    <div class="info-box">
+      <h2>💡 ¿Tuviste algún problema?</h2>
+      <ul>
+        <li>Puedes intentar comprar de nuevo cuando quieras</li>
+        <li>Las entradas están disponibles hasta agotar stock</li>
+        <li>Si necesitas ayuda, contáctanos por email</li>
+        <li>Aceptamos todas las tarjetas de crédito y débito</li>
+      </ul>
+    </div>
+
+    <div class="info-box">
+      <h2>📧 ¿Necesitas Ayuda?</h2>
+      <p style="margin: 0;">
+        Si encontraste algún problema durante el proceso de compra,
+        escríbenos a <strong>info@festigeekcanarias.com</strong> y
+        te ayudaremos a completar tu pedido.
+      </p>
+    </div>
+
+    <div class="btn-group">
+      <a href="/" class="btn btn-primary">Volver al Inicio</a>
+      <a href="/#tickets" class="btn btn-outline">Intentar de Nuevo</a>
+    </div>
+  </div>
+</body>
+</html>

```

MarkAsCompleted: 1 items

## **PASO 5: Actualizar index.astro con integración de Stripe**

Ahora voy a agregar el código JavaScript para conectar los botones "BUY NOW" con Stripe:

**Files Read:**

**C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages\index.astro**

```
---
// src/pages/index.astro
const pageTitle = "FestiGeek Canarias 2025";
---

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{pageTitle}</title>

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!-- Iconos -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    :root {
      /* Colores Neutros */
      --color-marfil: #F7F4EA;
      --color-negro: #111111;
      --color-gris: #5A5A5A;
      --color-borde-suave: #E7E2D7;
      --color-blanco: #FFFFFF;

      /* Colores de Acento */
      --color-turquesa: #2EE7D3;
      --color-menta: #23D9B3;
      --color-lima: #C9F86A;
      --color-amarillo: #FFD64D;
      --color-naranja: #FF7A00;
      --color-coral: #FF4F6D;
      --color-lavanda: #B79BF5;
      --color-cian-claro: #7CF3E9;

      /* Espaciado */
      --spacing-xs: 8px;
      --spacing-sm: 16px;
      --spacing-md: 24px;
      --spacing-lg: 32px;
      --spacing-xl: 48px;
      --spacing-2xl: 64px;
      --spacing-3xl: 96px;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--color-marfil);
      color: var(--color-negro);
      line-height: 1.6;
      overflow-x: hidden;
    }

    h1, h2, h3, h4 {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 800;
      line-height: 1.2;
    }

    h1 {
      font-size: clamp(44px, 8vw, 72px);
      font-weight: 900;
    }

    h2 {
      font-size: clamp(32px, 5vw, 48px);
      font-weight: 800;
    }

    h3 {
      font-size: clamp(24px, 3vw, 32px);
      font-weight: 700;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 var(--spacing-md);
    }

    @media (min-width: 768px) {
      .container {
        padding: 0 var(--spacing-lg);
      }
    }

    /* Mejora de Botones - Estados más claros */
    .btn {
      display: inline-block;
      padding: 16px 32px;
      border: 2px solid var(--color-negro);
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      position: relative;
      overflow: hidden;
      text-align: center;
    }

    .btn-primary {
      background-color: var(--color-negro);
      color: var(--color-marfil);
    }

    .btn-primary::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 400ms;
    }

    .btn-primary:hover::before {
      left: 100%;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .btn-primary:focus-visible {
      outline: 3px solid var(--color-turquesa);
      outline-offset: 3px;
    }

    .btn-outline {
      background-color: transparent;
      color: var(--color-negro);
    }

    .btn-outline:hover {
      background-color: var(--color-negro);
      color: var(--color-marfil);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .btn-outline:active {
      transform: translateY(0);
    }

    .btn-outline:focus-visible {
      outline: 3px solid var(--color-turquesa);
      outline-offset: 3px;
    }

    /* Ticket Cards - Mejora de jerarquía visual */
    .ticket-card {
      background-color: var(--color-blanco);
      border: 3px solid var(--color-negro);
      padding: var(--spacing-lg);
      text-align: center;
      position: relative;
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 4px 4px 0 var(--color-negro);
    }

    .ticket-card:hover {
      transform: translate(-2px, -2px);
      box-shadow: 8px 8px 0 var(--color-negro);
    }

    .ticket-card.featured {
      border-width: 4px;
      transform: scale(1.05);
      z-index: 1;
    }

    .ticket-card.featured:hover {
      transform: scale(1.05) translate(-2px, -2px);
    }

    .ticket-type {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      padding: var(--spacing-xs) var(--spacing-sm);
      border: 2px solid var(--color-negro);
      display: inline-block;
      margin-bottom: var(--spacing-md);
      background-color: var(--color-marfil);
    }

    .ticket-price {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 56px;
      font-weight: 900;
      margin-bottom: var(--spacing-xs);
      line-height: 1;
    }

    .ticket-price span {
      font-size: 28px;
      font-weight: 700;
      vertical-align: super;
    }

    .ticket-original-price {
      font-size: 24px;
      text-decoration: line-through;
      color: var(--color-gris);
      display: block;
      margin-top: -8px;
      margin-bottom: 8px;
    }

    .ticket-title {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: var(--spacing-sm);
      font-family: 'Space Grotesk', sans-serif;
    }

    .ticket-features {
      list-style: none;
      padding: 0;
      margin: var(--spacing-md) 0;
      text-align: left;
    }

    .ticket-features li {
      padding: 12px 0;
      border-top: 1px solid var(--color-borde-suave);
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .ticket-features li:first-child {
      border-top: 2px solid var(--color-negro);
      margin-top: 16px;
    }

    .ticket-features li::before {
      content: '✓';
      color: var(--color-menta);
      font-weight: bold;
      font-size: 18px;
      flex-shrink: 0;
    }

    /* Header - Mejora de navegación móvil */
    .header {
      background-color: var(--color-turquesa);
      height: 72px;
      border-bottom: 3px solid var(--color-negro);
      display: flex;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .nav-links {
      display: none;
      gap: var(--spacing-lg);
    }

    .nav-links a {
      font-weight: 600;
      color: var(--color-negro);
      text-decoration: none;
      position: relative;
      padding: 4px 0;
      transition: color 200ms;
    }

    .nav-links a::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 0;
      height: 3px;
      background-color: var(--color-negro);
      transition: width 200ms;
    }

    .nav-links a:hover::after {
      width: 100%;
    }

    .nav-links a:focus-visible {
      outline: 2px solid var(--color-negro);
      outline-offset: 4px;
      border-radius: 2px;
    }

    @media (min-width: 768px) {
      .nav-links {
        display: flex;
      }
      .menu-toggle {
        display: none;
      }
    }

    .menu-toggle {
      background: none;
      border: 2px solid var(--color-negro);
      padding: 8px 12px;
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .menu-toggle:hover {
      background-color: var(--color-negro);
      color: var(--color-turquesa);
    }

    /* Chips mejorados */
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background-color: var(--color-marfil);
      border: 2px solid var(--color-negro);
      font-size: 14px;
      font-weight: 600;
      transition: all 200ms;
      box-shadow: 2px 2px 0 var(--color-negro);
    }

    .chip:hover {
      background-color: var(--color-amarillo);
      transform: translate(-1px, -1px);
      box-shadow: 4px 4px 0 var(--color-negro);
    }

    /* Badge de descuento mejorado */
    .discount-badge {
      position: absolute;
      top: -12px;
      right: -12px;
      background-color: var(--color-coral);
      color: var(--color-blanco);
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      border: 3px solid var(--color-negro);
      box-shadow: 2px 2px 0 var(--color-negro);
      z-index: 2;
      letter-spacing: 1px;
      transform: rotate(-5deg);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: rotate(-5deg) scale(1); }
      50% { transform: rotate(-5deg) scale(1.05); }
    }

    /* 🎯 MEJORA 1: Hero con imagen de fondo adaptable */
    .hero {
      min-height: 70vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, rgba(29, 54, 54, 0.9) 0%, rgba(50, 31, 53, 0.9) 100%);
      color: var(--color-marfil);
    }

    .hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 140%;
      background-image: url('/images/comic-texture.png'); /* 👈 Aquí pones tu imagen */
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      z-index: -1;
      opacity: 0.8; /* Controla la visibilidad de la imagen */
    }

    /* Versión responsive de la imagen de fondo */
    @media (max-width: 768px) {
      .hero::before {
        background-position: center;
        background-size: cover;
      }
    }

    /* 🎯 MEJORA 2: Sección tickets con fondo de cómic sutil */
    .tickets-section {
      padding: var(--spacing-3xl) 0;
      background-color: var(--color-marfil);
      position: relative;
      overflow: hidden;
    }

    .tickets-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url('/images/hero-background.jpg'); /* 👈 Aquí pones tu textura de cómic */
      background-size: 400px 400px; /* Ajusta según tu imagen */
      background-repeat: repeat;
      background-position: center;
      opacity: 0.; /* Muy sutil, como páginas de cómic antiguas */
      z-index: 0;
      pointer-events: none;
      mix-blend-mode: multiply; /* Se mezcla sutilmente con el fondo */
    }

    /* Efecto de papel envejecido adicional */
    .tickets-section::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background:
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 0, 0, 0.01) 2px,
          rgba(0, 0, 0, 0.01) 4px
        );
      z-index: 0;
      pointer-events: none;
    }

    .tickets-section > * {
      position: relative;
      z-index: 1;
    }

/* 🎯 MEJORA 3: Guest cards - TODO en el mismo cajón */
.guest-card {
  text-align: center;
  position: relative;
  height: auto;
}

.guest-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
}

.guest-card-front {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background-color: transparent;
}

/* El cajón que contiene TODO */
.guest-image {
  width: 220px;
  height: 280px;
  background-color: var(--color-borde-suave);
  border: 3px solid var(--color-negro);
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  box-shadow: 4px 4px 0 var(--color-negro);
  transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.guest-card:hover .guest-image {
  box-shadow: 6px 6px 0 var(--color-negro);
  transform: translate(-2px, -2px);
}

/* Contenido superior: foto + info */
.guest-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-md);
  background: linear-gradient(135deg, var(--color-borde-suave), var(--color-marfil));
  flex: 1;
  position: relative;
  z-index: 1;
}

.guest-placeholder {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  background-color: rgba(255, 255, 255, 0.5);
  border: 2px solid var(--color-negro);
  margin-bottom: var(--spacing-sm);
}

.guest-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 4px;
  color: var(--color-negro);
}

.guest-role {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-gris);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* La cortina que sube desde abajo DENTRO del mismo cajón */
.guest-card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 0;
  background: linear-gradient(135deg, rgba(255, 122, 0, 0.96) 0%, rgba(255, 140, 50, 0.94) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 var(--spacing-md);
  overflow: hidden;
  transition: height 500ms cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  backdrop-filter: blur(4px);
}

.guest-card:hover .guest-card-overlay {
  height: 100%; /* Cubre todo el cajón */
}

/* Contenido de la cortina */
.overlay-content {
  opacity: 0;
  transform: translateY(20px);
  transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1) 100ms;
  width: 100%;
  text-align: center;
}

.guest-card:hover .overlay-content {
  opacity: 1;
  transform: translateY(0);
}

.guest-name-overlay {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 8px;
  color: var(--color-blanco);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4);
  line-height: 1.2;
}

.guest-role-overlay {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-negro);
  margin-bottom: var(--spacing-md);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Redes sociales */
.social-links {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  width: 100%;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background-color: var(--color-blanco);
  border: 3px solid var(--color-negro);
  color: var(--color-negro);
  text-decoration: none;
  font-size: 22px;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 2px 2px 0 var(--color-negro);
  position: relative;
  overflow: hidden;
}

.social-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background-color: var(--color-negro);
  transition: left 300ms;
  z-index: -1;
}

.social-link:hover::before {
  left: 0;
}

.social-link:hover {
  color: var(--color-blanco);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--color-negro);
}

.social-icon {
  position: relative;
  z-index: 1;
}




    /* Legend mejorada */
    .legend {
      display: flex;
      justify-content: center;
      gap: var(--spacing-md);
      margin-top: var(--spacing-xl);
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 8px 16px;
      background-color: var(--color-blanco);
      border: 2px solid var(--color-negro);
      font-weight: 600;
      font-size: 14px;
    }

    .legend-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid var(--color-negro);
      flex-shrink: 0;
    }

    .hero-content {
      text-align: center;
      position: relative;
      z-index: 1;
      animation: fadeInUp 800ms ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .hero-subtitle {
      font-size: clamp(18px, 3vw, 24px);
      font-weight: 400;
      margin-bottom: var(--spacing-sm);
      color: var(--color-cian-claro);
      opacity: 0;
      animation: fadeInUp 800ms ease-out 200ms forwards;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }

    .hero-cta {
      margin-top: var(--spacing-xl);
      opacity: 0;
      animation: fadeInUp 800ms ease-out 400ms forwards;
    }

    /* Formas decorativas con animación */
    .shape {
      position: absolute;
      pointer-events: none;
      opacity: 0.7;
    }

    .shape-square {
      border: 3px solid var(--color-negro);
    }

    .shape-1 {
      width: 150px;
      height: 150px;
      background-color: var(--color-turquesa);
      top: 10%;
      right: 5%;
      transform: rotate(45deg);
      animation: float 6s ease-in-out infinite;
    }

    .shape-2 {
      width: 100px;
      height: 100px;
      background-color: var(--color-coral);
      bottom: 10%;
      left: 5%;
      animation: float 5s ease-in-out infinite 1s;
    }

    .shape-3 {
      width: 80px;
      height: 80px;
      background-color: var(--color-lima);
      top: 50%;
      left: 10%;
      transform: rotate(30deg);
      animation: float 7s ease-in-out infinite 2s;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(45deg); }
      50% { transform: translateY(-20px) rotate(45deg); }
    }

    /* Info banner mejorado */
    .info-banner {
      padding: 80px 0;
      background: linear-gradient(135deg, var(--color-cian-claro) 0%, var(--color-turquesa) 100%);
      border-bottom: 3px solid var(--color-negro);
      text-align: center;
    }

    .info-detail {
      font-size: 20px;
      margin-bottom: var(--spacing-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-weight: 500;
    }

    .cta-group {
      display: flex;
      gap: var(--spacing-sm);
      justify-content: center;
      flex-wrap: wrap;
    }

    /* Footer mejorado */
    footer {
      padding: var(--spacing-xl) 0;
      background-color: var(--color-negro);
      color: var(--color-marfil);
    }

    .footer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--spacing-xl);
      margin-bottom: var(--spacing-lg);
    }

    .footer-section h4 {
      color: var(--color-turquesa);
      margin-bottom: var(--spacing-sm);
      font-size: 18px;
    }

    .footer-section p,
    .footer-section a {
      color: var(--color-borde-suave);
      font-size: 14px;
      line-height: 1.8;
      text-decoration: none;
      transition: color 200ms;
    }

    .footer-section a:hover {
      color: var(--color-turquesa);
      text-decoration: underline;
    }

    .footer-bottom {
      border-top: 1px solid var(--color-gris);
      padding-top: var(--spacing-md);
      text-align: center;
      color: var(--color-borde-suave);
      font-size: 14px;
    }

    /* Accesibilidad */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    /* Scroll suave */
    html {
      scroll-behavior: smooth;
    }

 /* Responsive */
@media (max-width: 767px) {
  .guest-image {
    width: 200px;
    height: 260px;
  }

  .guest-placeholder {
    width: 100px;
    height: 100px;
    font-size: 48px;
  }

  .guest-name {
    font-size: 15px;
  }

  .guest-role {
    font-size: 11px;
  }

  .guest-name-overlay {
    font-size: 18px;
  }

  .social-link {
    width: 45px;
    height: 45px;
    font-size: 20px;
  }
}
  </style>
</head>
<body>

  <!-- HEADER -->
  <header class="header">
    <div class="container">
      <nav style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
  <a href="/eventotickets/" style="font-family: 'Space Grotesk', sans-serif; font-weight: 900; font-size: 24px; color: var(--color-negro); text-decoration: none;">
          COMIC CON FESTIVAL
        </a>
        <div class="nav-links">
          <a href="/eventotickets/#tickets">TICKETS</a>
          <a href="/eventotickets/#invitados">INVITADOS</a>
          <a href="/eventotickets/#programa">PROGRAMA</a>
          <a href="/eventotickets/#ubicacion">UBICACIÓN</a>
        </div>
        <button class="menu-toggle" aria-label="Abrir menú de navegación">
          MENÚ
        </button>
      </nav>
    </div>
  </header>

  <!-- HERO SECTION CON IMAGEN DE FONDO -->
  <section class="hero">
    <!-- Formas decorativas -->
    <div class="shape shape-square shape-1"></div>
    <div class="shape shape-square shape-2"></div>
    <div class="shape shape-square shape-3"></div>

    <div class="container hero-content">
      <h1 style="margin-bottom: var(--spacing-md); text-shadow: 3px 3px 6px rgba(0,0,0,0.7);">
        COMIC CON FESTIVAL
      </h1>

      <p class="hero-subtitle">
        Unleash Your Inner Hero. Game. Cosplay. Create.
      </p>

      <div class="hero-cta">
  <a href="/eventotickets/#tickets" class="btn btn-outline" style="font-size: 16px; padding: 20px 48px; color: var(--color-marfil); border-color: var(--color-marfil);">
          GET TICKETS
        </a>
      </div>
    </div>
  </section>

  <!-- TICKETS SECTION CON TEXTURA DE CÓMIC -->
  <section id="tickets" class="tickets-section">
    <div class="container">
      <h2 style="text-align: center; margin-bottom: var(--spacing-2xl);">
        CHOOSE YOUR ADVENTURE
      </h2>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--spacing-lg); max-width: 1100px; margin: 0 auto;">

        <!-- Day Pass -->
        <div class="ticket-card" style="background-color: var(--color-menta);">
          <div class="ticket-type">
            DAY PASS
          </div>
          <div class="ticket-price">
            <span>€</span>99
          </div>
          <div class="ticket-title">
            Un Día
          </div>
          <ul class="ticket-features">
            <li>Acceso general 1 día</li>
            <li>Zona de exposición</li>
            <li>Meet & Greet básico</li>
            <li>Zona gaming</li>
          </ul>
          <a href="/eventotickets/comprar/day-pass" class="btn btn-primary" style="width: 100%;">
            BUY NOW
          </a>
        </div>

        <!-- Weekend Pass - DESTACADO -->
        <div class="ticket-card featured" style="background-color: var(--color-naranja); position: relative;">
          <div class="discount-badge">
            -20%
          </div>
          <div class="ticket-type" style="background-color: var(--color-negro); color: var(--color-amarillo); border-color: var(--color-negro);">
            ⭐ WEEKEND PASS
          </div>
          <div class="ticket-original-price">
            <span>€</span>198
          </div>
          <div class="ticket-price">
            <span>€</span>159
          </div>
          <div class="ticket-title">
            Fin de Semana
          </div>
          <ul class="ticket-features">
            <li>Acceso 2 días completo</li>
            <li>Entrada prioritaria</li>
            <li>Descuento 10% merchandising</li>
            <li>Acceso a talleres</li>
            <li>Meet & Greet premium</li>
          </ul>
          <a href="/eventotickets/comprar/weekend-pass" class="btn btn-primary" style="width: 100%;">
            BUY NOW
          </a>
        </div>

        <!-- VIP Experience -->
        <div class="ticket-card" style="background-color: var(--color-lavanda);">
          <div class="ticket-type">
            VIP EXPERIENCE
          </div>
          <div class="ticket-price">
            <span>€</span>295
          </div>
          <div class="ticket-title">
            Experiencia VIP
          </div>
          <ul class="ticket-features">
            <li>Todo lo del Weekend Pass</li>
            <li>Backstage tour exclusivo</li>
            <li>Cena con invitados</li>
            <li>Asiento preferente</li>
            <li>Pack exclusivo de regalos</li>
            <li>Foto profesional</li>
          </ul>
          <a href="/eventotickets/comprar/vip" class="btn btn-primary" style="width: 100%;">
            BUY NOW
          </a>
        </div>

      </div>

      <!-- Early Bird Notice -->
      <div style="text-align: center; margin-top: var(--spacing-xl);">
        <div class="chip" style="background-color: var(--color-amarillo); font-size: 16px;">
          <span style="font-size: 20px;">⚡</span>
          <span>EARLY BIRD: Ahorra 20% hasta el 15 de enero</span>
        </div>
      </div>
    </div>
  </section>

<!-- FEATURED GUESTS - TODO EN EL MISMO CAJÓN -->
<section id="invitados" style="padding: var(--spacing-3xl) 0; background-color: var(--color-blanco); border-top: 3px solid var(--color-negro); border-bottom: 3px solid var(--color-negro);">
  <div class="container">
    <h2 style="text-align: center; margin-bottom: var(--spacing-2xl);">
      FEATURED GUESTS & ARTISTS
    </h2>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--spacing-lg); max-width: 1000px; margin: 0 auto;">

      <!-- Guest 1 -->
      <div class="guest-card">
        <div class="guest-card-inner">
          <div class="guest-card-front">
            <!-- TODO DENTRO DEL MISMO CAJÓN -->
            <div class="guest-image">
              <!-- Contenido visible por defecto -->
              <div class="guest-content">
                <div class="guest-placeholder">👤</div>
                <h3 class="guest-name">Joel Gutiérrez</h3>
                <p class="guest-role">Doblador de Anime</p>
              </div>

              <!-- CORTINA QUE SUBE -->
              <div class="guest-card-overlay">
                <div class="overlay-content">
                  <h3 class="guest-name-overlay">Joel Gutiérrez</h3>
                  <p class="guest-role-overlay">Doblador de Anime</p>

                  <div class="social-links">
                    <a href="https://instagram.com" class="social-link" target="_blank" rel="noopener" aria-label="Instagram">
                      <span class="social-icon"><i class="fa-brands fa-instagram"></i></span>
                    </a>
                    <a href="https://twitter.com" class="social-link" target="_blank" rel="noopener" aria-label="Twitter">
                      <span class="social-icon"><i class="fa-brands fa-x-twitter"></i></span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Guest 2 -->
      <div class="guest-card">
        <div class="guest-card-inner">
          <div class="guest-card-front">
            <div class="guest-image">
              <div class="guest-content">
                <div class="guest-placeholder">👤</div>
                <h3 class="guest-name">Marina López</h3>
                <p class="guest-role">Artista de Cómic</p>
              </div>

              <div class="guest-card-overlay">
                <div class="overlay-content">
                  <h3 class="guest-name-overlay">Marina López</h3>
                  <p class="guest-role-overlay">Artista de Cómic</p>

                  <div class="social-links">
                    <a href="https://instagram.com" class="social-link" target="_blank" rel="noopener" aria-label="Instagram">
                      <span class="social-icon"><i class="fa-brands fa-instagram"></i></span>
                    </a>
                    <a href="https://facebook.com" class="social-link" target="_blank" rel="noopener" aria-label="Facebook">
                      <span class="social-icon"><i class="fa-brands fa-facebook"></i></span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Guest 3 -->
      <div class="guest-card">
        <div class="guest-card-inner">
          <div class="guest-card-front">
            <div class="guest-image">
              <div class="guest-content">
                <div class="guest-placeholder">👤</div>
                <h3 class="guest-name">Carlos Ruiz</h3>
                <p class="guest-role">Streamer Gaming</p>
              </div>

              <div class="guest-card-overlay">
                <div class="overlay-content">
                  <h3 class="guest-name-overlay">Carlos Ruiz</h3>
                  <p class="guest-role-overlay">Streamer Gaming</p>

                  <div class="social-links">
                    <a href="https://twitter.com" class="social-link" target="_blank" rel="noopener" aria-label="Twitter">
                      <span class="social-icon"><i class="fa-brands fa-x-twitter"></i></span>
                    </a>
                    <a href="https://instagram.com" class="social-link" target="_blank" rel="noopener" aria-label="Instagram">
                      <span class="social-icon"><i class="fa-brands fa-instagram"></i></span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Guest 4 -->
      <div class="guest-card">
        <div class="guest-card-inner">
          <div class="guest-card-front">
            <div class="guest-image">
              <div class="guest-content">
                <div class="guest-placeholder">👤</div>
                <h3 class="guest-name">Ana Martín</h3>
                <p class="guest-role">Cosplayer Pro</p>
              </div>

              <div class="guest-card-overlay">
                <div class="overlay-content">
                  <h3 class="guest-name-overlay">Ana Martín</h3>
                  <p class="guest-role-overlay">Cosplayer Pro</p>

                  <div class="social-links">
                    <a href="https://instagram.com" class="social-link" target="_blank" rel="noopener" aria-label="Instagram">
                      <span class="social-icon"><i class="fa-brands fa-instagram"></i></span>
                    </a>
                    <a href="https://tiktok.com" class="social-link" target="_blank" rel="noopener" aria-label="TikTok">
                      <span class="social-icon"><i class="fa-brands fa-tiktok"></i></span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Categories Legend -->
    <div class="legend">
      <div class="legend-item">
        <div class="legend-icon" style="background-color: var(--color-turquesa);"></div>
        <span>Gaming Arena</span>
      </div>
      <div class="legend-item">
        <div class="legend-icon" style="background-color: var(--color-naranja);"></div>
        <span>Panels & Showcases</span>
      </div>
      <div class="legend-item">
        <div class="legend-icon" style="background-color: var(--color-lavanda);"></div>
        <span>Cosplay & Photoshoots</span>
      </div>
    </div>
  </div>
</section>

  <!-- INFO SECTION -->
  <section class="info-banner" id="ubicacion">
    <div class="container">
      <h2 style="margin-bottom: var(--spacing-lg);">
        Las Palmas de Gran Canaria te espera
      </h2>
      <p class="info-detail">
        <span style="font-size: 24px;">📍</span>
        <span>Recinto Ferial de Canarias · Pabellón 7</span>
      </p>
      <p class="info-detail" style="font-size: 18px; margin-bottom: var(--spacing-lg);">
        <span style="font-size: 20px;">📅</span>
        <span>15-16 de Marzo 2025 · 10:00 - 21:00</span>
      </p>
      <div class="cta-group">
        <a href="/eventotickets/#tickets" class="btn btn-primary">
          COMPRAR TICKETS
        </a>
        <a href="/eventotickets/info" class="btn btn-outline">
          MÁS INFORMACIÓN
        </a>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer>
    <div class="container">
      <div class="footer-grid">

        <div class="footer-section">
          <h4>Términos & Condiciones</h4>
          <p><a href="/eventotickets/terminos">Consulta nuestros términos y condiciones de venta</a></p>
        </div>

        <div class="footer-section">
          <h4>Política de Privacidad</h4>
          <p><a href="/eventotickets/privacidad">Tu privacidad es importante para nosotros</a></p>
        </div>

        <div class="footer-section">
          <h4>Contacto</h4>
          <p>
            <a href="mailto:info@festigeekcanarias.com">info@festigeekcanarias.com</a><br>
            <a href="tel:+34922123456">+34 922 123 456</a>
          </p>
        </div>

      </div>

      <div class="footer-bottom">
        <p>© 2025 FestiGeek Canarias. Todos los derechos reservados.</p>
      </div>
    </div>
  </footer>

</body>
</html>
```

Ahora voy a actualizar el index.astro para agregar Stripe.js y conectar los botones:

**Diff:**

```diff
--- C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages\index.astro
+++ C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\src\pages\index.astro
@@ -16,6 +16,8 @@
   <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
   <!-- Iconos -->
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
+  <!-- Stripe.js -->
+  <script src="https://js.stripe.com/v3/"></script>
   <style>
     :root {
       /* Colores Neutros */
@@ -956,9 +958,9 @@
             <li>Meet & Greet básico</li>
             <li>Zona gaming</li>
           </ul>
-          <a href="/eventotickets/comprar/day-pass" class="btn btn-primary" style="width: 100%;">
+          <button class="btn btn-primary buy-ticket" data-ticket-type="day-pass" style="width: 100%;">
             BUY NOW
-          </a>
+          </button>
         </div>

         <!-- Weekend Pass - DESTACADO -->
@@ -985,9 +987,9 @@
             <li>Acceso a talleres</li>
             <li>Meet & Greet premium</li>
           </ul>
-          <a href="/eventotickets/comprar/weekend-pass" class="btn btn-primary" style="width: 100%;">
+          <button class="btn btn-primary buy-ticket" data-ticket-type="weekend-pass" style="width: 100%;">
             BUY NOW
-          </a>
+          </button>
         </div>

         <!-- VIP Experience -->
@@ -1009,9 +1011,9 @@
             <li>Pack exclusivo de regalos</li>
             <li>Foto profesional</li>
           </ul>
-          <a href="/eventotickets/comprar/vip" class="btn btn-primary" style="width: 100%;">
+          <button class="btn btn-primary buy-ticket" data-ticket-type="vip" style="width: 100%;">
             BUY NOW
-          </a>
+          </button>
         </div>

       </div>
@@ -1238,5 +1240,62 @@
     </div>
   </footer>

+  <!-- Script de integración con Stripe -->
+  <script>
+    // Inicializar Stripe (la clave pública se carga desde las variables de entorno)
+    const stripe = Stripe(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY);
+
+    // Seleccionar todos los botones de compra
+    const buyButtons = document.querySelectorAll('.buy-ticket');
+
+    buyButtons.forEach(button => {
+      button.addEventListener('click', async (e) => {
+        const ticketType = e.target.dataset.ticketType;
+
+        // Deshabilitar el botón y mostrar loading
+        button.disabled = true;
+        button.textContent = 'PROCESANDO...';
+
+        try {
+          // Llamar a nuestra API para crear la sesión de checkout
+          const response = await fetch('/api/checkout', {
+            method: 'POST',
+            headers: {
+              'Content-Type': 'application/json',
+            },
+            body: JSON.stringify({
+              ticketType: ticketType,
+              quantity: 1,
+            }),
+          });
+
+          const data = await response.json();
+
+          if (!response.ok) {
+            throw new Error(data.error || 'Error al procesar la solicitud');
+          }
+
+          // Redirigir a Stripe Checkout
+          const { error } = await stripe.redirectToCheckout({
+            sessionId: data.sessionId,
+          });
+
+          if (error) {
+            console.error('Error de Stripe:', error);
+            alert('Error al redireccionar al checkout: ' + error.message);
+          }
+
+        } catch (error) {
+          console.error('Error:', error);
+          alert('Error al procesar la compra. Por favor, intenta de nuevo.');
+
+          // Restaurar el botón
+          button.disabled = false;
+          button.textContent = 'BUY NOW';
+        }
+      });
+    });
+  </script>
+
 </body>
-</html>
+</html>

```

MarkAsCompleted: 1 items

## **PASO 6: Actualizar package.json con scripts útiles**

**Files Read:**

**C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\package.json**

```
{
  "name": "festigeek-mvp",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "db:generate": "drizzle-kit generate:pg",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@astrojs/node": "^8.3.2",
    "@astrojs/tailwind": "^5.1.0",
    "astro": "^4.8.2",
    "drizzle-orm": "^0.30.10",
    "postgres": "^3.4.4",
    "stripe": "^15.8.0",
    "tailwindcss": "^3.4.3"
  },
  "devDependencies": {
    "drizzle-kit": "^0.21.4",
    "tsx": "^4.10.2"
  }
}

```

**Diff:**

```diff
--- C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\package.json
+++ C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\package.json
@@ -4,8 +4,11 @@
   "version": "0.0.1",
   "scripts": {
     "dev": "astro dev",
+    "dev:local": "astro dev --config astro.config.local.mjs",
     "start": "astro dev",
     "build": "astro build",
+    "build:local": "astro build --config astro.config.local.mjs",
+    "build:pages": "astro build --config astro.config.mjs",
     "preview": "astro preview",
     "astro": "astro",
     "db:generate": "drizzle-kit generate:pg",

```

MarkAsCompleted: 1 items

## **PASO 7: Actualizar Dockerfile**

**Files Read:**

**C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\Dockerfile**

```
# Dockerfile
# (Contenido idéntico al que proporcionaste)
# Imagen base: Node.js 20 (LTS) en Alpine Linux (super ligera)
FROM node:20-alpine AS base

# Instalar dependencias del sistema necesarias para compilar módulos nativos
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# ────────────────────────────────────────────────
# STAGE 1: Instalación de dependencias
# ────────────────────────────────────────────────
FROM base AS deps

# Instalar TODAS las dependencias (incluyendo devDependencies)
RUN npm ci

# ────────────────────────────────────────────────
# STAGE 2: Builder (solo para producción, opcional para más adelante)
# ────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# RUN npm run build

# ────────────────────────────────────────────────
# STAGE 3: Desarrollo (Hot reload)
# ────────────────────────────────────────────────
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4321
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ────────────────────────────────────────────────
# STAGE 4: Producción (opcional, para después)
# ────────────────────────────────────────────────
FROM base AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/dist ./dist
EXPOSE 4321
# CMD ["node", "./dist/server/entry.mjs"]
```

**Diff:**

```diff
--- C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\Dockerfile
+++ C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\Dockerfile
@@ -36,7 +36,8 @@
 COPY --from=deps /app/node_modules ./node_modules
 COPY . .
 EXPOSE 4321
-CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
+# Usar configuración local para desarrollo con SSR y Stripe
+CMD ["npm", "run", "dev:local", "--", "--host", "0.0.0.0"]

 # ────────────────────────────────────────────────
 # STAGE 4: Producción (opcional, para después)

```

MarkAsCompleted: 1 items
Perfecto! Ahora voy a crear una guía de inicio rápido para que puedas empezar a probar:

**Diff:**

````diff
--- C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\EMPEZAR_AQUI.md
+++ C:\Users\Personal\Documents\PROGRAMACION\docker-uses\proyectos\festigeek-mvp\EMPEZAR_AQUI.md
@@ -0,0 +1,287 @@
+# 🚀 EMPEZAR AQUÍ - Guía de Inicio Rápido
+
+## ✅ **Implementación Completada**
+
+¡Todo el código de Stripe está listo! Aquí está lo que se ha implementado:
+
+### **Archivos Creados:**
+
+1. **API Routes:**
+   - ✅ `src/pages/api/checkout.ts` - Crea sesiones de pago
+   - ✅ `src/pages/api/webhooks.ts` - Recibe eventos de Stripe
+
+2. **Páginas:**
+   - ✅ `src/pages/success.astro` - Confirmación de compra
+   - ✅ `src/pages/cancel.astro` - Compra cancelada
+
+3. **Integración Frontend:**
+   - ✅ `src/pages/index.astro` - Botones conectados con Stripe.js
+
+4. **Configuración:**
+   - ✅ `astro.config.local.mjs` - Config para desarrollo local con SSR
+   - ✅ `package.json` - Scripts actualizados
+   - ✅ `Dockerfile` - Usa configuración local
+
+---
+
+## 🎯 **Pasos para Empezar (5 minutos)**
+
+### **1. Obtener Claves de Stripe Test**
+
+1. Ve a: https://dashboard.stripe.com/register
+2. Crea una cuenta (es gratis)
+3. Una vez dentro, ve a: https://dashboard.stripe.com/test/apikeys
+4. Copia estas dos claves:
+
+```
+Publishable key: pk_test_51xxxxx...
+Secret key: sk_test_51xxxxx...
+```
+
+### **2. Configurar Variables de Entorno**
+
+Abre tu archivo `.env` y agrega tus claves:
+
+```bash
+# Base de datos (ya lo tienes)
+DATABASE_URL=postgresql://festivgeek_user:secretpassword@db:5432/festivgeek_db
+
+# Stripe (AGREGA ESTO con tus claves reales)
+STRIPE_SECRET_KEY=sk_test_TU_CLAVE_SECRETA_AQUI
+PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_TU_CLAVE_PUBLICA_AQUI
+
+# Webhook secret (se genera automáticamente al levantar Docker)
+STRIPE_WEBHOOK_SECRET=whsec_se_genera_automaticamente
+```
+
+### **3. Levantar Docker**
+
+```bash
+# Detener si está corriendo
+docker compose down
+
+# Levantar todos los servicios
+docker compose up -d
+
+# Ver logs de la aplicación
+docker compose logs app -f
+```
+
+### **4. Crear las Tablas de la Base de Datos**
+
+```bash
+# Ejecutar migraciones
+docker compose exec app npm run db:push
+
+# Verificar que se crearon las tablas (opcional)
+docker compose exec app npm run db:studio
+# Abre en: http://localhost:4983
+```
+
+### **5. Obtener el Webhook Secret de Stripe**
+
+```bash
+# Ver los logs de Stripe CLI
+docker compose logs stripe
+
+# Busca una línea como esta:
+# > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
+
+# COPIA ese valor y agrégalo a tu .env
+```
+
+Edita `.env` y agrega:
+```bash
+STRIPE_WEBHOOK_SECRET=whsec_EL_VALOR_QUE_COPIASTE
+```
+
+Reinicia la app:
+```bash
+docker compose restart app
+```
+
+---
+
+## 🧪 **Probar una Compra**
+
+### **1. Abrir la Aplicación**
+
+```
+http://localhost:4321
+```
+
+### **2. Hacer Click en "BUY NOW"**
+
+- Elige cualquier ticket (Day Pass, Weekend Pass, o VIP)
+- Haz click en el botón "BUY NOW"
+- Te redirigirá a Stripe Checkout
+
+### **3. Usar Tarjeta de Prueba**
+
+En el formulario de Stripe, usa estos datos:
+
+```
+Número de tarjeta: 4242 4242 4242 4242
+Fecha: Cualquier fecha futura (ej: 12/25)
+CVC: Cualquier 3 dígitos (ej: 123)
+Código postal: Cualquiera (ej: 12345)
+```
+
+### **4. Completar la Compra**
+
+- Llena el formulario con datos de prueba
+- Haz click en "Pagar"
+- Te redirigirá a `/success` con la confirmación
+
+### **5. Verificar el Pedido en la Base de Datos**
+
+```bash
+# Abrir Drizzle Studio
+docker compose exec app npm run db:studio
+
+# O ver los logs del webhook
+docker compose logs stripe -f
+```
+
+Deberías ver un registro nuevo en la tabla `pedidos`.
+
+---
+
+## 📊 **Verificar que Todo Funciona**
+
+### **Checklist:**
+
+- [ ] ✅ La app carga en `http://localhost:4321`
+- [ ] ✅ Los botones "BUY NOW" funcionan
+- [ ] ✅ Te redirige a Stripe Checkout
+- [ ] ✅ Puedes completar el pago con tarjeta de prueba
+- [ ] ✅ Te redirige a `/success` después del pago
+- [ ] ✅ El pedido se guarda en la base de datos
+- [ ] ✅ Los logs de Stripe CLI muestran el webhook
+
+---
+
+## 🔧 **Comandos Útiles**
+
+```bash
+# Ver logs de la app
+docker compose logs app -f
+
+# Ver logs de Stripe CLI (webhooks)
+docker compose logs stripe -f
+
+# Ver logs de la base de datos
+docker compose logs db -f
+
+# Reiniciar solo la app (después de cambios)
+docker compose restart app
+
+# Ver estado de los contenedores
+docker compose ps
+
+# Entrar al contenedor de la app
+docker compose exec app sh
+
+# Limpiar todo y empezar de nuevo
+docker compose down -v
+docker compose up -d
+```
+
+---
+
+## 🎨 **Personalizar Precios**
+
+Los precios están en `src/pages/api/checkout.ts`:
+
+```typescript
+const prices: Record<string, number> = {
+  'day-pass': 9900,      // €99.00 (en centavos)
+  'weekend-pass': 15900, // €159.00
+  'vip': 29500           // €295.00
+};
+```
+
+Cambia los valores y reinicia:
+```bash
+docker compose restart app
+```
+
+---
+
+## 🐛 **Problemas Comunes**
+
+### **Error: "PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined"**
+- Asegúrate de que tu `.env` tiene la clave pública
+- Reinicia Docker: `docker compose restart app`
+
+### **Error: "DATABASE_URL no está definida"**
+- Verifica que la variable está en `.env`
+- Asegúrate de que el contenedor de DB está corriendo: `docker compose ps`
+
+### **Los webhooks no funcionan**
+- Verifica que el container `stripe` está corriendo
+- Revisa los logs: `docker compose logs stripe`
+- Asegúrate de tener el `STRIPE_WEBHOOK_SECRET` en `.env`
+
+### **Botón "BUY NOW" no hace nada**
+- Abre la consola del navegador (F12) para ver errores
+- Verifica que Stripe.js se cargó correctamente
+- Revisa los logs de la app: `docker compose logs app -f`
+
+---
+
+## 📚 **Recursos Adicionales**
+
+- **Tarjetas de prueba:** https://stripe.com/docs/testing
+- **Dashboard de Stripe:** https://dashboard.stripe.com/test/payments
+- **Documentación de Stripe:** https://stripe.com/docs
+- **API Reference:** https://stripe.com/docs/api
+
+---
+
+## 🎓 **Próximos Pasos**
+
+Una vez que todo funcione:
+
+1. **Personaliza los emails** de confirmación en Stripe Dashboard
+2. **Agrega más productos** modificando los precios
+3. **Implementa descuentos** usando Stripe Coupons
+4. **Agrega un panel de administración** para ver pedidos
+5. **Configura webhooks de producción** cuando despliegues
+
+---
+
+## ✅ **¿Listo para Producción?**
+
+Cuando quieras desplegar tu app con ventas reales:
+
+### **Opción 1: Vercel (Recomendado)**
+```bash
+npm i -g vercel
+vercel
+```
+
+### **Opción 2: Railway**
+- Conecta tu repo de GitHub
+- Railway detectará automáticamente Astro
+- Configura las variables de entorno
+
+### **Opción 3: VPS (DigitalOcean, AWS, etc.)**
+- Sube tu código
+- Configura PM2 o similar
+- Usa las claves LIVE de Stripe (no test)
+
+---
+
+## 🆘 **¿Necesitas Ayuda?**
+
+Si algo no funciona:
+
+1. Revisa los logs: `docker compose logs app -f`
+2. Verifica que Docker está corriendo: `docker compose ps`
+3. Comprueba tu `.env`
+4. Asegúrate de tener las claves correctas de Stripe
+
+---
+
+**¡A VENDER TICKETS!** 🎟️🚀

````

Perfecto! Ahora voy a verificar el estado de git y crear un resumen final:

**Command Executed:**

```bash
git status
```

**Output:**

```
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   Dockerfile
	modified:   package.json
	modified:   src/pages/index.astro

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	CONFIGURACION_DUAL.md
	EMPEZAR_AQUI.md
	GUIA_DESARROLLO_STRIPE.md
	RESUMEN_WARP.md
	SOLUCION_RESUMEN.md
	astro.config.local.mjs
	src/pages/api/
	src/pages/cancel.astro
	src/pages/success.astro

no changes added to commit (use "git add" and/or "git commit -a")
```

Perfecto! Ahora voy a crear un resumen final para ti:

---

## 🎉 **¡IMPLEMENTACIÓN COMPLETADA!** 🎉

He implementado **todo el sistema de Stripe** para tu proyecto de venta de tickets. Aquí está el resumen completo:

---

## ✅ **Archivos Creados (11 nuevos)**

### **📁 API Routes** (Backend)

1. `src/pages/api/checkout.ts` - Crea sesiones de pago con Stripe
2. `src/pages/api/webhooks.ts` - Recibe eventos y guarda pedidos en BD

### **📄 Páginas** (Frontend)

3. `src/pages/success.astro` - Página de confirmación de compra
4. `src/pages/cancel.astro` - Página de compra cancelada

### **⚙️ Configuración**

5. `astro.config.local.mjs` - Config para desarrollo local con SSR
6. **Modificado:** `package.json` - Scripts para local vs GitHub Pages
7. **Modificado:** `Dockerfile` - Usa config local
8. **Modificado:** `src/pages/index.astro` - Botones conectados con Stripe

### **📚 Documentación**

9. `EMPEZAR_AQUI.md` - **Guía de inicio rápido (LEE ESTO PRIMERO)**
10. `GUIA_DESARROLLO_STRIPE.md` - Guía completa de desarrollo
11. `CONFIGURACION_DUAL.md` - Cómo manejar local vs GitHub Pages

---

## 🚀 **Próximos Pasos (EN ESTE ORDEN)**

### **1. Obtener Claves de Stripe (2 minutos)**

```
https://dashboard.stripe.com/register
→ Crea cuenta → Obtén claves de TEST
```

### **2. Configurar `.env` (1 minuto)**

```bash
# Agrega tus claves de Stripe
STRIPE_SECRET_KEY=sk_test_...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### **3. Levantar Docker (2 minutos)**

```bash
docker compose down
docker compose up -d
docker compose logs app -f
```

### **4. Crear Base de Datos (1 minuto)**

```bash
docker compose exec app npm run db:push
```

### **5. Obtener Webhook Secret (1 minuto)**

```bash
docker compose logs stripe
# Copia el "whsec_..." y agrégalo a .env
```

### **6. Probar una Compra! 🎟️**

```
http://localhost:4321
→ Click en "BUY NOW"
→ Usa tarjeta: 4242 4242 4242 4242
→ ¡Listo!
```

---

## 📋 **¿Qué Hace Todo Esto?**

### **Flujo Completo:**

1. **Usuario hace click en "BUY NOW"**
   → JavaScript llama a `/api/checkout`

2. **API crea sesión de Stripe**
   → Devuelve `sessionId`

3. **Usuario es redirigido a Stripe Checkout**
   → Página segura de Stripe para pagar

4. **Usuario completa el pago**
   → Stripe procesa la tarjeta

5. **Stripe envía webhook a `/api/webhooks`**
   → Tu app recibe confirmación

6. **Webhook guarda pedido en base de datos**
   → PostgreSQL con Drizzle ORM

7. **Usuario ve página de success**
   → Confirmación con número de pedido

---

## 🎯 **Características Implementadas**

- ✅ **3 tipos de tickets** (Day Pass, Weekend Pass, VIP)
- ✅ **Integración completa de Stripe Checkout**
- ✅ **Webhooks para confirmación automática**
- ✅ **Guardado de pedidos en PostgreSQL**
- ✅ **Páginas de success/cancel**
- ✅ **Manejo de errores**
- ✅ **Loading states en botones**
- ✅ **Docker Compose listo para desarrollo**
- ✅ **Stripe CLI para webhooks locales**

---

## 📂 **Estructura del Proyecto**

```
festigeek-mvp/
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   ├── checkout.ts      ← Crear sesión de pago
│   │   │   └── webhooks.ts      ← Recibir eventos
│   │   ├── index.astro          ← Página principal (modificada)
│   │   ├── success.astro        ← Confirmación de compra
│   │   └── cancel.astro         ← Compra cancelada
│   └── db/
│       ├── client.ts             ← Conexión a BD
│       └── schema.ts             ← Tablas (pedidos, entradas)
├── astro.config.mjs             ← Config para GitHub Pages
├── astro.config.local.mjs       ← Config para desarrollo local SSR
├── docker-compose.yml           ← 3 servicios (app, db, stripe)
├── Dockerfile                   ← Modificado para usar config local
├── package.json                 ← Scripts actualizados
├── .env                         ← Variables de entorno (AGREGAR CLAVES AQUÍ)
└── EMPEZAR_AQUI.md             ← **LEE ESTO PRIMERO**
```

---

## 🔥 **Lo Más Importante**

### **Para Desarrollo Local:**

```bash
docker compose up -d
# La app usará astro.config.local.mjs automáticamente
# Modo SSR con API Routes y Base de Datos
```

### **Para GitHub Pages:**

```bash
npm run build:pages
git push origin main
# GitHub Actions usará astro.config.mjs
# Modo estático (SIN backend)
```

---

## ⚠️ **IMPORTANTE: Dos Entornos Diferentes**

| Característica    | Local (Docker)       | GitHub Pages        |
| ----------------- | -------------------- | ------------------- |
| **Modo**          | SSR (Server)         | Estático            |
| **API Routes**    | ✅ Funcionan         | ❌ NO funcionan     |
| **Base de Datos** | ✅ PostgreSQL        | ❌ No disponible    |
| **Stripe**        | ✅ Completo          | ❌ Solo landing     |
| **Uso**           | Desarrollo y pruebas | Solo mostrar página |

**Para producción con ventas reales**, necesitarás desplegar en:

- Vercel (recomendado)
- Railway
- VPS propio

---

## 📚 **Documentos de Ayuda Creados**

1. **`EMPEZAR_AQUI.md`** ⭐ **LEE ESTO PRIMERO**

   - Guía de inicio rápido (5 minutos)
   - Pasos numerados
   - Checklist de verificación

2. **`GUIA_DESARROLLO_STRIPE.md`**

   - Guía completa con código
   - Todos los endpoints explicados
   - Tarjetas de prueba
   - Troubleshooting

3. **`CONFIGURACION_DUAL.md`**
   - Cómo manejar local vs GitHub Pages
   - Scripts de NPM
   - Variables de entorno

---

## 🎯 **¡Empieza Ahora!**

**Abre este archivo y sigue los pasos:**

```
EMPEZAR_AQUI.md
```

Todo está listo. Solo necesitas:

1. Claves de Stripe (gratis)
2. Levantar Docker
3. ¡Probar una compra!

---

**¿Tienes alguna pregunta antes de empezar?** 🚀
