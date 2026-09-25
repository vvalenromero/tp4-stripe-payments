import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /** Entrega 1: crea la Checkout Session. */
  @Post('create-payment-session')
  async createPaymentSession(@Body() dto: CreatePaymentSessionDto) {
    return this.paymentsService.createPaymentSession(dto);
  }

  /** Redirect de Checkout cuando el pago sale bien. */
  @Get('success')
  success() {
    return { ok: true, message: 'Payment successful' };
  }

  /** Redirect de Checkout cuando el usuario cancela. */
  @Get('cancel')
  cancel() {
    return { ok: false, message: 'Payment cancelled' };
  }

  /** Entrega 2: Stripe avisa aca cuando el cobro se concreto. */
  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Falta el header stripe-signature');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('No hay rawBody disponible');
    }

    let event;
    try {
      event = this.paymentsService.constructEvent(rawBody, signature);
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Firma invalida, evento descartado: ${detalle}`);
      throw new BadRequestException(`Firma invalida: ${detalle}`);
    }

    if (event.type === 'charge.succeeded') {
      const charge = event.data.object;
      const orderId = charge.metadata?.orderId ?? '(sin orderId en metadata)';
      this.logger.log(`PAGO CONFIRMADO - orderId=${orderId}`);
    } else {
      this.logger.log(`Evento no manejado: ${event.type}`);
    }

    // Siempre 200 para que Stripe no reintente eternamente
    return { received: true };
  }
}
