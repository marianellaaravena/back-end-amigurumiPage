import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
/**
 * Molde de validación para modificar Categorías existentes.
 * Se utiliza en los endpoints de tipo PATCH.
 */
export class UpdateCategoryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}