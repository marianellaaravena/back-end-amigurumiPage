import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Product } from './product.entity';
import { CategoryService } from '../categories/category.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private categoryService: CategoryService,
  ) { }
// CREAR UN NUEVO AMIGURUMI
  async create(
    name: string,
    price: number,
    categoryId: number,
    description?: string,
    stock: number = 0,
    imageUrl?: string,
  ): Promise<Product> {
    await this.categoryService.findOne(categoryId);

    const product = Product.create(
      name,
      price,
      categoryId,
      description,
      stock,
      imageUrl,
    );
    return await this.productRepository.save(product);
  }
// BUSCADOR COMPLETO CON FILTROS DINÁMICOS
  async findAll(
    search?: string,
    categoryId?: number,
    isAvailable?: boolean,
  ): Promise<Product[]> {
    const where: FindOptionsWhere<Product> = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }

    return await this.productRepository.find({
      where,
      relations: { category: true },
      order: { name: 'ASC' },
    });
  }
// TRAER PRODUCTOS DISPONIBLES PARA EL CATÁLOGO PÚBLICO
  async findAvailable(): Promise<Product[]> {
    return await this.productRepository.find({
      where: { isAvailable: true },
      relations: { category: true },
      order: { category: { name: 'ASC' }, name: 'ASC' },
    });
  }

// TRAER AMIGURUMIS DE UNA CATEGORÍA ESPECÍFICA
  async findByCategory(categoryId: number): Promise<Product[]> {
    await this.categoryService.findOne(categoryId);

    return await this.productRepository.find({
      where: { categoryId },
      relations: { category: true },
      order: { name: 'ASC' },
    });
  }
// VER DETALLE DE UN AMIGURUMI POR ID
  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { category: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }
// ACTUALIZACIÓN CONTROLADA DE PRODUCTOS
async update(
    id: number,
    name?: string,
    price?: number,
    categoryId?: number,
    description?: string,
    stock?: number,
  ): Promise<Product> {
    const product = await this.findOne(id);

    if (categoryId && categoryId !== product.categoryId) {
      await this.categoryService.findOne(categoryId);
      product.categoryId = categoryId;
    }

    // CLAVE PARA TYPE_SCRIPT: Si es null, lo transformamos a undefined usando '|| undefined'
    const finalDescription = description !== undefined ? description : (product.description || undefined);
    const finalStock = stock !== undefined ? stock : product.stock;

    // Evaluamos los cambios en base a lo que envió Postman sin perder datos viejos
    if (name !== undefined && price !== undefined) {
      product.update(name, price, finalDescription, finalStock);
    } else if (name !== undefined) {
      product.update(name, product.price, finalDescription, finalStock);
    } else if (price !== undefined) {
      product.update(product.name, price, finalDescription, finalStock);
    } else {
      // Si solo se modificó el stock o la descripción desde Postman
      product.update(product.name, product.price, finalDescription, finalStock);
    }

    return await this.productRepository.save(product);
  }
// ACTUALIZAR STOCK DIRECTAMENTE
  async updateStock(id: number, quantity: number): Promise<Product> {
    const product = await this.findOne(id);
    product.updateStock(quantity);
    return await this.productRepository.save(product);
  }
//VINCULAR NUEVA IMAGEN
  async updateImage(id: number, imageUrl: string): Promise<Product> {
    const product = await this.findOne(id);
    product.updateImage(imageUrl);
    return await this.productRepository.save(product);
  }
// ALTERNAR VISIBILIDAD
  async toggleAvailability(id: number): Promise<Product> {
    const product = await this.findOne(id);
    product.toggleAvailability();
    return await this.productRepository.save(product);
  }
// ELIMINAR FISICAMENTE UN AMIGURUMI
  async delete(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }
}
