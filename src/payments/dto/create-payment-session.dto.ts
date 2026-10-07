import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PaymentItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** Precio en unidades (no centavos). El service lo pasa a centavos para Stripe. */
  @IsNumber()
  @IsPositive()
  price!: number;

  @IsNumber()
  @IsPositive()
  quantity!: number;
}

export class CreatePaymentSessionDto {
  /** Viaja en metadata del PaymentIntent para reconocerlo después en el webhook. */
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items!: PaymentItemDto[];
}
