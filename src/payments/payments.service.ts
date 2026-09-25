import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto.js';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;

  constructor(private readonly config: ConfigService) {
    this.stripe = new Stripe(this.config.getOrThrow<string>('STRIPE_SECRET'));
  }

  /**
   * Crea una Checkout Session en modo pago y devuelve lo minimo que el
   * cliente necesita para redirigir: id y url.
   */
  async createPaymentSession(dto: CreatePaymentSessionDto) {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: this.config.getOrThrow<string>('STRIPE_SUCCESS_URL'),
      cancel_url: this.config.getOrThrow<string>('STRIPE_CANCEL_URL'),
      line_items: dto.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: dto.currency,
          // Stripe trabaja en centavos
          unit_amount: Math.round(item.price * 100),
          product_data: { name: item.name },
        },
      })),
      // El orderId queda en el PaymentIntent para poder reconocerlo en el webhook
      payment_intent_data: {
        metadata: { orderId: dto.orderId },
      },
    });

    return { id: session.id, url: session.url };
  }

  /**
   * Verifica la firma del webhook. Lanza si el evento no es autentico.
   */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.config.getOrThrow<string>('STRIPE_ENDPOINT_SECRET'),
    );
  }
}
