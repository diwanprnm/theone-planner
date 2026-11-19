import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@ApiTags('Kategori')
@Authenticated()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar kategori bawaan dan kategori milik pengguna' })
  findAll(@CurrentUser('id') userId: string) {
    return this.categories.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Tambah kategori sendiri' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateCategoryDto) {
    return this.categories.create(userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Hapus kategori milik sendiri (kategori bawaan tidak bisa dihapus)' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.categories.remove(userId, id);
  }
}
