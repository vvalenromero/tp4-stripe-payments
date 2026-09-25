import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // rawBody: true es obligatorio para poder verificar la firma de Stripe.
  // Sin esto, el body llega ya parseado y constructEvent falla.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta campos que no estan en el DTO
      forbidNonWhitelisted: true, // y devuelve 400 si mandan campos de mas
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  console.log(`payments-ms escuchando en http://localhost:${port}`);
}

await bootstrap();
