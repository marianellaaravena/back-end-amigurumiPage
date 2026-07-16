import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from '../categories/category.entity';
// Refleja la tabla 'products' en la base de datos.
@Entity('products')
export class Product {
  // Clave primaria única y autoincremental de cada amigurumi
  @PrimaryGeneratedColumn()
  id: number;
// Nombre comercial del tejido (Máximo 200 caracteres)
  @Column({ length: 200 })
  name: string;
// Detalle de materiales, medidas, etc. (Permite nulos en la BD)  
  @Column({ type: 'text', nullable: true })
  description: string | null;
// Precio del producto con formato decimal 
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;
// Ruta local de la imagen subida por Multer 
  @Column({ nullable: true })
  imageUrl: string;
// Interruptor de visibilidad para pausar o activar la publicación en el catálogo
  @Column({ default: true })
  isAvailable: boolean;
// Cantidad de unidades físicas tejidas en stock. Por defecto inicia en 0
  @Column({ default: 0 })
  stock: number;
// RELACIÓN RELACIONAL: Muchos productos pertenecen a una única Categoría.
  @ManyToOne(() => Category, (category) => category.products, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
// Campo numérico que almacena el ID de la clave foránea relacional
  @Column()
  categoryId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

// REGLA DE NEGOCIO: Valida y actualiza los datos principales del amigurumi. 
 update(
    name: string,
    price: number,
    description?: string,
    stock?: number,
  ): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Product name is required');
    }
    if (name.length < 3) {
      throw new Error('Product name must have at least 3 characters');
    }
    if (price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    if (stock !== undefined && stock < 0) {
      throw new Error('Stock cannot be negative');
    }

    this.name = name.trim();
    this.price = price;
    this.description = description?.trim() || null as string | null;
    if (stock !== undefined) {
      this.stock = stock;
    }
  }
//Vincula una nueva ruta de imagen al producto
  updateImage(imageUrl: string): void {
    this.imageUrl = imageUrl;
  }
// Suma o resta unidades del inventario de forma segura.
  updateStock(quantity: number): void {
    const newStock = this.stock + quantity;
    if (newStock < 0) {
      throw new Error(`Insufficient stock. Available: ${this.stock}`);
    }
    this.stock = newStock;
  }
// Alterna dinámicamente el estado de publicación (Disponible <-> Pausado).
  toggleAvailability(): void {
    this.isAvailable = !this.isAvailable;
  }

  makeAvailable(): void {
    this.isAvailable = true;
  }

  makeUnavailable(): void {
    this.isAvailable = false;
  }

  static create(
    name: string,
    price: number,
    categoryId: number,
    description?: string,
    stock: number = 0,
    imageUrl?: string,
  ): Product {
    const product = new Product();
    product.update(name, price, description, stock);
    product.categoryId = categoryId;
    if (imageUrl) {
      product.imageUrl = imageUrl;
    }
    return product;
  }
}