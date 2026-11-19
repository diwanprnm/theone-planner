import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { ParticipantsService } from './participants.service';

function makeService() {
  const tx = {
    participant: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    participant: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (client: unknown) => unknown) => callback(tx)),
  };
  const events = { assertOwned: jest.fn().mockResolvedValue(undefined) };

  const service = new ParticipantsService(
    prisma as unknown as PrismaService,
    events as unknown as EventsService,
  );

  return { service, prisma, tx };
}

const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';
const P3 = '33333333-3333-4333-8333-333333333333';

describe('ParticipantsService.create', () => {
  it('menolak nama yang sama tanpa memandang besar-kecil huruf', async () => {
    const { service, prisma } = makeService();
    prisma.participant.count.mockResolvedValue(1);

    await expect(service.create('u1', 'e1', { name: 'budi' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.participant.create).not.toHaveBeenCalled();
  });

  it('menyimpan peserta baru bila namanya unik', async () => {
    const { service, prisma } = makeService();
    prisma.participant.count.mockResolvedValue(0);
    prisma.participant.create.mockResolvedValue({ id: P1, eventId: 'e1', name: 'Budi' });

    const result = await service.create('u1', 'e1', { name: 'Budi' });

    expect(result).toEqual({ id: P1, eventId: 'e1', name: 'Budi' });
  });

  it('menerjemahkan galat unik database menjadi Conflict', async () => {
    const { service, prisma } = makeService();
    prisma.participant.count.mockResolvedValue(0);
    prisma.participant.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplikat', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.create('u1', 'e1', { name: 'Budi' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('ParticipantsService.replaceAll', () => {
  it('menolak daftar yang memuat nama kembar (beda besar-kecil huruf)', async () => {
    const { service } = makeService();

    await expect(
      service.replaceAll('u1', 'e1', {
        participants: [
          { id: P1, name: 'Budi' },
          { id: P2, name: 'budi' },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('menolak id milik acara lain (tidak bisa dicuri lewat upsert)', async () => {
    const { service, prisma } = makeService();
    prisma.participant.findMany.mockResolvedValue([{ id: P1, eventId: 'acara-lain' }]);

    await expect(
      service.replaceAll('u1', 'e1', { participants: [{ id: P1, name: 'Budi' }] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('memperbarui baris milik acara ini dan membuat baris baru', async () => {
    const { service, prisma, tx } = makeService();
    prisma.participant.findMany.mockResolvedValue([{ id: P1, eventId: 'e1' }]);
    prisma.participant.findMany
      .mockResolvedValueOnce([{ id: P1, eventId: 'e1' }]) // pemeriksaan kepemilikan id
      .mockResolvedValueOnce([]); // findAll di akhir

    await service.replaceAll('u1', 'e1', {
      participants: [
        { id: P1, name: 'Budi Santoso' },
        { id: P3, name: 'Citra' },
      ],
    });

    expect(tx.participant.deleteMany).toHaveBeenCalledWith({
      where: { eventId: 'e1', id: { notIn: [P1, P3] } },
    });
    // Baris lama: dua kali update (nama sementara lalu nama final).
    expect(tx.participant.update).toHaveBeenCalledTimes(2);
    // Baris baru dibuat tanpa memakai id dari klien.
    expect(tx.participant.create).toHaveBeenCalledWith({
      data: { eventId: 'e1', name: 'Citra' },
    });
  });

  it('menerjemahkan galat unik database menjadi Conflict', async () => {
    const { service, prisma } = makeService();
    prisma.participant.findMany.mockResolvedValue([]);
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplikat', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.replaceAll('u1', 'e1', { participants: [{ id: P1, name: 'Budi' }] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ParticipantsService.remove', () => {
  it('melempar NotFound bila peserta bukan milik pengguna', async () => {
    const { service, prisma } = makeService();
    prisma.participant.count.mockResolvedValue(0);

    await expect(service.remove('u1', P1)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.participant.delete).not.toHaveBeenCalled();
  });

  it('menghapus peserta milik pengguna', async () => {
    const { service, prisma } = makeService();
    prisma.participant.count.mockResolvedValue(1);
    prisma.participant.delete.mockResolvedValue({});

    await service.remove('u1', P1);

    expect(prisma.participant.delete).toHaveBeenCalledWith({ where: { id: P1 } });
  });
});
