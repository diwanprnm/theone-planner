import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

function makeService() {
  const prisma = {
    category: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
  };
  const service = new CategoriesService(prisma as unknown as PrismaService);
  return { service, prisma };
}

describe('CategoriesService', () => {
  it('menggabungkan kategori bawaan dan milik pengguna', async () => {
    const { service, prisma } = makeService();
    prisma.category.findMany.mockResolvedValue([]);

    await service.findAll('u1');

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ userId: 'u1' }, { userId: null }] } }),
    );
  });

  it('menerjemahkan galat unik menjadi Conflict', async () => {
    const { service, prisma } = makeService();
    prisma.category.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplikat', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.create('u1', { name: 'Transport' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('menolak menghapus kategori bawaan (bukan milik pengguna)', async () => {
    const { service, prisma } = makeService();
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(service.remove('u1', 'bawaan')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('menghapus kategori milik pengguna', async () => {
    const { service, prisma } = makeService();
    prisma.category.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.category.delete.mockResolvedValue({});

    await service.remove('u1', 'c1');

    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});
