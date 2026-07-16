import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}
// CREAR UN NUEVO AMIGURUMI
  @Post()
  create(@Body(ValidationPipe) createProductDto: CreateProductDto) {
    return this.productService.create(
      createProductDto.name,
      createProductDto.price,
      createProductDto.categoryId,
      createProductDto.description,
      createProductDto.stock,
      createProductDto.imageUrl,
    );
  }
// LISTAR PRODUCTOS CON FILTROS DINÁMICOS
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isAvailable') isAvailable?: string,
  ) {
    return this.productService.findAll(
      search,
      categoryId ? parseInt(categoryId) : undefined,
      isAvailable ? isAvailable === 'true' : undefined,
    );
  }
// LISTAR SOLO LOS DISPONIBLES 
  @Get('available')
  findAvailable() {
    return this.productService.findAvailable();
  }
// FILTRAR AMIGURUMIS POR UNA CATEGORÍA ESPECÍFICA
  @Get('category/:categoryId')
  findByCategory(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.productService.findByCategory(categoryId);
  }
// FILTRAR AMIGURUMIS POR UNA CATEGORÍA ESPECÍFICA
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }
// EDITAR UN AMIGURUMI
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(
      id,
      updateProductDto.name,
      updateProductDto.price,
      updateProductDto.categoryId,
      updateProductDto.description,
      updateProductDto.stock,
    );
  }
// REABASTECER / ACTUALIZAR STOCK DIRECTAMENTE
  @Patch(':id/stock')
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.productService.updateStock(id, quantity);
  }
// ALTERNAR DISPONIBILIDAD
  @Patch(':id/toggle-availability')
  toggleAvailability(@Param('id', ParseIntPipe) id: number) {
    return this.productService.toggleAvailability(id);
  }
// ELIMINAR  UN AMIGURUMI
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.delete(id);
  }
  // SUBIR IMÁGENES FÍSICAS DE LOS AMIGURUMIS
  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const pathInDb = `/uploads/${file.filename}`;
    return this.productService.updateImage(id, pathInDb);
  }
}
