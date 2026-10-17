// Evidencia de la Entrega 2: le manda al webhook un evento `charge.succeeded`
// firmado con el secreto de endpoint, igual que lo haría Stripe.
//
// Uso: node evidencias/prueba-webhook.mjs

import { readFileSync } from 'node:fs';
import Stripe from 'stripe';

/** Lee el .env sin depender de dotenv. */
function leerEnv() {
  const texto = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const env = {};
  for (const linea of texto.split(/\r?\n/)) {
    const match = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = leerEnv();
const secreto = env.STRIPE_ENDPOINT_SECRET;
if (!secreto) {
  console.error('Falta STRIPE_ENDPOINT_SECRET en .env');
  process.exit(1);
}

const stripe = new Stripe(env.STRIPE_SECRET ?? 'sk_test_sin_clave');
const url = `http://localhost:${env.PORT ?? 3003}/payments/webhook`;

const evento = {
  id: 'evt_prueba_1',
  object: 'event',
  type: 'charge.succeeded',
  data: {
    object: {
      id: 'ch_prueba_1',
      object: 'charge',
      metadata: { orderId: 'ord-1' },
    },
  },
};

const payload = JSON.stringify(evento);
const firmaValida = stripe.webhooks.generateTestHeaderString({ payload, secret: secreto });

async function enviar(etiqueta, firma) {
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(firma ? { 'stripe-signature': firma } : {}),
    },
    body: payload,
  });

  const cuerpo = await respuesta.text();
  console.log(`${etiqueta}: HTTP ${respuesta.status} ${cuerpo}`);
}

await enviar('sin firma         ', null);
await enviar('firma inventada   ', 't=1,v1=deadbeef');
await enviar('firma valida      ', firmaValida);
