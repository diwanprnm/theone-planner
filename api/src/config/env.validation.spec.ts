import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const lengkap = {
    DATABASE_URL: 'postgres://x',
    SUPABASE_URL: 'https://x.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'rahasia',
  };

  it('menerima lingkungan yang lengkap', () => {
    expect(validateEnv({ ...lengkap })).toEqual(lengkap);
  });

  it('menyebut semua variabel yang hilang sekaligus', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('menolak nilai yang hanya berisi spasi', () => {
    expect(() => validateEnv({ ...lengkap, SUPABASE_URL: '   ' })).toThrow(/SUPABASE_URL/);
  });
});
