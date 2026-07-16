import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
/**
 * Molde de validación para la creación de Categorías.
 * Protege al backend asegurando que los datos que entran por HTTP sean correctos.
 */
export class CreateCategoryDto {
  // El nombre es obligatorio, debe ser texto y tener entre 3 y 100 caracteres
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;
// La descripción es opcional. Si viene en el JSON, se valida que sea texto
  @IsOptional()
  @IsString()
  description?: string;
}