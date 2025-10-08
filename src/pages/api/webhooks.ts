// src/pages/api/webhooks.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
// import { db } from '../../db/client';
// import { pedidos } from '../../db/schema';

// Inicializar Stripe
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export const POST: APIRoute = async ({ request }) => {
  // Obtener el body raw (necesario para verificar la firma)
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('⚠️ No se recibió firma de Stripe');
    return new Response('No signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verificar que el webhook viene realmente de Stripe
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      import.meta.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error('⚠️ Error verificando firma del webhook:', err);
    return new Response(
      `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      { status: 400 }
    );
  }

  // Manejar diferentes tipos de eventos
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log('✅ Checkout completado:', {
          sessionId: session.id,
          email: session.customer_details?.email,
          amount: session.amount_total,
        });

        // Guardar el pedido en la base de datos
        try {
          const { db, pedidos } = await import('../../db/client');
          await db.insert(pedidos).values({
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string || '',
            emailComprador: session.customer_details?.email || '',
            nombreComprador: session.customer_details?.name || '',
            total: session.amount_total || 0,
            estado: 'completed',
            entradaId: session.metadata?.ticketType || '',
            cantidad: parseInt(session.metadata?.quantity || '1'),
            fechaPago: new Date(),
            metadata: JSON.stringify({
              phone: session.customer_details?.phone,
              address: session.customer_details?.address,
            }),
          });

          console.log('💾 Pedido guardado en BD correctamente');
        } catch (dbError) {
          console.error('❌ Error guardando en BD:', dbError);
          // No retornar error para no hacer que Stripe reintente
          // En producción, podrías enviar esto a un sistema de monitoreo
        }

        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('💰 Pago exitoso:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Pago fallido:', {
          id: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message,
        });
        
        // Aquí podrías actualizar el pedido a estado 'failed'
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('↩️ Reembolso procesado:', charge.id);
        
        // Aquí podrías actualizar el pedido a estado 'refunded'
        break;
      }

      default:
        console.log(`ℹ️ Evento no manejado: ${event.type}`);
    }

    // Responder a Stripe que el webhook fue recibido correctamente
    return new Response(
      JSON.stringify({ received: true, event: event.type }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    
    // Aún así, devolver 200 para evitar reintentos infinitos de Stripe
    return new Response(
      JSON.stringify({ 
        received: true, 
        error: 'Processing failed but acknowledged' 
      }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
