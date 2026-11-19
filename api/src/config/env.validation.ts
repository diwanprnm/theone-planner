/**
 * Validasi variabel lingkungan saat boot. Aplikasi sengaja gagal cepat
 * (fail-fast) di sini ketimbang meledak saat request pertama masuk.
 */
export function validateEnv(raw: Record<string, unknown>): Record<string, unknown> {
  const required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const missing = required.filter((key) => {
    const value = raw[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Variabel lingkungan wajib belum diisi: ${missing.join(', ')}. ` +
        'Salin .env.example menjadi .env lalu lengkapi nilainya.',
    );
  }

  return raw;
}
