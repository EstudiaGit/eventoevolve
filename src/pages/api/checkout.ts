// src/pages/api/checkout.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';

// Inicializar Stripe con tu clave secreta
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parsear el body de la petición
    const { ticketType, quantity } = await request.json();

    // Validar que ticketType existe
    if (!ticketType) {
      return new Response(
        JSON.stringify({ error: 'ticketType es requerido' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Precios según tipo (en centavos de euro)
    const prices: Record<string, number> = {
      'day-pass': 9900,      // €99.00
      'weekend-pass': 15900, // €159.00
      'vip': 29500           // €295.00
    };

    // Nombres descriptivos
    const names: Record<string, string> = {
      'day-pass': 'Day Pass - 1 Día',
      'weekend-pass': 'Weekend Pass - 2 Días',
      'vip': 'VIP Experience - Acceso Completo'
    };

    // Validar que el tipo de ticket existe
    if (!prices[ticketType]) {
      return new Response(
        JSON.stringify({ error: 'Tipo de ticket inválido' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: names[ticketType],
              description: 'FestiGeek Canarias 2025 - 15-16 Marzo',
              images: [], // Puedes agregar URLs de imágenes aquí
            },
            unit_amount: prices[ticketType],
          },
          quantity: quantity || 1,
        },
      ],
      mode: 'payment',
      
      // URLs de redirección (funcionarán tanto en local como en producción)
      success_url: `${new URL(request.url).origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/cancel`,
      
      // Metadata para identificar el pedido después
      metadata: {
        ticketType,
        quantity: (quantity || 1).toString(),
      },
      
      // Configuración adicional
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true,
      },
    });

    console.log('✅ Sesión de checkout creada:', session.id);

    // Devolver el ID de la sesión al frontend
    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url // URL de redirección a Stripe
      }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error creando sesión de checkout:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Error al procesar la solicitud',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
