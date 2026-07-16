import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryMode } from '../enums/order-status.enum';

export class OrderItemDto {
  @IsNumber()
  @IsPositive()
  productId!: number;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @IsEnum(DeliveryMode)
  deliveryMode!: DeliveryMode;

  @IsString()
  customerName!: string;

  @IsString()
  customerLastName!: string;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  estimatedPreparationTime?: number;
}
