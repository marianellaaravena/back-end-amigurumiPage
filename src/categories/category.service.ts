import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoryService {
  constructor(
    // Inyectamos el repositorio de TypeORM para poder hacer consultas SQL de forma orientada a objeto
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}
// CREAR NUEVA CATEGORÍA
  async create(name: string, description?: string): Promise<Category> {
    const existingCategory = await this.categoryRepository.findOne({
      where: { name: name.trim() }, //Valida que no exista otra categoría con el mismo nombre
    });
  // Si ya existe, frena todo enviando un error 409 
    if (existingCategory) {
      throw new ConflictException(
        `Category with name "${name}" already exists`,
      );
    }

    const category = Category.create(name, description);
    return await this.categoryRepository.save(category);
  }
// LISTAR TODAS LAS CATEGORÍAS
  //trae  todo el listado ordenado alfabéticamente
  async findAll(): Promise<Category[]> {
    return await this.categoryRepository.find({
      order: { name: 'ASC' },
    });
  }
// LISTAR SOLO LAS CATEGORÍAS ACTIVAS
  async findActive(): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }
//BUSCAR UNA CATEGORÍA POR ID
  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: { products: true },
    });
  // Si el ID no existe en la BD, corta la ejecución lanzando un error 404 Not Found
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }
//ACTUALIZAR CATEGORÍA
  async update(
    id: number,
    name: string,
    description?: string,
  ): Promise<Category> {
    const category = await this.findOne(id);// Si no existe salta el 404 
  // Control de nombres duplicados en la edición
    if (name && name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: name.trim() },
      });
  // Si encuentra el nombre en la BD, pero pertenece a OTRA categoría lanza conflicto
      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException(
          `Category with name "${name}" already exists`,
        );
      }
    }

    category.update(name, description);
    return await this.categoryRepository.save(category);
  }
//DESACTIVAR CATEGORIA
  async deactivate(id: number): Promise<void> {
    const category = await this.findOne(id);
    category.deactivate();
    await this.categoryRepository.save(category);
  }
//ACTUALIZAR CATEGORIA
  async activate(id: number): Promise<void> {
    const category = await this.findOne(id);
    category.activate();
    await this.categoryRepository.save(category);
  }
//ELIMINAR CATEGORIA
  async delete(id: number): Promise<void> {
    const category = await this.findOne(id);

    if (category.products && category.products.length > 0) {
      throw new ConflictException(
        `Cannot delete category "${category.name}" because it has ${category.products.length} associated products`,
      );
    }

    await this.categoryRepository.remove(category);
  }
}
