import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import products from '../../data/products.json';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27-preview',
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { items } = body; // Expecting { items: [{ id, quantity }] }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items in cart' }), {
        status: 400,
      });
    }

    const lineItems = items.map((cartItem: any) => {
      const product = products.find((p) => p.id === cartItem.id);
      if (!product) {
        throw new Error(`Product not found: ${cartItem.id}`);
      }
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description,
            images: [new URL(product.mockup_url, import.meta.env.PUBLIC_SITE_URL).toString()],
          },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: cartItem.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
      success_url: `${import.meta.env.PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${import.meta.env.PUBLIC_SITE_URL}/cart`,
      metadata: {
        orderItems: JSON.stringify(items.map((i: any) => ({ id: i.id, q: i.quantity }))),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
    });
  } catch (error: any) {
    console.error('Stripe error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
};
