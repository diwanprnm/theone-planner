import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuthGuard } from './auth.guard';

function makeGuard() {
  const supabase = { getUserFromToken: jest.fn() };
  const prisma = { user: { upsert: jest.fn() } };

  const guard = new AuthGuard(
    supabase as unknown as SupabaseService,
    prisma as unknown as PrismaService,
  );

  return { guard, supabase, prisma };
}

function context(authorization?: string) {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: authorization ? { authorization } : {},
  };
  const execution = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { execution, request };
}

describe('AuthGuard', () => {
  it('menolak permintaan tanpa header Authorization', async () => {
    const { guard } = makeGuard();
    const { execution } = context();

    await expect(guard.canActivate(execution)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('menolak skema selain Bearer', async () => {
    const { guard } = makeGuard();
    const { execution } = context('Basic abc');

    await expect(guard.canActivate(execution)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('memverifikasi token lalu menempelkan pengguna ke request', async () => {
    const { guard, supabase, prisma } = makeGuard();
    supabase.getUserFromToken.mockResolvedValue({
      id: 'u1',
      email: 'budi@example.com',
      user_metadata: { full_name: 'Budi' },
    });
    prisma.user.upsert.mockResolvedValue({ id: 'u1', email: 'budi@example.com', name: 'Budi' });
    const { execution, request } = context('Bearer token-abc');

    const allowed = await guard.canActivate(execution);

    expect(allowed).toBe(true);
    expect(supabase.getUserFromToken).toHaveBeenCalledWith('token-abc');
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' }, update: {} }),
    );
    expect(request.user).toEqual({ id: 'u1', email: 'budi@example.com', name: 'Budi' });
  });

  it('memakai email pengganti bila email Supabase kosong', async () => {
    const { guard, supabase, prisma } = makeGuard();
    supabase.getUserFromToken.mockResolvedValue({ id: 'u1', email: null, user_metadata: {} });
    prisma.user.upsert.mockResolvedValue({ id: 'u1', email: 'x', name: null });
    const { execution } = context('Bearer token-abc');

    await guard.canActivate(execution);

    expect(prisma.user.upsert.mock.calls[0][0].create.email).toBe('u1@tanpa-email.local');
  });
});
