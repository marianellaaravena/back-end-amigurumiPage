import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from '../products/product.entity';
// Le dice a TypeORM que cree una tabla llamada 'categories' en la base de datos
@Entity('categories')
export class Category {
  // Clave primaria autoincremental 
  @PrimaryGeneratedColumn()
  id: number;
// Columna de texto obligatoria, única (no puede haber dos categorías "Hogar") y de máximo 100 caracteres
  @Column({ unique: true, length: 100 })
  name: string;
// Columna de texto largo. 'nullable: true' permite que quede vacía (null) en la BD si no se envía
  @Column({ type: 'text', nullable: true })
  description: string | null;
// Control para la baja lógica. Por defecto, toda categoría nueva nace activa (true)
  @Column({ default: true })
  isActive: boolean;
// Registra la fecha exacta en la que se creó la categoría
  @CreateDateColumn()
  createdAt: Date;
// Se actualiza sola cada vez que modificamos algún campo de la categoría
  @UpdateDateColumn()
  updatedAt: Date;
// DEFINE UNA RELACIÓN RELACIONAL: Una Categoría puede tener muchos Productos
  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  // Lógica de negocio
  // Activa la categoría para que vuelva a figurar en el catálogo de Angular.
  activate(): void {
    this.isActive = true;
  }
  // Desactiva la categoría 
  deactivate(): void {
    this.isActive = false;
  }
  // Centraliza cómo se edita una categoría,
  update(name: string, description?: string): void {
    // Valida que el nombre no venga vacío ni con puros espacios en blanco
    if (!name || name.trim().length === 0) {
      throw new Error('Category name is required');
    }
    // Valida la longitud mínima permitida por el negocio
    if (name.length < 3) {
      throw new Error('Category name must have at least 3 characters');
    }
    // Si pasó las pruebas guarda el nombre
    this.name = name.trim();
    // Control de descripción: Si es undefined no la toca, si viene vacía la convierte en un null 
    if (description !== undefined) {
      this.description = description.trim() || (null as string | null);
    }
  }
//este método asegura que la categoría pase obligatoriamente por las validaciones de 'update()' antes de existir.
  static create(name: string, description?: string): Category {
    const category = new Category();
    category.update(name, description);
    return category;
  }
}
