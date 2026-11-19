import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateExpenseDto } from './create-expense.dto';

const UUID = '11111111-1111-4111-8111-111111111111';

async function errorsOf(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateExpenseDto, payload);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

const valid = {
  amount: 100,
  description: 'Sewa bus',
  date: '2026-10-12',
  paymentMethod: 'TUNAI',
};

describe('CreateExpenseDto', () => {
  it('menerima muatan yang sah', async () => {
    expect(await errorsOf(valid)).toHaveLength(0);
  });

  it('menolak nominal nol atau negatif', async () => {
    expect(await errorsOf({ ...valid, amount: 0 })).not.toHaveLength(0);
    expect(await errorsOf({ ...valid, amount: -5 })).not.toHaveLength(0);
  });

  it('menolak nominal dengan lebih dari dua angka desimal', async () => {
    expect(await errorsOf({ ...valid, amount: 10.123 })).not.toHaveLength(0);
  });

  it('menolak keterangan kosong', async () => {
    expect(await errorsOf({ ...valid, description: '' })).not.toHaveLength(0);
  });

  it('menolak tanggal yang tidak valid', async () => {
    expect(await errorsOf({ ...valid, date: '12 Oktober' })).not.toHaveLength(0);
  });

  it('menolak metode pembayaran yang tidak dikenal', async () => {
    expect(await errorsOf({ ...valid, paymentMethod: 'BITCOIN' })).not.toHaveLength(0);
  });

  it('menerima bagian yang sah', async () => {
    const errors = await errorsOf({
      ...valid,
      shares: [{ participantId: UUID, amount: 100 }],
    });
    expect(errors).toHaveLength(0);
  });

  it('menolak bagian dengan participantId bukan UUID', async () => {
    const errors = await errorsOf({
      ...valid,
      shares: [{ participantId: 'bukan-uuid', amount: 100 }],
    });
    expect(errors).not.toHaveLength(0);
  });

  it('menolak kolom asing (whitelist)', async () => {
    expect(await errorsOf({ ...valid, isAdmin: true })).not.toHaveLength(0);
  });
});
