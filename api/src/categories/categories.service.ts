import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Kategori bawaan (milik aplikasi) + Kategori milik Pengguna ini. */
  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, isDefault: true, userId: true },
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: { userId, name: dto.name, isDefault: false },
        select: { id: true, name: true, isDefault: true, userId: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Kategori itu sudah ada');
      }
      throw error;
    }
  }

  /** Kategori bawaan tidak boleh dihapus. */
  async remove(userId: string, id: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    await this.prisma.category.delete({ where: { id } });
  }
}
