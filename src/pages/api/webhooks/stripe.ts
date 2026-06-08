import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import products from '../../../data/products.json';
import { execSync } from 'child_process';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27-preview',
});

const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get('stripe-signature');

  if (!signature || !webhookSecret) {
    return new Response('Webhook secret or signature missing', { status: 400 });
  }

  try {
    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Checkout session completed:', session.id);
      
      const orderItems = JSON.parse(session.metadata?.orderItems || '[]');
      const printfulItems = orderItems.map((item: any) => {
        const product = products.find((p: any) => p.id === item.id);
        return {
          variant_id: product?.printful_variant_id,
          quantity: item.q,
          files: [
            {
              url: new URL(product?.image_url || '', import.meta.env.PUBLIC_SITE_URL).toString(),
            },
          ],
        };
      });

      console.log('Submitting order to Printful...');
      
      let printfulOrderId = null;
      let orderStatus = 'failed_fulfillment';

      try {
        const printfulResponse = await fetch('https://api.printful.com/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.PRINTFUL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: {
              name: session.shipping_details?.name,
              address1: session.shipping_details?.address?.line1,
              city: session.shipping_details?.address?.city,
              state_code: session.shipping_details?.address?.state,
              country_code: session.shipping_details?.address?.country,
              zip: session.shipping_details?.address?.postal_code,
            },
            items: printfulItems,
          }),
        });

        const printfulData = await printfulResponse.json();
        
        if (printfulResponse.ok) {
          printfulOrderId = printfulData.result.id;
          orderStatus = 'pending';
          console.log('Printful order created:', printfulOrderId);
        } else {
          console.error('Printful API error:', printfulData.error);
        }
      } catch (err) {
        console.error('Failed to call Printful API:', err);
      }

      // Track order in team-db
      try {
        const customerEmail = session.customer_details?.email || '';
        const sql = `INSERT INTO orders (id, stripe_session_id, printful_order_id, customer_email, status) VALUES ('${session.id}', '${session.id}', ${printfulOrderId || 'NULL'}, '${customerEmail}', '${orderStatus}')`;
        execSync(`team-db "${sql}"`);
        console.log('Order tracked in team-db');
      } catch (err) {
        console.error('Failed to track order in team-db:', err);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
};
