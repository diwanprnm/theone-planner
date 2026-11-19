import { NotFoundException } from '@nestjs/common';
import { ExpensesService } from '../expenses/expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptsService, type UploadedReceiptFile } from './receipts.service';
import { SupabaseService } from '../supabase/supabase.service';

function makeService() {
  const prisma = { expense: { update: jest.fn().mockResolvedValue({}) } };
  const expenses = { assertOwned: jest.fn() };
  const supabase = {
    uploadReceipt: jest.fn().mockResolvedValue('path'),
    removeReceipt: jest.fn().mockResolvedValue(undefined),
    createReceiptSignedUrl: jest.fn().mockResolvedValue('https://signed'),
  };

  const service = new ReceiptsService(
    prisma as unknown as PrismaService,
    expenses as unknown as ExpensesService,
    supabase as unknown as SupabaseService,
  );

  return { service, prisma, expenses, supabase };
}

const file = (overrides: Partial<UploadedReceiptFile> = {}): UploadedReceiptFile => ({
  originalname: 'foto.jpg',
  mimetype: 'image/jpeg',
  size: 1024,
  buffer: Buffer.from('x'),
  ...overrides,
});

describe('ReceiptsService.upload', () => {
  it('menyimpan struk dengan nama berkas dari id, bukan nama asli', async () => {
    const { service, prisma, expenses, supabase } = makeService();
    expenses.assertOwned.mockResolvedValue({ id: 'x1', receiptPath: null });

    const result = await service.upload('u1', 'x1', file());

    const path = supabase.uploadReceipt.mock.calls[0][0] as string;
    expect(path.startsWith('u1/x1/')).toBe(true);
    expect(path.endsWith('.jpg')).toBe(true);
    expect(path).not.toContain('foto.jpg');
    expect(prisma.expense.update).toHaveBeenCalledWith({
      where: { id: 'x1' },
      data: { receiptPath: path },
    });
    expect(result.signedUrl).toBe('https://signed');
  });

  it('menghapus foto lama saat menggantinya', async () => {
    const { service, expenses, supabase } = makeService();
    expenses.assertOwned.mockResolvedValue({ id: 'x1', receiptPath: 'u1/x1/lama.jpg' });

    await service.upload('u1', 'x1', file());

    expect(supabase.removeReceipt).toHaveBeenCalledWith('u1/x1/lama.jpg');
  });

  it('memakai ekstensi .bin untuk MIME yang tidak dikenal', async () => {
    const { service, expenses, supabase } = makeService();
    expenses.assertOwned.mockResolvedValue({ id: 'x1', receiptPath: null });

    await service.upload('u1', 'x1', file({ mimetype: 'application/octet-stream' }));

    expect(supabase.uploadReceipt.mock.calls[0][0]).toMatch(/\.bin$/);
  });
});

describe('ReceiptsService.signedUrl', () => {
  it('melempar NotFound bila pengeluaran belum punya struk', async () => {
    const { service, expenses } = makeService();
    expenses.assertOwned.mockResolvedValue({ id: 'x1', receiptPath: null });

    await expect(service.signedUrl('u1', 'x1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mengembalikan URL bertanda tangan bila struk ada', async () => {
    const { service, expenses, supabase } = makeService();
    expenses.assertOwned.mockResolvedValue({ id: 'x1', receiptPath: 'u1/x1/a.jpg' });

    const result = await service.signedUrl('u1', 'x1');

    expect(supabase.createReceiptSignedUrl).toHaveBeenCalledWith('u1/x1/a.jpg');
    expect(result).toEqual({ receiptPath: 'u1/x1/a.jpg', signedUrl: 'https://signed' });
  });
});

describe('ReceiptsService.remove', () => {
  it('tidak melakukan apa-apa bila tidak ada struk', async () => {
    const { service, prisma, expenses, supabase } = makeService();
    expenses.assertOwned.mockResolvedValue({ id: 'x1', receiptPath: null });

    await service.remove('u1', 'x1');

    expect(supabase.removeReceipt).not.toHaveBeenCalled();
    expect(prisma.expense.update).not.toHaveBeenCalled();
  });

  it('menghapus objek lalu mengosongkan path', async () => {
    const { service, prisma, expenses, supabase } = makeService();
    expenses.assertOwned.mockResolvedValue({ id: 'x1', receiptPath: 'u1/x1/a.jpg' });

    await service.remove('u1', 'x1');

    expect(supabase.removeReceipt).toHaveBeenCalledWith('u1/x1/a.jpg');
    expect(prisma.expense.update).toHaveBeenCalledWith({
      where: { id: 'x1' },
      data: { receiptPath: null },
    });
  });
});
