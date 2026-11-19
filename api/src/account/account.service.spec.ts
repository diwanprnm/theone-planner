import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AccountService } from './account.service';

function makeService() {
  const prisma = {
    expense: { findMany: jest.fn() },
    user: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const supabase = {
    deleteAuthUser: jest.fn().mockResolvedValue(undefined),
    removeReceipt: jest.fn().mockResolvedValue(undefined),
  };

  const service = new AccountService(
    prisma as unknown as PrismaService,
    supabase as unknown as SupabaseService,
  );

  return { service, prisma, supabase };
}

describe('AccountService.deleteAccount', () => {
  it('mengumpulkan struk, menghapus akun Auth, lalu menghapus baris lokal', async () => {
    const { service, prisma, supabase } = makeService();
    prisma.expense.findMany.mockResolvedValue([
      { receiptPath: 'u1/x1/a.jpg' },
      { receiptPath: null },
      { receiptPath: 'u1/x2/b.jpg' },
    ]);

    await service.deleteAccount('u1');

    // Struk dibaca SEBELUM barisnya dihapus.
    expect(prisma.expense.findMany.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.user.deleteMany.mock.invocationCallOrder[0],
    );
    // Akun Auth dihapus lebih dulu daripada baris lokal.
    expect(supabase.deleteAuthUser.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.user.deleteMany.mock.invocationCallOrder[0],
    );
    expect(supabase.removeReceipt).toHaveBeenCalledTimes(2);
    expect(supabase.removeReceipt).toHaveBeenCalledWith('u1/x1/a.jpg');
    expect(supabase.removeReceipt).toHaveBeenCalledWith('u1/x2/b.jpg');
  });

  it('tidak memanggil Storage bila tidak ada struk', async () => {
    const { service, prisma, supabase } = makeService();
    prisma.expense.findMany.mockResolvedValue([]);

    await service.deleteAccount('u1');

    expect(supabase.removeReceipt).not.toHaveBeenCalled();
    expect(prisma.user.deleteMany).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });
});
