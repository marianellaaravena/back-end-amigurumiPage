import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedTime?: number;
}
