import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  // Nombre del amigurumi (obligatorio, texto y máximo 200 caracteres)
  @IsString()
  @MaxLength(200)
  name: string;
  @IsString()
  @IsOptional()
  description?: string;
//PRECIO DE VENTA
  @IsNumber()//Convierte el string  a número real 
  @Min(0.01)//Evita que el precio sea cero o negativo
  @Type(() => Number)
  price: number;
// ID numérico de la categoría a la que pertenece 
  @IsNumber()
  @Type(() => Number)
  categoryId: number;
//STOCK / INVENTARIO DISPONIBLE
  @IsNumber()
  @IsOptional()
  @Min(0)//No permite stock negativo
  @Type(() => Number)
  stock?: number;
// Valida que la URL del servidor de imágenes o Firebase sea válida para que Angular la renderice bien.
@IsOptional()
@IsString() 
@IsUrl({}, { message: 'La imagen debe ser una dirección URL válida o estar vacía' })
imageUrl?: string;
}
