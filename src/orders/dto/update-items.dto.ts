import {
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateItemDto {
  @IsNumber()
  @IsPositive()
  itemId!: number;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class UpdateItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateItemDto)
  items!: UpdateItemDto[];
}
