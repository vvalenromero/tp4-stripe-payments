import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PaymentsModule } from './payments/payments.module.js';

/**
 * Variables sin las cuales el microservicio no puede funcionar.
 * Si falta alguna, la app NO arranca (config fail-fast).
 */
const REQUIRED_ENV = [
  'STRIPE_SECRET',
  'STRIPE_SUCCESS_URL',
  'STRIPE_CANCEL_URL',
  'STRIPE_ENDPOINT_SECRET',
] as const;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => {
        const faltantes = REQUIRED_ENV.filter((clave) => !config[clave]);
        if (faltantes.length > 0) {
          throw new Error(
            `Configuracion incompleta. Faltan variables de entorno: ${faltantes.join(', ')}. ` +
              'Copia .env.template a .env y completala.',
          );
        }
        return config;
      },
    }),
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
